import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { Lock, Upload, AlertTriangle, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { bankAccountApi, bankStatementApi, cashApi } from "../api/bankLedgerApi";
import { HistoricalUiStyles } from "../styles/powerUi";
import { money, dateText, pickData, safeArray } from "./businessUtils.jsx";
import IFSCField from "../components/IFSCField";

// ─── helpers ────────────────────────────────────────────────────────────────

const getId = (r) => String(r?._id || r?.id || "");

function FieldRow({ label, required, children }) {
  return (
    <Grid container spacing={1.5} alignItems="flex-start">
      <Grid item xs={12} md={3.5} sx={{ pt: "10px !important" }}>
        <Typography sx={{ fontSize: 13, color: required ? "#e11d48" : "#374151", fontWeight: 400 }}>
          {label}{required ? "*" : ""}
        </Typography>
      </Grid>
      <Grid item xs={12} md={8.5}>{children}</Grid>
    </Grid>
  );
}

function FInput({ value, onChange, placeholder, select, children, type = "text", multiline, rows = 3, endAdornment }) {
  return (
    <TextField
      fullWidth size="small" type={type} select={select}
      value={value ?? ""} placeholder={placeholder}
      multiline={multiline} minRows={multiline ? rows : undefined}
      onChange={(e) => onChange(e.target.value)}
      InputProps={endAdornment ? { endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment> } : undefined}
      sx={{
        "& .MuiOutlinedInput-root": { height: multiline ? "auto" : 34, borderRadius: "5px", fontSize: 13, bgcolor: "#fff" },
        "& .MuiInputBase-input": { fontSize: "13px !important", py: multiline ? "8px !important" : "7px !important" },
      }}
    >
      {children}
    </TextField>
  );
}

const EMPTY_ACCOUNT = { accountName: "", accountCode: "", currency: "INR", accountNumber: "", bankName: "", ifsc: "", description: "", isPrimary: false };

// ─── Add Bank Account modal ──────────────────────────────────────────────────

function AddBankAccountModal({ open, onClose, onSaved }) {
  const [form, setForm]             = useState(EMPTY_ACCOUNT);
  const [ifscVerified, setIfscVerified] = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (open) { setForm(EMPTY_ACCOUNT); setIfscVerified(false); }
  }, [open]);

  const p = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleIfscVerified = (data) => {
    setIfscVerified(Boolean(data));
    if (data?.BANK) p("bankName", data.BANK);
  };

  const ifscEntered = form.ifsc.length > 0;
  const ifscBlocked = ifscEntered && !ifscVerified;

  const handleSave = async () => {
    if (!form.accountName.trim()) return toast.error("Account Name is required");
    if (ifscBlocked) return toast.error("IFSC verification pending. Wait for it to verify or clear the IFSC.");
    setSaving(true);
    try {
      await bankAccountApi.create(form);
      toast.success("Bank account added");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to add bank account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Add Bank Account" size="md"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !form.accountName.trim() || ifscBlocked}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={1.6} sx={{ pt: 0.5 }}>
        <FieldRow label="Select Account Type" required>
          <RadioGroup row value="Bank" onChange={() => {}}>
            <FormControlLabel value="Bank" control={<Radio size="small" />} label="Bank"
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }} />
          </RadioGroup>
        </FieldRow>

        <FieldRow label="Account Name" required>
          <FInput value={form.accountName} onChange={(v) => p("accountName", v)} />
        </FieldRow>

        <FieldRow label="Account Code">
          <FInput value={form.accountCode} onChange={(v) => p("accountCode", v)} />
        </FieldRow>

        <FieldRow label="Currency" required>
          <FInput select value={form.currency} onChange={(v) => p("currency", v)}>
            <MenuItem value="INR">INR</MenuItem>
            <MenuItem value="USD">USD</MenuItem>
            <MenuItem value="EUR">EUR</MenuItem>
          </FInput>
        </FieldRow>

        <FieldRow label="Account Number">
          <FInput value={form.accountNumber} onChange={(v) => p("accountNumber", v)} />
        </FieldRow>

        <FieldRow label="Bank Name">
          <FInput value={form.bankName} onChange={(v) => p("bankName", v)} />
        </FieldRow>

        <FieldRow label="IFSC">
          <IFSCField
            value={form.ifsc}
            onChange={(v) => p("ifsc", v)}
            onVerified={handleIfscVerified}
            label=""
          />
        </FieldRow>

        <FieldRow label="Description">
          <FInput multiline rows={3} value={form.description} onChange={(v) => p("description", v)}
            placeholder="Max. 500 characters" />
        </FieldRow>

        <FieldRow label="">
          <FormControlLabel
            control={<Checkbox checked={form.isPrimary} onChange={(e) => p("isPrimary", e.target.checked)} size="small" />}
            label={<Typography sx={{ fontSize: 13 }}>Make this primary</Typography>}
          />
        </FieldRow>
      </Stack>
    </Modal>
  );
}

// ─── Import Statement modal (Zoho 2-step) ───────────────────────────────────

const BANK_OPTIONS = [
  "HDFC Bank",
  "IDBI Bank",
  "Kotak Mahindra Bank",
];

function ImportStatementModal({ open, onClose, bankAccounts, onImported }) {
  const [step, setStep] = useState(0);          // 0 = Configure, 1 = Preview
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropOpen, setAccountDropOpen] = useState(false);
  const [statementPdf, setStatementPdf]     = useState(null);
  const [bankName, setBankName]             = useState("");
  const [password, setPassword]             = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [preview, setPreview]               = useState(null);
  const [verified, setVerified]             = useState(false);
  const [uploading, setUploading]           = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStep(0); setSelectedAccountId(""); setAccountSearch(""); setAccountDropOpen(false);
      setStatementPdf(null); setBankName(""); setPassword(""); setPasswordRequired(false);
      setPreview(null); setVerified(false); setUploading(false);
    }
  }, [open]);

  const selectedAccount = useMemo(
    () => bankAccounts.find((a) => getId(a) === selectedAccountId) || null,
    [bankAccounts, selectedAccountId]
  );

  const filteredAccounts = useMemo(
    () => bankAccounts.filter((a) =>
      !accountSearch || a.accountName?.toLowerCase().includes(accountSearch.toLowerCase())
    ),
    [bankAccounts, accountSearch]
  );

  const handleImport = async () => {
    if (!statementPdf) return toast.error("Select a statement file");
    if (!selectedAccountId) return toast.error("Select an account");
    if (!bankName.trim()) return toast.error("Bank Name is required");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("statementPdf", statementPdf);
      if (password) fd.append("password", password);
      if (selectedAccount?.accountNumberMasked) fd.append("accountNumberMasked", selectedAccount.accountNumberMasked);
      fd.append("bankName", bankName);
      if (selectedAccount?.accountName) fd.append("accountHolderName", selectedAccount.accountName);

      const res = await bankStatementApi.uploadAndExtractPreview(fd);
      const data = pickData(res);

      if (data.duplicateStatement?.status && data.summary?.insertableRows === 0) {
        toast.error("This exact statement has already been imported.");
        return;
      }

      setPreview(data);
      setStep(1);
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === "PDF_PASSWORD_REQUIRED") {
        setPasswordRequired(true);
        toast.error("This PDF is password protected. Enter password and try again.");
      } else {
        toast.error(e?.response?.data?.message || "Failed to extract statement");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.previewToken) return;
    if (!verified) return toast.error("Verify the extracted details first");

    setUploading(true);
    try {
      await bankStatementApi.confirmImport({
        previewToken: preview.previewToken,
        userVerifiedData: true,
        isUserVerified: true,
        verifiedByUser: true,
      });
      toast.success(`${preview.summary?.insertableRows || 0} transactions imported`);
      onImported();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to import statement");
    } finally {
      setUploading(false);
    }
  };

  const hasMissingPeriod = Boolean(preview?.missingPeriod?.status);
  const canConfirm = verified && !hasMissingPeriod && preview?.canImport !== false;

  // Account selector dropdown
  const AccountSelector = (
    <Box sx={{ position: "relative" }}>
      <Box
        onClick={() => setAccountDropOpen((v) => !v)}
        sx={{
          height: 34, border: "1px solid #d1d5db", borderRadius: "5px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, cursor: "pointer", bgcolor: "#fff", fontSize: 13,
          "&:hover": { borderColor: "#4088ff" },
        }}
      >
        <Typography sx={{ fontSize: 13, color: selectedAccount ? "#111827" : "#9ca3af" }}>
          {selectedAccount?.accountName || "Select an account"}
        </Typography>
        <Box sx={{ fontSize: 10, color: "#9ca3af" }}>▾</Box>
      </Box>

      {accountDropOpen && (
        <Paper elevation={4} sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, mt: 0.5, borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ p: 1, borderBottom: "1px solid #f0f0f0" }}>
            <TextField
              fullWidth size="small" placeholder="Search"
              value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)}
              autoFocus
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: "#9ca3af" }} /></InputAdornment> }}
              sx={{ "& .MuiOutlinedInput-root": { height: 32, fontSize: 13 } }}
            />
          </Box>
          <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
            {filteredAccounts.length === 0 ? (
              <Box sx={{ px: 2, py: 1.5, fontSize: 13, color: "#9ca3af" }}>No accounts found</Box>
            ) : filteredAccounts.map((acc) => (
              <Box key={getId(acc)}
                onClick={() => { setSelectedAccountId(getId(acc)); setBankName(acc.bankName || ""); setAccountDropOpen(false); setAccountSearch(""); }}
                sx={{
                  px: 2, py: 1, fontSize: 13, cursor: "pointer",
                  bgcolor: selectedAccountId === getId(acc) ? "#eaf2ff" : "#fff",
                  color: selectedAccountId === getId(acc) ? "#1f6ff2" : "#111827",
                  "&:hover": { bgcolor: "#f7f9ff" },
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                {acc.accountName}
                {selectedAccountId === getId(acc) && <Box sx={{ color: "#1f6ff2", fontSize: 14 }}>✓</Box>}
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );

  const stepLabels = ["Configure", "Preview"];

  return (
    <Modal
      open={open} onClose={onClose} title="Import Statements" size="lg" maxBodyHeight="75vh"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          {step === 1 && <Button variant="outline" onClick={() => { setStep(0); setPreview(null); setVerified(false); }} disabled={uploading}>Back</Button>}
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          {step === 0
            ? <Button variant="primary" onClick={handleImport} disabled={uploading || !statementPdf || !selectedAccountId || !bankName.trim()}>
                {uploading ? "Extracting..." : "Import"}
              </Button>
            : <Button variant="primary" onClick={handleConfirm} disabled={uploading || !canConfirm}>
                {uploading ? "Saving..." : "Confirm Import"}
              </Button>
          }
        </Stack>
      }
    >
      <Box sx={{ pt: 1 }}>
        {/* Step indicator */}
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {stepLabels.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* ── Step 0: Configure ── */}
        {step === 0 && (
          <Stack spacing={2.5}>
            <FieldRow label="Select an account" required>
              {AccountSelector}
            </FieldRow>

            {/* File upload */}
            <FieldRow label="Statement File" required>
              <Box
                onClick={() => fileRef.current?.click()}
                sx={{
                  border: "2px dashed #d1d5db", borderRadius: 2, p: 3,
                  cursor: "pointer", textAlign: "center",
                  bgcolor: "#fafbfc",
                  "&:hover": { borderColor: "#4088ff", bgcolor: "#f0f6ff" },
                  transition: "0.15s",
                }}
              >
                <input ref={fileRef} type="file" hidden accept="application/pdf,.pdf"
                  onChange={(e) => { setStatementPdf(e.target.files?.[0] || null); setPreview(null); setVerified(false); }} />

                {statementPdf ? (
                  <Stack spacing={0.75} alignItems="center">
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{statementPdf.name}</Typography>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); setStatementPdf(null); }}
                      startIcon={<DeleteOutlineRoundedIcon />} sx={{ fontSize: 12 }}>
                      Remove
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={0.5} alignItems="center">
                    <Upload size={24} color="#9ca3af" />
                    <Typography sx={{ fontSize: 13, color: "#374151" }}>Click to select PDF statement</Typography>
                    <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>PDF files · Max 5MB</Typography>
                  </Stack>
                )}
              </Box>

              {selectedAccount?.latestStatementDate && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 15, color: "#1f6ff2" }} />
                  <Typography sx={{ fontSize: 12, color: "#1f6ff2" }}>
                    Bank statement imported till {dateText(selectedAccount.latestStatementDate)}
                  </Typography>
                </Stack>
              )}

              <Typography sx={{ fontSize: 11, color: "#9ca3af", mt: 0.5 }}>
                Maximum File Size: 5 MB for PDF files.
              </Typography>
            </FieldRow>

            {/* Password field (shown only if required) */}
            {(passwordRequired || password) && (
              <FieldRow label="PDF Password">
                <TextField
                  fullWidth size="small" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter PDF password"
                  sx={{ "& .MuiOutlinedInput-root": { height: 34, fontSize: 13 } }}
                />
                <Typography sx={{ fontSize: 11, color: "#9ca3af", mt: 0.5 }}>
                  Password is used only for extraction and is not stored.
                </Typography>
              </FieldRow>
            )}

            <FieldRow label="Bank Name" required>
              <FInput select value={bankName} onChange={setBankName}>
                <MenuItem value=""><em>Select bank</em></MenuItem>
                {BANK_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </FInput>
              {bankName && <Typography sx={{ fontSize: 11, color: "#667085", mt: 0.5 }}>Select the bank that the statement belongs to.</Typography>}
            </FieldRow>
          </Stack>
        )}

        {/* ── Step 1: Preview ── */}
        {step === 1 && preview && (
          <Stack spacing={2}>
            {/* Duplicate file warning */}
            {preview.duplicateStatement?.status && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                This exact PDF has been imported before. Only new transactions will be added.
              </Alert>
            )}

            {/* Missing period warning */}
            {hasMissingPeriod && (
              <Alert severity="error" icon={<AlertTriangle size={18} />} sx={{ borderRadius: 2 }}>
                {preview.missingPeriod?.message || "Missing statement period detected. Upload the missing statement first."}
              </Alert>
            )}

            {/* Summary cards */}
            <Grid container spacing={1.5}>
              {[
                { label: "Total Extracted", value: preview.summary?.extractedRows ?? 0, color: "#111827" },
                { label: "New Transactions", value: preview.summary?.insertableRows ?? 0, color: "#16a34a" },
                { label: "Duplicate (skipped)", value: preview.summary?.duplicateRows ?? 0, color: "#e11d48" },
              ].map(({ label, value, color }) => (
                <Grid item xs={12} sm={4} key={label}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: "center", borderColor: "#e3e7ef" }}>
                    <Typography sx={{ fontSize: 11, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 600, color }}>{value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Statement info */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#e3e7ef" }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}><Typography sx={{ fontSize: 11, color: "#667085" }}>Bank</Typography><Typography sx={{ fontSize: 13 }}>{preview.statement?.bankName || "-"}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography sx={{ fontSize: 11, color: "#667085" }}>Account</Typography><Typography sx={{ fontSize: 13 }}>{preview.statement?.accountNumberMasked || "-"}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography sx={{ fontSize: 11, color: "#667085" }}>From</Typography><Typography sx={{ fontSize: 13 }}>{dateText(preview.statement?.statementFromDate)}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography sx={{ fontSize: 11, color: "#667085" }}>To</Typography><Typography sx={{ fontSize: 13 }}>{dateText(preview.statement?.statementToDate)}</Typography></Grid>
              </Grid>
            </Paper>

            {/* Sample transactions */}
            {Array.isArray(preview.sampleTransactions) && preview.sampleTransactions.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: "#374151" }}>
                  Sample Transactions (first {Math.min(10, preview.sampleTransactions.length)} of {preview.summary?.extractedRows})
                </Typography>
                <Box sx={{ overflowX: "auto", border: "1px solid #e3e7ef", borderRadius: 2 }}>
                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <Box component="thead" sx={{ bgcolor: "#f7f8fb" }}>
                      <Box component="tr">
                        {["Date", "Description", "Deposits", "Withdrawals", "Balance"].map((h) => (
                          <Box component="th" key={h} sx={{ px: 1.5, py: 1, textAlign: h === "Date" || h === "Description" ? "left" : "right", color: "#667085", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {preview.sampleTransactions.slice(0, 10).map((txn, i) => (
                        <Box component="tr" key={i} sx={{ borderTop: "1px solid #f0f0f0", "&:hover": { bgcolor: "#fafbfc" } }}>
                          <Box component="td" sx={{ px: 1.5, py: 0.75, whiteSpace: "nowrap" }}>{dateText(txn.transactionDate)}</Box>
                          <Box component="td" sx={{ px: 1.5, py: 0.75, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {txn.isDuplicateTransaction && <Chip size="small" label="Dup" color="error" variant="outlined" sx={{ fontSize: 10, height: 16, mr: 0.5 }} />}
                            {txn.description}
                          </Box>
                          <Box component="td" sx={{ px: 1.5, py: 0.75, textAlign: "right", color: txn.deposit > 0 ? "#16a34a" : "#9ca3af" }}>{txn.deposit > 0 ? money(txn.deposit) : "-"}</Box>
                          <Box component="td" sx={{ px: 1.5, py: 0.75, textAlign: "right", color: txn.withdrawal > 0 ? "#dc2626" : "#9ca3af" }}>{txn.withdrawal > 0 ? money(txn.withdrawal) : "-"}</Box>
                          <Box component="td" sx={{ px: 1.5, py: 0.75, textAlign: "right" }}>{money(txn.balance)}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Verify checkbox */}
            {!hasMissingPeriod && preview.canImport !== false && (
              <FormControlLabel
                control={<Checkbox checked={verified} onChange={(e) => setVerified(e.target.checked)} size="small" />}
                label={<Typography sx={{ fontSize: 13 }}>I have verified the extracted details and they look correct</Typography>}
              />
            )}
          </Stack>
        )}
      </Box>
    </Modal>
  );
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2, minWidth: 180, fontSize: 13 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>{label}</Typography>
      {payload.map((entry) => (
        <Stack key={entry.name} direction="row" justifyContent="space-between" spacing={3}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: entry.color }} />
            <Typography sx={{ fontSize: 12, color: "#374151" }}>{entry.name}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {Number(entry.value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })}
          </Typography>
        </Stack>
      ))}
    </Paper>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { value: "last_30_days",   label: "Last 30 days",    days: 30 },
  { value: "this_month",     label: "This Month",      days: null },
  { value: "last_12_months", label: "Last 12 months",  days: 365 },
];

function dateRangeDates(rangeValue) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (rangeValue === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { from, to, groupBy: "day" };
  }
  const days = DATE_RANGES.find((r) => r.value === rangeValue)?.days ?? 30;
  const fromD = new Date(now);
  fromD.setDate(fromD.getDate() - (days - 1));
  return { from: fromD.toISOString().slice(0, 10), to, groupBy: days > 60 ? "month" : "day" };
}

export default function BanksPage() {
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashBalance, setCashBalance]   = useState(0);
  const [loading, setLoading]           = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [importOpen, setImportOpen]     = useState(false);
  const [showChart, setShowChart]       = useState(true);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [dateRange, setDateRange]       = useState("last_30_days");
  const [selectedAccount, setSelectedAccount] = useState("all"); // "all" or accountNumberMasked
  const [chartData, setChartData]       = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [accountDropOpen, setAccountDropOpen] = useState(false);
  const [dateDropOpen, setDateDropOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, cashRes] = await Promise.allSettled([
        bankAccountApi.list(),
        cashApi.balance(),
      ]);
      if (accRes.status === "fulfilled") {
        const data = pickData(accRes.value);
        setBankAccounts(safeArray(data.items || data));
      }
      if (cashRes.status === "fulfilled") {
        const data = pickData(cashRes.value);
        setCashBalance(Number(data?.balance ?? data?.closingBalance ?? 0));
      }
    } catch {
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalanceHistory = useCallback(async (range, account, cashBal) => {
    setChartLoading(true);
    try {
      const { from, to, groupBy } = dateRangeDates(range);
      const params = { from, to, groupBy };
      if (account && account !== "all") params.accountNumberMasked = account;

      const res = await bankStatementApi.getBalanceHistory(params);
      const history = safeArray(pickData(res)?.history || []);
      const showCash = account === "all";
      setChartData(history.map((h) => ({
        date: h.label || h.date,
        "Bank Balance": h.balance ?? 0,
        ...(showCash ? { "Cash In Hand": cashBal } : {}),
      })));
    } catch {
      // Keep previous chart data on error
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    loadBalanceHistory(dateRange, selectedAccount, cashBalance);
  }, [loadBalanceHistory, dateRange, selectedAccount, cashBalance]);

  const handleDelete = async (acc) => {
    if (!window.confirm(`Delete "${acc.accountName}"?`)) return;
    try {
      await bankAccountApi.delete(getId(acc));
      toast.success("Account deleted");
      loadAccounts();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((s, a) => s + Number(a.currentBalance ?? 0), 0),
    [bankAccounts]
  );

  // Balance shown in the header summary — filtered by selected account
  const displayBankBalance = useMemo(() => {
    if (selectedAccount === "all") return totalBankBalance;
    const acc = bankAccounts.find((a) => a.accountNumberMasked === selectedAccount);
    return Number(acc?.currentBalance ?? 0);
  }, [selectedAccount, bankAccounts, totalBankBalance]);

  // Cash line only visible when "All Accounts" is selected
  const displayCashBalance = selectedAccount === "all" ? cashBalance : 0;
  const showCashLine       = selectedAccount === "all";

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

  // All accounts including petty cash for the table
  const allAccounts = useMemo(() => [
    ...bankAccounts.map((a) => ({ ...a, _type: "bank" })),
    { _id: "cash", accountName: "Petty Cash", accountCode: "CASH-001", _type: "cash", currentBalance: cashBalance, accountNumberMasked: "" },
  ], [bankAccounts, cashBalance]);

  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={{ width: "100%", minHeight: "100%", bgcolor: "#f7f8fb", display: "flex", flexDirection: "column" }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between"
          sx={{ px: 2.5, py: 1.25, borderBottom: "1px solid #e3e7ef", bgcolor: "#fff", flexShrink: 0, gap: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#111827" }}>Banking Overview</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        
            <Button variant="outline" startIcon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
              Import Statement
            </Button>
            <Button variant="primary" startIcon={<AddRoundedIcon />} onClick={() => setAddAccountOpen(true)}>
              Add Bank 
            </Button>
           </Stack>
        </Stack>

        <Box sx={{ flex: 1, p: { xs: 1.5, md: 2.5 }, overflow: "auto" }}>

          {/* ── Overview card with chart ─────────────────────────────── */}
          <Paper variant="outlined" sx={{ mb: 2.5, borderRadius: 2, borderColor: "#e3e7ef", bgcolor: "#fff", overflow: "hidden" }}>

            {/* Card header – account + date-range dropdowns */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              sx={{ px: 2.5, pt: 2, pb: 1 }}>

              {/* Account selector */}
              <Box sx={{ position: "relative" }}>
                <Box onClick={() => { setAccountDropOpen((v) => !v); setDateDropOpen(false); }}
                  sx={{
                    height: 32, border: "1px solid #d1d5db", borderRadius: "6px",
                    display: "flex", alignItems: "center", px: 1.5, cursor: "pointer", bgcolor: "#fff",
                    gap: 0.75, "&:hover": { borderColor: "#4088ff" }, minWidth: 140,
                  }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {selectedAccount === "all" ? "All Accounts" : bankAccounts.find((a) => a.accountNumberMasked === selectedAccount)?.accountName || selectedAccount}
                  </Typography>
                  <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "#667085" }} />
                </Box>
                {accountDropOpen && (
                  <Paper elevation={4} sx={{ position: "absolute", top: "100%", left: 0, zIndex: 999, mt: 0.5, borderRadius: 1.5, minWidth: 180, overflow: "hidden" }}>
                    {[{ accountNumberMasked: "all", accountName: "All Accounts" }, ...bankAccounts].map((acc) => (
                      <Box key={acc.accountNumberMasked || "all"}
                        onClick={() => { setSelectedAccount(acc.accountNumberMasked || "all"); setAccountDropOpen(false); }}
                        sx={{ px: 2, py: 1, fontSize: 13, cursor: "pointer", bgcolor: selectedAccount === (acc.accountNumberMasked || "all") ? "#eaf2ff" : "#fff", color: selectedAccount === (acc.accountNumberMasked || "all") ? "#1f6ff2" : "#111827", "&:hover": { bgcolor: "#f7f9ff" } }}>
                        {acc.accountName}
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>

              {/* Date range selector */}
              <Box sx={{ position: "relative" }}>
                <Box onClick={() => { setDateDropOpen((v) => !v); setAccountDropOpen(false); }}
                  sx={{
                    height: 32, border: "1px solid #d1d5db", borderRadius: "6px",
                    display: "flex", alignItems: "center", px: 1.5, cursor: "pointer", bgcolor: "#fff",
                    gap: 0.75, "&:hover": { borderColor: "#4088ff" },
                  }}>
                  <Box sx={{ width: 14, height: 14, border: "1.5px solid #667085", borderRadius: "3px" }} />
                  <Typography sx={{ fontSize: 13 }}>{DATE_RANGES.find((r) => r.value === dateRange)?.label}</Typography>
                  <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "#667085" }} />
                </Box>
                {dateDropOpen && (
                  <Paper elevation={4} sx={{ position: "absolute", top: "100%", right: 0, zIndex: 999, mt: 0.5, borderRadius: 1.5, minWidth: 160, overflow: "hidden" }}>
                    {DATE_RANGES.map((r) => (
                      <Box key={r.value}
                        onClick={() => { setDateRange(r.value); setDateDropOpen(false); }}
                        sx={{ px: 2, py: 1, fontSize: 13, cursor: "pointer", bgcolor: dateRange === r.value ? "#eaf2ff" : "#fff", color: dateRange === r.value ? "#1f6ff2" : "#111827", "&:hover": { bgcolor: "#f7f9ff" } }}>
                        {r.label}
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            </Stack>

            {/* Balance summary — filtered by selected account */}
            <Stack direction="row" spacing={4} sx={{ px: 2.5, pb: 1.5 }}>
              {showCashLine && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#94a3b8" }} />
                  <Typography sx={{ fontSize: 13, color: "#374151" }}>Cash In Hand</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(displayCashBalance)}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e" }} />
                <Typography sx={{ fontSize: 13, color: "#374151" }}>
                  {selectedAccount === "all" ? "Bank Balance" : (bankAccounts.find(a => a.accountNumberMasked === selectedAccount)?.accountName || "Bank Balance")}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(displayBankBalance)}</Typography>
              </Stack>
            </Stack>

            {/* Toggle chart */}
            <Box sx={{ px: 2.5, pb: 0.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: "pointer", width: "fit-content" }}
                onClick={() => setShowChart((v) => !v)}>
                <TrendingUp size={14} color="#1f6ff2" />
                <Typography sx={{ fontSize: 12, color: "#1f6ff2", fontWeight: 500 }}>
                  {showChart ? "Hide Chart ▲" : "Show Chart ▼"}
                </Typography>
              </Stack>
            </Box>

            {/* Recharts area chart */}
            {showChart && (
              <Box sx={{ px: 1, pb: 2, pt: 0.5, position: "relative" }}>
                {chartLoading && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, bgcolor: "rgba(255,255,255,0.6)" }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      interval={Math.floor(chartData.length / 8)} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v === 0 ? "0" : `${(v / 1000).toFixed(0)}K`} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    {showCashLine && (
                      <Area type="monotone" dataKey="Cash In Hand" stroke="#94a3b8" fill="url(#cashGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    )}
                    <Area type="monotone" dataKey="Bank Balance" stroke="#22c55e" fill="url(#bankGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>

          {/* ── Active Accounts table ─────────────────────────────────── */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Active Accounts</Typography>
            <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "#667085" }} />
          </Stack>

          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: "#e3e7ef", overflow: "hidden", bgcolor: "#fff" }}>
            {/* Table header */}
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: "#f7f8fb" }}>
                  {["ACCOUNT DETAILS", "UNCATEGORIZED", "AMOUNT IN BANK", "AMOUNT IN ZOHO BOOKS", ""].map((h, i) => (
                    <Box component="th" key={h + i} sx={{
                      px: 2, py: 1.25, textAlign: i === 0 ? "left" : i === 4 ? "center" : "right",
                      fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase",
                      letterSpacing: 0.4, whiteSpace: "nowrap", borderBottom: "1px solid #e3e7ef",
                    }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {loading && allAccounts.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  </Box>
                ) : allAccounts.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={5} sx={{ textAlign: "center", py: 4, fontSize: 13, color: "#9ca3af" }}>
                      No accounts yet
                    </Box>
                  </Box>
                ) : allAccounts.map((acc) => {
                  const isCash = acc._type === "cash";
                  const accountId = getId(acc);
                  const isExpanded = expandedAccounts[accountId];
                  const uncatCount = acc.uncategorizedCount ?? 0;
                  return (
                    <React.Fragment key={accountId}>
                      <Box component="tr" sx={{
                        borderBottom: "1px solid #f0f0f0",
                        "&:hover": { bgcolor: "#fafbfc" },
                        cursor: "pointer",
                      }}
                        onClick={() => isCash ? navigate("/banks/cash") : navigate(`/banks/${encodeURIComponent(acc.accountNumberMasked || accountId)}`)}>
                        {/* Account Details */}
                        <Box component="td" sx={{ px: 2, py: 1.5 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{
                              width: 34, height: 34, borderRadius: "8px", flexShrink: 0,
                              bgcolor: isCash ? "#f0f9ff" : "#eaf2ff",
                              color: isCash ? "#0ea5e9" : "#4088ff",
                              display: "grid", placeItems: "center", fontSize: isCash ? 16 : 18,
                            }}>
                              {isCash ? "💵" : <AccountBalanceRoundedIcon sx={{ fontSize: 18 }} />}
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#1f6ff2" }}>
                                {acc.accountName}
                              </Typography>
                              {acc.accountNumberMasked && (
                                <Typography sx={{ fontSize: 12, color: "#667085" }}>
                                  {acc.accountNumberMasked}
                                </Typography>
                              )}
                              {isCash && (
                                <Typography sx={{ fontSize: 12, color: "#667085" }}>CASH-001 · Manually tracked</Typography>
                              )}
                            </Box>
                          </Stack>
                        </Box>

                        {/* Uncategorized */}
                        <Box component="td" sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                          {uncatCount > 0 ? (
                            <Chip size="small" label={uncatCount} color="error" variant="outlined"
                              sx={{ fontSize: 12, height: 22, cursor: "pointer" }} />
                          ) : (
                            <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>—</Typography>
                          )}
                        </Box>

                        {/* Amount in Bank */}
                        <Box component="td" sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                            {fmt(acc.currentBalance ?? 0)}
                          </Typography>
                        </Box>

                        {/* Amount in Zoho Books */}
                        <Box component="td" sx={{ px: 2, py: 1.5, textAlign: "right" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                            {fmt(acc.currentBalance ?? 0)}
                          </Typography>
                        </Box>

                        {/* Expand / actions */}
                        <Box component="td" sx={{ px: 2, py: 1.5, textAlign: "center" }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {!isCash && (
                              <Tooltip title="Delete account">
                                <IconButton size="small"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(acc); }}
                                  sx={{ color: "#9ca3af", "&:hover": { color: "#ef4444" } }}>
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <IconButton size="small"
                              onClick={(e) => { e.stopPropagation(); setExpandedAccounts((p) => ({ ...p, [accountId]: !p[accountId] })); }}
                              sx={{ color: "#667085", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Stack>
                        </Box>
                      </Box>

                      {/* Expanded row – quick stats */}
                      {isExpanded && (
                        <Box component="tr">
                          <Box component="td" colSpan={5} sx={{ px: 3, py: 1.5, bgcolor: "#fafbfc", borderBottom: "1px solid #e3e7ef" }}>
                            <Stack direction="row" spacing={4}>
                              {acc.bankName && <Box><Typography sx={{ fontSize: 11, color: "#667085" }}>Bank</Typography><Typography sx={{ fontSize: 13 }}>{acc.bankName}</Typography></Box>}
                              {acc.currency && <Box><Typography sx={{ fontSize: 11, color: "#667085" }}>Currency</Typography><Typography sx={{ fontSize: 13 }}>{acc.currency}</Typography></Box>}
                              {acc.latestStatementDate && <Box><Typography sx={{ fontSize: 11, color: "#667085" }}>Last Import</Typography><Typography sx={{ fontSize: 13 }}>{dateText(acc.latestStatementDate)}</Typography></Box>}
                            </Stack>
                          </Box>
                        </Box>
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          </Paper>

          {/* Add bank account CTA if empty */}
          {bankAccounts.length === 0 && !loading && (
            <Paper variant="outlined" sx={{ mt: 2, p: 4, textAlign: "center", borderRadius: 2, borderColor: "#e3e7ef", borderStyle: "dashed" }}>
              <AccountBalanceRoundedIcon sx={{ fontSize: 40, color: "#d1d5db", mb: 1 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#374151", mb: 0.5 }}>No bank accounts yet</Typography>
              <Typography sx={{ fontSize: 13, color: "#9ca3af", mb: 2 }}>Add a bank account to start importing statements.</Typography>
              <Button variant="primary" startIcon={<AddRoundedIcon />} onClick={() => setAddAccountOpen(true)}>Add Bank or Credit Card</Button>
            </Paper>
          )}
        </Box>
      </Box>

      <AddBankAccountModal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} onSaved={loadAccounts} />
      <ImportStatementModal open={importOpen} onClose={() => setImportOpen(false)} bankAccounts={bankAccounts} onImported={loadAccounts} />
    </AppShell>
  );
}
