import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Lock, Upload, AlertTriangle } from "lucide-react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { bankStatementApi } from "../api/bankLedgerApi";
import { HistoricalUiStyles } from "../styles/powerUi";
import {
  Card,
  PAGE_PAD_SX,
  PAGE_SX,
  PageBar,
  SimpleLineChart,
  ZohoStat,
  dateText,
  money,
  pickData,
  safeArray,
} from "./businessUtils.jsx";

const normalizeAccount = (v) => String(v || "").trim().replace(/\s+/g, "");

function buildBankAccounts(statements = []) {
  const apiGrouped = safeArray(statements?.bankAccounts || []);

  if (apiGrouped.length) return apiGrouped;

  const map = new Map();

  safeArray(statements).forEach((s) => {
    const acc = normalizeAccount(s.accountNumberMasked || s.accountNumber || s.accountNo);
    if (!acc) return;

    const existing = map.get(acc) || {
      id: acc,
      accountNumberMasked: acc,
      bankName: s.bankName || "Bank Account",
      accountHolderName: s.accountHolderName || "",
      statementCount: 0,
      totalRows: 0,
      firstFromDate: null,
      latestToDate: null,
    };

    existing.statementCount += 1;
    existing.totalRows += Number(s.transactionCount || s?.validation?.totalRows || 0);

    if (
      s.statementFromDate &&
      (!existing.firstFromDate || new Date(s.statementFromDate) < new Date(existing.firstFromDate))
    ) {
      existing.firstFromDate = s.statementFromDate;
    }

    if (
      s.statementToDate &&
      (!existing.latestToDate || new Date(s.statementToDate) > new Date(existing.latestToDate))
    ) {
      existing.latestToDate = s.statementToDate;
    }

    map.set(acc, existing);
  });

  return Array.from(map.values());
}

function InfoItem({ label, value }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 650,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 0.25,
          color: "text.primary",
          fontWeight: 550,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
}

export default function BanksPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [statementsPayload, setStatementsPayload] = useState({});
  const [transactionsByAcc, setTransactionsByAcc] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [statementPdf, setStatementPdf] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [preview, setPreview] = useState(null);
  const [verified, setVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountFilter, setAccountFilter] = useState("ALL");

  const bankAccounts = useMemo(
    () => buildBankAccounts(statementsPayload?.items ? statementsPayload : pickData(statementsPayload)),
    [statementsPayload],
  );

  const allTransactions = useMemo(() => Object.values(transactionsByAcc).flat(), [transactionsByAcc]);

  const filteredTxns = useMemo(
    () => (accountFilter === "ALL" ? allTransactions : safeArray(transactionsByAcc[accountFilter])),
    [accountFilter, allTransactions, transactionsByAcc],
  );

  const chartData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        income: 0,
        balance: 0,
      };
    });

    const map = new Map(days.map((d) => [d.key, d]));

    filteredTxns.forEach((t) => {
      const d = new Date(t.transactionDate || t.date);
      if (Number.isNaN(d.getTime())) return;

      const key = d.toISOString().slice(0, 10);
      const b = map.get(key);
      if (!b) return;

      b.income += Number(t.deposit || t.credit || 0) - Number(t.withdrawal || t.debit || 0);
      b.balance = Number(t.balance || b.balance || 0);
    });

    let running = days[0]?.balance || 0;

    return days.map((d) => {
      running += d.income;
      return { ...d, income: running, balance: d.balance || running };
    });
  }, [filteredTxns]);

  const totals = useMemo(() => {
    const latestBalanceByAccount = {};

    allTransactions.forEach((t) => {
      const acc = normalizeAccount(t.accountNumberMasked || t.statementAccountNumber || t.accountNo || t.bankAccount || "");
      const key = acc || "ALL";
      if (!latestBalanceByAccount[key]) latestBalanceByAccount[key] = Number(t.balance || 0);
    });

    const bankBalance = Object.values(latestBalanceByAccount).reduce((a, b) => a + Number(b || 0), 0);
    const uncategorized = allTransactions.filter(
      (t) => !t.headType && !t.subHeadName && !t.partyName && !t.linkedPartyName,
    ).length;

    return { bankBalance, cash: 0, uncategorized };
  }, [allTransactions]);

  const loadBanks = useCallback(async () => {
    setLoading(true);

    try {
      const res = await bankStatementApi.listStatements({ limit: 500 });
      const data = pickData(res);

      setStatementsPayload(data);

      const accounts = buildBankAccounts(data);
      const entries = await Promise.allSettled(
        accounts.slice(0, 8).map((a) =>
          bankStatementApi
            .getAccountTransactions(a.accountNumberMasked, {
              page: 1,
              limit: 500,
              sort: "transactionDate:desc",
            })
            .then((r) => [
              a.accountNumberMasked,
              safeArray(pickData(r).items || pickData(r).transactions || pickData(r)),
            ]),
        ),
      );

      const next = {};
      entries.forEach((r) => {
        if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
      });
      setTransactionsByAcc(next);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load banking overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  const resetUploadModal = () => {
    setStatementPdf(null);
    setPassword("");
    setPasswordRequired(false);
    setPreview(null);
    setVerified(false);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetUploadModal();
  };

  const extractPreview = async () => {
    if (!statementPdf) {
      toast.error("Select statement PDF");
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("statementPdf", statementPdf);

      if (password) {
        fd.append("password", password);
        fd.append("pdfPassword", password);
      }

      const res = await bankStatementApi.uploadAndExtractPreview(fd);
      setPreview(pickData(res));
      setPasswordRequired(false);
      setVerified(false);
      toast.success("Statement extracted. Please verify before saving.");
    } catch (e) {
      const code = e?.response?.data?.code;

      if (code === "PDF_PASSWORD_REQUIRED") {
        setPasswordRequired(true);
        toast.error("This PDF is protected. Enter password and extract again.");
      } else {
        toast.error(e?.response?.data?.message || "Failed to extract statement");
      }
    } finally {
      setUploading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview?.previewToken) return;

    if (!verified) {
      toast.error("Verify extracted details first");
      return;
    }

    if (preview?.missingPeriod?.status || preview?.canImport === false) {
      toast.error(preview?.missingPeriod?.message || "Missing statement period detected");
      return;
    }

    setUploading(true);

    try {
      await bankStatementApi.confirmImport({
        previewToken: preview.previewToken,
        userVerifiedData: true,
        isUserVerified: true,
        verifiedByUser: true,
      });

      toast.success("Statement imported");
      setUploadOpen(false);
      resetUploadModal();
      await loadBanks();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to import statement");
    } finally {
      setUploading(false);
    }
  };

  const accountColumns = [
    {
      key: "bankName",
      header: "Account Details",
      render: (r) => (
        <Stack>
          <Typography sx={{ color: "#1f6ff2", fontSize: 13, cursor: "pointer" }}>
            {r.bankName || "Bank Account"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#667085" }}>{r.accountNumberMasked}</Typography>
        </Stack>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (r) => `${dateText(r.firstFromDate)} - ${dateText(r.latestToDate)}`,
    },
    {
      key: "amount",
      header: "Amount in Bank",
      align: "right",
      render: (r) => money(safeArray(transactionsByAcc[r.accountNumberMasked])[0]?.balance || 0),
    },
    {
      key: "rows",
      header: "Rows",
      align: "right",
      render: (r) => r.totalRows || safeArray(transactionsByAcc[r.accountNumberMasked]).length,
    },
  ];

  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={PAGE_SX}>
        <PageBar title="Banking Overview">
          <Button variant="outline" icon={Upload} onClick={() => setUploadOpen(true)}>
            Import Statement
          </Button>
        </PageBar>

        <Box sx={PAGE_PAD_SX}>
          <Card>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Select
                size="small"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="ALL">All Accounts</MenuItem>
                {bankAccounts.map((a) => (
                  <MenuItem key={a.accountNumberMasked} value={a.accountNumberMasked}>
                    {a.bankName} - {a.accountNumberMasked}
                  </MenuItem>
                ))}
              </Select>

              <Button variant="text">Last 30 days</Button>
            </Stack>

            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12} md={3}>
                <ZohoStat label="Cash In Hand" value={money(totals.cash)} accent="#9aa1b5" />
              </Grid>

              <Grid item xs={12} md={3}>
                <ZohoStat label="Bank Balance" value={money(totals.bankBalance)} accent="#18b779" />
              </Grid>
            </Grid>

            <SimpleLineChart data={chartData} greenKey="income" grayKey="balance" height={360} />
          </Card>

          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 500, mb: 1.4 }}>Active Accounts</Typography>
            <DataTable
              columns={accountColumns}
              rows={bankAccounts.map((r) => ({ ...r, __rowKey: r.accountNumberMasked }))}
              loading={loading}
              emptyText="No bank accounts found. Import a statement first."
              minWidth={1100}
              stickyHeader
              maxHeight="360px"
              onRowClick={(row) => navigate(`/banks/${encodeURIComponent(row.accountNumberMasked)}`)}
            />
          </Box>
        </Box>
      </Box>

      <Modal
        open={uploadOpen}
        onClose={closeUploadModal}
        title="Upload Bank Statement"
        size="lg"
        maxBodyHeight="78vh"
        footer={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
            sx={{ width: "100%" }}
          >
            <Button variant="outline" onClick={closeUploadModal} disabled={uploading}>
              Cancel
            </Button>

            {!preview ? (
              <Button variant="primary" onClick={extractPreview} disabled={uploading} icon={uploading ? undefined : Upload}>
                {uploading ? "Extracting..." : "Extract Preview"}
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={confirmImport}
                disabled={uploading || !verified || preview?.missingPeriod?.status || preview?.canImport === false}
              >
                {uploading ? "Saving..." : "Save / Merge Transactions"}
              </Button>
            )}
          </Stack>
        }
      >
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
            }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Upload PDF Statement
              </Typography>

              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select the PDF only. Bank details and transactions will be extracted automatically.
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                alignItems={{ sm: "center" }}
                sx={{ pt: 1 }}
              >
                <Button variant="outline" component="label" icon={Upload} disabled={uploading}>
                  {statementPdf ? statementPdf.name : "Select PDF Statement"}
                  <input
                    hidden
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      setStatementPdf(e.target.files?.[0] || null);
                      setPreview(null);
                      setPasswordRequired(false);
                      setVerified(false);
                    }}
                  />
                </Button>

                {passwordRequired ? (
                  <Chip
                    icon={<Lock size={14} />}
                    label="Password required"
                    color="warning"
                    variant="outlined"
                    sx={{ width: "fit-content" }}
                  />
                ) : null}
              </Stack>

              {passwordRequired || password ? (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 0.75 }}>
                    PDF Password
                  </Typography>
                  <Box
                    component="input"
                    type="password"
                    placeholder="Enter PDF password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: "100%",
                      height: 38,
                      border: "1px solid #d7dce8",
                      borderRadius: 8,
                      padding: "0 12px",
                      fontSize: 13,
                      outline: "none",
                      background: "transparent",
                    }}
                  />
                  <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.75 }}>
                    The password is sent only for extraction and is not stored in UI.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Paper>

          {preview ? (
            <Stack spacing={2.5}>
              {preview?.missingPeriod?.status ? (
                <Alert severity="error" icon={<AlertTriangle size={18} />} sx={{ borderRadius: 2 }}>
                  {preview.missingPeriod.message}
                </Alert>
              ) : null}

              {preview?.duplicateStatement?.status ? (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Same PDF file was uploaded before. Only new non-duplicate transactions can be imported.
                </Alert>
              ) : null}

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Extracted Bank Detail
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Bank" value={preview?.statement?.bankName} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Account Holder" value={preview?.statement?.accountHolderName} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Account Number" value={preview?.statement?.accountNumberMasked} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem
                      label="Period"
                      value={`${dateText(preview?.statement?.statementFromDate)} - ${dateText(
                        preview?.statement?.statementToDate,
                      )}`}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Opening Balance" value={money(preview?.statement?.openingBalance)} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Closing Balance" value={money(preview?.statement?.closingBalance)} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="Extracted Rows" value={preview?.summary?.extractedRows} />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <InfoItem label="New Rows" value={preview?.summary?.insertableRows} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
                  borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.28 : 0.22),
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={verified}
                      onChange={(e) => setVerified(e.target.checked)}
                    />
                  }
                  label="I have verified that the extracted bank details and transaction summary are correct."
                />

                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    pl: { xs: 0, sm: 4 },
                  }}
                >
                  Required before Save / Merge. After save/merge, backend uploads the PDF to media/S3.
                </Typography>
              </Paper>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Sample Extracted Transactions
                </Typography>

                <DataTable
                  columns={[
                    {
                      key: "transactionDate",
                      header: "Date",
                      render: (row) => dateText(row.transactionDate),
                    },
                    {
                      key: "description",
                      header: "Description",
                      maxWidth: 320,
                      render: (row) => row.description || "-",
                    },
                    {
                      key: "withdrawal",
                      header: "Withdrawal",
                      align: "right",
                      render: (row) => money(row.withdrawal),
                    },
                    {
                      key: "deposit",
                      header: "Deposit",
                      align: "right",
                      render: (row) => money(row.deposit),
                    },
                    {
                      key: "balance",
                      header: "Balance",
                      align: "right",
                      render: (row) => money(row.balance),
                    },
                    {
                      key: "duplicate",
                      header: "Status",
                      render: (row) =>
                        row.isDuplicateTransaction ? (
                          <Chip size="small" color="error" label="Duplicate" variant="outlined" />
                        ) : (
                          <Chip size="small" color="success" label="New" variant="outlined" />
                        ),
                    },
                  ]}
                  rows={(preview?.sampleTransactions || []).map((row, index) => ({
                    ...row,
                    __rowKey: `preview-${index}`,
                  }))}
                  minWidth={900}
                  stickyHeader
                  maxHeight="280px"
                  emptyText="No sample rows"
                />
              </Box>
            </Stack>
          ) : null}
        </Stack>
      </Modal>
    </AppShell>
  );
}
