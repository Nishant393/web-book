import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StickyHeaderShell from "../components/StickyHeaderShell";
import { bankStatementApi, ledgerApi } from "../api/bankLedgerApi";
import { customerApi, vendorApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";

const PAGE_LIMIT = 100;
const FALLBACK_HEAD_TYPES = ["Income", "Expense", "Asset", "Liability", "Tax", "Loan", "Capital"];

const DEBIT_CATEGORIES = [
  "Expense", "Vendor Advance", "Vendor Payment",
  "Transfer To Another Account", "Card Payment",
  "Owner Drawings", "Credit Note Refund",
];

const CREDIT_CATEGORIES = [
  "Customer Advance", "Customer Payment",
  "Transfer From Another Account", "Interest Income",
  "Other Income", "Expense Refund", "Deposit From Other Accounts",
];

const RECEIVED_VIA_OPTIONS = ["Cash", "Cheque", "Bank Transfer", "UPI", "NEFT", "RTGS", "IMPS", "Other"];

const CATEGORY_FIELDS = {
  Expense:                        ["expenseAccount", "vendor", "invoiceNo", "referenceNo", "customer"],
  "Vendor Advance":               ["vendor", "referenceNo"],
  "Vendor Payment":               ["vendor", "invoiceNo", "referenceNo"],
  "Transfer To Another Account":  ["toAccount", "referenceNo"],
  "Card Payment":                 ["referenceNo"],
  "Owner Drawings":               ["referenceNo"],
  "Credit Note Refund":           ["customer", "referenceNo"],
  "Customer Advance":             ["customer", "bankCharges", "receivedVia", "referenceNo"],
  "Customer Payment":             ["customer", "invoiceNo", "referenceNo"],
  "Transfer From Another Account":["fromAccount", "referenceNo"],
  "Interest Income":              ["referenceNo"],
  "Other Income":                 ["referenceNo"],
  "Expense Refund":               ["vendor", "referenceNo"],
  "Deposit From Other Accounts":  ["fromAccount", "referenceNo"],
};

const PAGE_SX = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  bgcolor: "#ffffff",
};

const PAGE_PAD_SX = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

const getId = (row) => row?._id || row?.id || row?.transactionId || row?.txnId || "";
const normalizeAccount = (value) => String(value || "").trim().replace(/\s+/g, "");
const fieldKey = (rowId, field) => `${rowId}:${field}`;

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const keys = ["items", "rows", "results", "list", "docs", "transactions", "subHeads", "headTypes", "data"];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }

  if (value.data && value.data !== value) return safeArray(value.data);
  if (value.result && value.result !== value) return safeArray(value.result);

  return [];
};

const pickData = (value) => value?.data || value?.result || value || {};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value === 0 ? "0.00" : "-";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const moneyWithRupee = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

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
        sx={{ mt: 0.25, color: "text.primary", fontWeight: 550, wordBreak: "break-word" }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, subtitle, icon, action, children, bodySx }) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        border: "0",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon ? (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                color: "primary.main",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 600, color: "text.primary", lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {action ? <Box>{action}</Box> : null}
      </Stack>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, ...bodySx }}>{children}</Box>
    </Paper>
  );
}

function ReadOnlyField({ label, value, multiline = false }) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={value || ""}
      multiline={multiline}
      minRows={multiline ? 3 : 1}
      InputProps={{ readOnly: true }}
      sx={{
        "& .MuiInputBase-root": {
          bgcolor: "#f8fafc",
          borderRadius: 1.5,
          fontSize: 13,
        },
        "& .MuiInputLabel-root": {
          fontSize: 13,
        },
      }}
    />
  );
}

function amountInfo(row) {
  const withdrawal = Number(row?.withdrawal ?? row?.debit ?? row?.debitAmount ?? 0);
  const deposit = Number(row?.deposit ?? row?.credit ?? row?.creditAmount ?? 0);

  if (withdrawal > 0) {
    return {
      label: "Withdrawal",
      direction: "DEBIT",
      amount: withdrawal,
      color: "error.main",
    };
  }

  if (deposit > 0) {
    return {
      label: "Deposit",
      direction: "CREDIT",
      amount: deposit,
      color: "success.main",
    };
  }

  return {
    label: "Amount",
    direction: "UNKNOWN",
    amount: 0,
    color: "text.primary",
  };
}

function buildPartyOptions(customers, vendors) {
  const customerOptions = safeArray(customers).map((item) => ({
    id: item._id || item.id,
    type: "CUSTOMER",
    name: item.customerName || item.name || "",
    label: `${item.customerName || item.name || "Customer"} • Customer`,
    raw: item,
  }));

  const vendorOptions = safeArray(vendors).map((item) => ({
    id: item._id || item.id,
    type: "VENDOR",
    name: item.vendorName || item.name || "",
    label: `${item.vendorName || item.name || "Vendor"} • Vendor`,
    raw: item,
  }));

  return [...customerOptions, ...vendorOptions]
    .filter((item) => item.id && item.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export default function BankDetailPage() {
  const { id } = useParams();
  const theme = useTheme();
  const scrollRef = useRef(null);
  const autosaveTimers = useRef({});
  const clearGreenTimers = useRef({});

  const accountNumberMasked = useMemo(() => normalizeAccount(decodeURIComponent(id || "")), [id]);

  const [accountDetail, setAccountDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [headTypes, setHeadTypes] = useState(FALLBACK_HEAD_TYPES);
  const [subHeads, setSubHeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [draftRows, setDraftRows] = useState({});
  const [savingFields, setSavingFields] = useState({});
  const [updatedFields, setUpdatedFields] = useState({});
  const [subHeadModal, setSubHeadModal] = useState(false);
  const [newSubHead, setNewSubHead] = useState({ name: "" });
  const [actionLoading, setActionLoading] = useState("");

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [categorizeDraft, setCategorizeDraft] = useState({
    category: "",
    expenseAccountId: "",
    expenseAccountName: "",
    fromAccount: "",
    toAccount: "",
    bankCharges: "",
    receivedVia: "",
    party: null,
    partyName: "",
    invoiceNo: "",
    referenceNo: "",
    remarks: "",
  });
  const [categorizeSaving, setCategorizeSaving] = useState(false);

  const partyOptions = useMemo(() => buildPartyOptions(customers, vendors), [customers, vendors]);
  const vendorOptions = useMemo(() => partyOptions.filter((o) => o.type === "VENDOR"), [partyOptions]);
  const customerOptions = useMemo(() => partyOptions.filter((o) => o.type === "CUSTOMER"), [partyOptions]);

  const prepareDraftRows = useCallback((list) => {
    const nextDrafts = {};

    list.forEach((row) => {
      const rowId = getId(row);
      nextDrafts[rowId] = {
        partyName: row.partyName || row.linkedPartyName || row.name || row.party || "",
        linkedPartyType: row.linkedPartyType || "",
        linkedPartyId: row.linkedPartyId || "",
        linkedPartyName: row.linkedPartyName || row.partyName || "",
        category: row.category || "",
        headType: row.headType || "",
        subHeadId: row.subHeadId?._id || row.subHeadId || row.subHead?.id || row.subHead?._id || "",
        subHeadName: row.subHeadName || row.subHead?.name || "",
        fromAccount: row.fromAccount || "",
        toAccount: row.toAccount || "",
        bankCharges: row.bankCharges || "",
        receivedVia: row.receivedVia || "",
        invoiceNo: row.invoiceNo || "",
        referenceNo: row.referenceNo || "",
        remarks: row.remarks || "",
      };
    });

    setDraftRows((prev) => ({ ...prev, ...nextDrafts }));
  }, []);

  const loadLedger = useCallback(async () => {
    try {
      const [typesRes, subRes] = await Promise.allSettled([
        ledgerApi.getHeadTypes(),
        ledgerApi.listSubHeads(),
      ]);

      if (typesRes.status === "fulfilled") {
        const raw = pickData(typesRes.value);
        const types = safeArray(raw?.headTypes || raw);
        const normalized = types.map((item) => item?.name || item?.headType || item?.type || item).filter(Boolean);
        if (normalized.length) setHeadTypes(normalized);
      }

      if (subRes.status === "fulfilled") {
        setSubHeads(safeArray(subRes.value));
      }
    } catch {
      // Fallbacks remain available.
    }
  }, []);

  const loadParties = useCallback(async () => {
    try {
      const [customerRes, vendorRes] = await Promise.allSettled([
        customerApi.list({ limit: 500 }),
        vendorApi.list({ limit: 500 }),
      ]);

      if (customerRes.status === "fulfilled") {
        const data = pickData(customerRes.value);
        setCustomers(safeArray(data.items || data));
      }

      if (vendorRes.status === "fulfilled") {
        const data = pickData(vendorRes.value);
        setVendors(safeArray(data.items || data));
      }
    } catch {
      // Keep empty list.
    }
  }, []);

  const loadTransactions = useCallback(
    async ({ reset = false, nextPage = 1 } = {}) => {
      if (!accountNumberMasked) {
        setTransactions([]);
        setDraftRows({});
        setHasMore(false);
        return;
      }

      setLoadingTransactions(true);
      try {
        const res = await bankStatementApi.getAccountTransactions(accountNumberMasked, {
          page: nextPage,
          limit: PAGE_LIMIT,
          sort: "transactionDate:desc",
        });

        const data = pickData(res);
        const list = safeArray(data.items || data.transactions || data);
        const pagination = data.pagination || {};
        const bankAccount = data.bankAccount || data.account || data.bank || null;

        setAccountDetail(bankAccount);
        setTransactions((prev) => (reset ? list : [...prev, ...list]));
        prepareDraftRows(list);
        setPage(nextPage);
        setHasMore(Number(pagination.page || nextPage) < Number(pagination.pages || 0));
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load transactions");
      } finally {
        setLoadingTransactions(false);
      }
    },
    [accountNumberMasked, prepareDraftRows],
  );

  useEffect(() => {
    loadLedger();
    loadParties();
  }, [loadLedger, loadParties]);

  useEffect(() => {
    setTransactions([]);
    setDraftRows({});
    setPage(1);
    setHasMore(false);
    setSelectedTransaction(null);
    loadTransactions({ reset: true, nextPage: 1 });
  }, [accountNumberMasked, loadTransactions]);

  useEffect(() => {
    return () => {
      Object.values(autosaveTimers.current).forEach(clearTimeout);
      Object.values(clearGreenTimers.current).forEach(clearTimeout);
    };
  }, []);

  const markSavedGreen = (rowId, field) => {
    const key = fieldKey(rowId, field);
    setUpdatedFields((prev) => ({ ...prev, [key]: true }));

    if (clearGreenTimers.current[key]) clearTimeout(clearGreenTimers.current[key]);

    clearGreenTimers.current[key] = setTimeout(() => {
      setUpdatedFields((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2400);
  };

  const markSaving = (rowId, field, value) => {
    const key = fieldKey(rowId, field);
    setSavingFields((prev) => ({ ...prev, [key]: value }));
  };

  const updateTransactionLocally = (rowId, patch) => {
    setTransactions((prev) => prev.map((item) => (getId(item) === rowId ? { ...item, ...patch } : item)));

    setSelectedTransaction((prev) => {
      if (!prev || getId(prev) !== rowId) return prev;
      return { ...prev, ...patch };
    });
  };

  const scheduleAutoSave = useCallback((row, field, patch, delay = 0) => {
    const rowId = getId(row);
    if (!rowId) return;

    const timerKey = fieldKey(rowId, field);
    if (autosaveTimers.current[timerKey]) clearTimeout(autosaveTimers.current[timerKey]);

    autosaveTimers.current[timerKey] = setTimeout(async () => {
      markSaving(rowId, field, true);
      try {
        await bankStatementApi.updateTransactionMapping(rowId, patch);
        updateTransactionLocally(rowId, patch);
        markSavedGreen(rowId, field);
      } catch (error) {
        toast.error(error?.response?.data?.message || `Failed to update ${field}`);
      } finally {
        markSaving(rowId, field, false);
      }
    }, delay);
  }, []);

  const openCategorizePanel = (row) => {
    const rowId = getId(row);
    const draft = draftRows[rowId] || {};
    const linkedPartyId = draft.linkedPartyId || row.linkedPartyId || "";
    const linkedPartyType = draft.linkedPartyType || row.linkedPartyType || "";

    const selectedParty =
      partyOptions.find(
        (item) =>
          String(item.id) === String(linkedPartyId) &&
          (!linkedPartyType || String(item.type) === String(linkedPartyType)),
      ) || null;

    const rawName =
      draft.partyName ||
      draft.linkedPartyName ||
      row.partyName ||
      row.linkedPartyName ||
      row.name ||
      "";

    setSelectedTransaction(row);
    setCategorizeDraft({
      category: draft.category || row.category || "",
      expenseAccountId: draft.subHeadId || row.subHeadId?._id || row.subHeadId || "",
      expenseAccountName: draft.subHeadName || row.subHeadName || row.subHead?.name || "",
      fromAccount: draft.fromAccount || row.fromAccount || "",
      toAccount: draft.toAccount || row.toAccount || "",
      bankCharges: draft.bankCharges || row.bankCharges || "",
      receivedVia: draft.receivedVia || row.receivedVia || "",
      party: selectedParty,
      partyName: selectedParty?.name || rawName || "",
      invoiceNo: draft.invoiceNo || row.invoiceNo || "",
      referenceNo: draft.referenceNo || row.referenceNo || "",
      remarks: draft.remarks || row.remarks || "",
    });
  };

  const closeCategorizePanel = () => {
    setSelectedTransaction(null);
    setCategorizeDraft({
      category: "",
      expenseAccountId: "",
      expenseAccountName: "",
      fromAccount: "",
      toAccount: "",
      bankCharges: "",
      receivedVia: "",
      party: null,
      partyName: "",
      invoiceNo: "",
      referenceNo: "",
      remarks: "",
    });
  };

  const updateCategorizeField = (field, value) => {
    setCategorizeDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "category") {
        next.party = null;
        next.partyName = "";
      }
      if (field === "expenseAccountId") {
        const match = subHeads.find((item) => String(getId(item)) === String(value));
        next.expenseAccountName = match?.name || match?.subHeadName || "";
      }
      return next;
    });
  };

  const saveCategorization = async () => {
    const row = selectedTransaction;
    const rowId = getId(row);
    if (!rowId) return;

    if (!categorizeDraft.category) {
      toast.error("Select a category before saving");
      return;
    }

    setCategorizeSaving(true);
    try {
      const party = categorizeDraft.party;
      const selectedSubHead = subHeads.find((item) => String(getId(item)) === String(categorizeDraft.expenseAccountId));
      const needsVendor = ["Expense", "Vendor Advance", "Vendor Payment", "Expense Refund"].includes(categorizeDraft.category);
      const needsCustomer = ["Customer Advance", "Customer Payment", "Credit Note Refund"].includes(categorizeDraft.category);

      const patch = {
        category: categorizeDraft.category,
        subHeadId: categorizeDraft.expenseAccountId || undefined,
        subHeadName: selectedSubHead?.name || selectedSubHead?.subHeadName || categorizeDraft.expenseAccountName || "",
        expenseAccountName: selectedSubHead?.name || selectedSubHead?.subHeadName || categorizeDraft.expenseAccountName || "",
        fromAccount: categorizeDraft.fromAccount || "",
        toAccount: categorizeDraft.toAccount || "",
        bankCharges: categorizeDraft.bankCharges !== "" ? Number(categorizeDraft.bankCharges) : 0,
        receivedVia: categorizeDraft.receivedVia || "",
        invoiceNo: categorizeDraft.invoiceNo || "",
        referenceNo: categorizeDraft.referenceNo || "",
        partyName: party?.name || categorizeDraft.partyName || "",
        linkedPartyType: party?.type || (needsVendor ? "VENDOR" : needsCustomer ? "CUSTOMER" : ""),
        linkedPartyId: party?.id || null,
        linkedPartyName: party?.name || categorizeDraft.partyName || "",
        remarks: categorizeDraft.remarks || "",
      };

      await bankStatementApi.updateTransactionMapping(rowId, patch);

      setDraftRows((prev) => ({
        ...prev,
        [rowId]: { ...(prev[rowId] || {}), ...patch },
      }));

      updateTransactionLocally(rowId, { ...patch, category: categorizeDraft.category });
      markSavedGreen(rowId, "row");
      toast.success("Transaction categorized");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to categorize transaction");
    } finally {
      setCategorizeSaving(false);
    }
  };

  const createSubHead = async () => {
    if (!newSubHead.name.trim()) {
      toast.error("Subhead name is required");
      return;
    }

    setActionLoading("subhead");
    try {
      await ledgerApi.createSubHead({
        name: newSubHead.name.trim(),
        subHeadName: newSubHead.name.trim(),
      });
      toast.success("Subhead added");
      setNewSubHead({ name: "" });
      setSubHeadModal(false);
      await loadLedger();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add subhead");
    } finally {
      setActionLoading("");
    }
  };

  const handleScroll = (event) => {
    const el = event.currentTarget;
    if (!hasMore || loadingTransactions) return;

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
    if (nearBottom) loadTransactions({ reset: false, nextPage: page + 1 });
  };

  const rowHighlightSx = (row) => {
    const rowId = getId(row);
    const selected = selectedTransaction && getId(selectedTransaction) === rowId;
    const saved = updatedFields[fieldKey(rowId, "row")];

    if (selected) {
      return {
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      };
    }

    if (saved) {
      return {
        bgcolor: alpha(theme.palette.success.main, 0.09),
      };
    }

    return undefined;
  };

  const savingChip = (rowId, field) => {
    if (!savingFields[fieldKey(rowId, field)]) return null;
    return <Chip size="small" label="Saving" variant="outlined" sx={{ ml: 0.75, height: 20, fontSize: 10 }} />;
  };

  const transactionColumns = [
    {
      key: "transactionDate",
      header: "Date",
      render: (row) => formatDate(row.transactionDate || row.txnDate || row.date),
    },
    {
      key: "statementDetails",
      header: "Statement Details",
      maxWidth: 430,
      render: (row) => (
        <Stack spacing={0.35}>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
            Description: {row.description || row.narration || "-"}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {row.partyName || row.linkedPartyName ? (
              <Chip size="small" label={row.partyName || row.linkedPartyName} variant="outlined" />
            ) : null}
            {(row.category || row.headType) ? (
              <Chip size="small" label={row.category || row.headType} color="primary" variant="outlined" />
            ) : null}
            {row.subHeadName ? <Chip size="small" label={row.subHeadName} variant="outlined" /> : null}
            {row?.duplicateCheck?.isDuplicateTransaction || row.isDuplicateTransaction || row.duplicateTransaction ? (
              <Chip size="small" label="Duplicate" color="error" variant="outlined" />
            ) : null}
          </Stack>
        </Stack>
      ),
    },
    {
      key: "deposit",
      header: "Deposits",
      align: "right",
      render: (row) => formatMoney(row.deposit ?? row.credit ?? row.creditAmount),
    },
    {
      key: "withdrawal",
      header: "Withdrawals",
      align: "right",
      render: (row) => formatMoney(row.withdrawal ?? row.debit ?? row.debitAmount),
    },
    {
      key: "balance",
      header: "Running Balance",
      align: "right",
      render: (row) => formatMoney(row.balance ?? row.balanceAmount),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const mapped = Boolean(row.category || row.headType || row.subHeadName || row.partyName || row.linkedPartyName);
        return (
          <Chip
            size="small"
            color={mapped ? "success" : "warning"}
            variant="outlined"
            label={mapped ? "Categorized" : "Uncategorized"}
          />
        );
      },
    },
  ];

  const amount = amountInfo(selectedTransaction);

  return (
    <AppShell>
      <HistoricalUiStyles />

      <Box sx={PAGE_SX}>
        <Box sx={PAGE_PAD_SX}>
          <StickyHeaderShell boxSx={{ top: 0, pt: 0, pb: 0 }} paperSx={{ px: 2.5, py: 1.4, borderRadius: 0, boxShadow: "none" }}>
            <PageHeader
              title={accountDetail?.accountHolderName || "Bank Transactions"}
              subtitle={`Account Number: ${accountDetail?.accountNumberMasked || accountNumberMasked || "-"}`}
              action={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="primary" onClick={() => loadTransactions({ reset: true, nextPage: 1 })}>
                    Quick Categorize
                  </Button>
                  <Button variant="outline" startIcon={<RefreshRoundedIcon />} onClick={() => loadTransactions({ reset: true, nextPage: 1 })}>
                    Refresh
                  </Button>
                  <Button variant="outline" startIcon={<AddRoundedIcon />} onClick={() => setSubHeadModal(true)}>
                    Add Subhead
                  </Button>
                </Stack>
              }
            />
          </StickyHeaderShell>

          <SectionCard
            title="Account Summary"
            icon={<AccountBalanceRoundedIcon fontSize="small" />}
            action={<Chip size="small" label={`${transactions.length} loaded`} color="primary" variant="outlined" />}
            bodySx={{ py: 1.5 }}
          >
            {accountDetail ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoItem label="Bank" value={accountDetail.bankName} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoItem label="Account Holder" value={accountDetail.accountHolderName} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoItem label="Account Number" value={accountDetail.accountNumberMasked || accountNumberMasked} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <InfoItem
                    label="Available Period"
                    value={`${formatDate(accountDetail.firstStatementFromDate)} - ${formatDate(accountDetail.latestStatementToDate)}`}
                  />
                </Grid>
              </Grid>
            ) : loadingTransactions ? (
              <Stack alignItems="center" sx={{ py: 1 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                No bank account found for this account number.
              </Alert>
            )}
          </SectionCard>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: selectedTransaction ? { xs: "1fr", lg: "minmax(0, 1fr) 390px" } : "1fr",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TableRowsRoundedIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>All Transactions</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      Click any row to categorize it.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  {hasMore ? <Chip size="small" label="Scroll for more" variant="outlined" /> : null}
                  <Chip size="small" label={`${transactions.length} rows`} color="primary" variant="outlined" />
                </Stack>
              </Box>

              <Box ref={scrollRef} onScroll={handleScroll} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <DataTable
                  columns={transactionColumns}
                  rows={transactions.map((row, index) => ({
                    ...row,
                    __rowKey: getId(row) || `txn-${index}`,
                    __rowSx: rowHighlightSx(row),
                  }))}
                  loading={loadingTransactions && transactions.length === 0}
                  loadingText="Loading transactions..."
                  emptyText="No transactions found for this bank account."
                  minWidth={1180}
                  onRowClick={openCategorizePanel}
                  stickyHeader
                />

                {loadingTransactions && transactions.length > 0 ? (
                  <Stack alignItems="center" sx={{ py: 2 }}>
                    <CircularProgress size={22} />
                  </Stack>
                ) : null}

                {!loadingTransactions && hasMore ? (
                  <Stack alignItems="center" sx={{ py: 2 }}>
                    <Button variant="outline" onClick={() => loadTransactions({ reset: false, nextPage: page + 1 })}>
                      Load More
                    </Button>
                  </Stack>
                ) : null}
              </Box>
            </Box>

            {selectedTransaction ? (
              <Paper
                elevation={0}
                sx={{
                  minWidth: 0,
                  borderLeft: { xs: 0, lg: "1px solid" },
                  borderTop: { xs: "1px solid", lg: 0 },
                  borderColor: "divider",
                  borderRadius: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", textTransform: "uppercase", fontWeight: 700 }}>
                      Categorize Manually
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                      Transaction Category
                    </Typography>
                  </Box>

                  <IconButton size="small" onClick={closeCategorizePanel}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Box sx={{ p: 2, overflow: "auto", minHeight: 0, flex: 1 }}>
                  {(() => {
                    const isDebit = amount.direction === "DEBIT";
                    const isCredit = amount.direction === "CREDIT";
                    const categories = isDebit ? DEBIT_CATEGORIES : isCredit ? CREDIT_CATEGORIES : [...DEBIT_CATEGORIES, ...CREDIT_CATEGORIES];
                    const currentCat = categorizeDraft.category;
                    const fields = CATEGORY_FIELDS[currentCat] || [];
                    const has = (f) => fields.includes(f);

                    return (
                      <Stack spacing={2.5}>
                        {/* Category */}
                        <FormControl fullWidth size="small">
                          <Typography sx={{ fontSize: 13, color: "error.main", mb: 0.7, fontWeight: 600 }}>Category*</Typography>
                          <Select
                            displayEmpty
                            value={currentCat}
                            onChange={(e) => updateCategorizeField("category", e.target.value)}
                          >
                            <MenuItem value="">Select category</MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Expense Account (Expense category only) */}
                        {has("expenseAccount") && (
                          <FormControl fullWidth size="small">
                            <Typography sx={{ fontSize: 13, color: "error.main", mb: 0.7, fontWeight: 600 }}>Expense Account*</Typography>
                            <Select
                              displayEmpty
                              value={categorizeDraft.expenseAccountId || ""}
                              onChange={(e) => updateCategorizeField("expenseAccountId", e.target.value)}
                            >
                              <MenuItem value="">Select account</MenuItem>
                              {subHeads.map((item) => (
                                <MenuItem key={getId(item)} value={getId(item)}>
                                  {item.name || item.subHeadName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}

                        {/* Vendor */}
                        {has("vendor") && (
                          <Box>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.7, fontWeight: 600 }}>Vendor</Typography>
                            <Autocomplete
                              size="small"
                              options={vendorOptions}
                              value={categorizeDraft.party}
                              getOptionLabel={(option) => option?.label || ""}
                              isOptionEqualToValue={(option, value) => String(option?.id) === String(value?.id)}
                              onChange={(_, value) => setCategorizeDraft((prev) => ({ ...prev, party: value, partyName: value?.name || "" }))}
                              renderInput={(params) => <TextField {...params} placeholder="Search vendor" size="small" />}
                            />
                          </Box>
                        )}

                        {/* Customer */}
                        {has("customer") && (
                          <Box>
                            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.7, fontWeight: 600 }}>Customer</Typography>
                            <Autocomplete
                              size="small"
                              options={customerOptions}
                              value={categorizeDraft.party}
                              getOptionLabel={(option) => option?.label || ""}
                              isOptionEqualToValue={(option, value) => String(option?.id) === String(value?.id)}
                              onChange={(_, value) => setCategorizeDraft((prev) => ({ ...prev, party: value, partyName: value?.name || "" }))}
                              renderInput={(params) => <TextField {...params} placeholder="Select customer" size="small" />}
                            />
                          </Box>
                        )}

                        {/* From Account */}
                        {has("fromAccount") && (
                          <Box>
                            <Typography sx={{ fontSize: 13, color: "error.main", mb: 0.7, fontWeight: 600 }}>From Account*</Typography>
                            <TextField
                              fullWidth size="small"
                              value={categorizeDraft.fromAccount || ""}
                              onChange={(e) => updateCategorizeField("fromAccount", e.target.value)}
                              placeholder="Source account"
                            />
                          </Box>
                        )}

                        {/* To Account */}
                        {has("toAccount") && (
                          <Box>
                            <Typography sx={{ fontSize: 13, color: "error.main", mb: 0.7, fontWeight: 600 }}>To Account*</Typography>
                            <TextField
                              fullWidth size="small"
                              value={categorizeDraft.toAccount || ""}
                              onChange={(e) => updateCategorizeField("toAccount", e.target.value)}
                              placeholder="Destination account"
                            />
                          </Box>
                        )}

                        <Divider />

                        {/* Date - always shown */}
                        <ReadOnlyField label="Date*" value={formatDate(selectedTransaction.transactionDate)} />

                        {/* Amount - always shown */}
                        <TextField
                          fullWidth size="small" label="Amount*"
                          value={moneyWithRupee(amount.amount)}
                          InputProps={{
                            readOnly: true,
                            sx: { color: amount.direction === "DEBIT" ? "error.main" : "success.main", fontWeight: 700 },
                          }}
                        />

                        {/* Invoice# */}
                        {has("invoiceNo") && (
                          <TextField
                            fullWidth size="small" label="Invoice#"
                            value={categorizeDraft.invoiceNo || ""}
                            onChange={(e) => updateCategorizeField("invoiceNo", e.target.value)}
                          />
                        )}

                        {/* Reference# */}
                        {has("referenceNo") && (
                          <TextField
                            fullWidth size="small" label="Reference#"
                            value={categorizeDraft.referenceNo || ""}
                            onChange={(e) => updateCategorizeField("referenceNo", e.target.value)}
                          />
                        )}

                        {/* Bank Charges */}
                        {has("bankCharges") && (
                          <TextField
                            fullWidth size="small" label="Bank Charges (if any)"
                            type="number"
                            value={categorizeDraft.bankCharges || ""}
                            onChange={(e) => updateCategorizeField("bankCharges", e.target.value)}
                          />
                        )}

                        {/* Received Via */}
                        {has("receivedVia") && (
                          <FormControl fullWidth size="small">
                            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.7 }}>Received Via</Typography>
                            <Select
                              displayEmpty
                              value={categorizeDraft.receivedVia || ""}
                              onChange={(e) => updateCategorizeField("receivedVia", e.target.value)}
                            >
                              <MenuItem value="">Select</MenuItem>
                              {RECEIVED_VIA_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}

                        {/* Description - always shown */}
                        <ReadOnlyField
                          label="Description"
                          value={selectedTransaction.description || selectedTransaction.narration || ""}
                          multiline
                        />

                        {/* Remarks */}
                        <TextField
                          fullWidth size="small" label="Remarks"
                          value={categorizeDraft.remarks || ""}
                          onChange={(e) => updateCategorizeField("remarks", e.target.value)}
                          multiline minRows={2}
                          placeholder="Optional internal note"
                        />
                      </Stack>
                    );
                  })()}
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="flex-end"
                  sx={{
                    p: 1.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Button variant="outline" onClick={closeCategorizePanel} disabled={categorizeSaving}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={categorizeSaving}
                    startIcon={categorizeSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
                    onClick={saveCategorization}
                  >
                    Save
                  </Button>
                </Stack>
              </Paper>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Modal
        open={subHeadModal}
        onClose={() => setSubHeadModal(false)}
        title="Add Subhead"
        footer={
          <Stack direction="row" spacing={1}>
            <Button variant="outline" onClick={() => setSubHeadModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={actionLoading === "subhead"}
              startIcon={actionLoading === "subhead" ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
              onClick={createSubHead}
            >
              Save Subhead
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Subhead is independent and is not linked under any Head.
          </Alert>
          <TextField
            fullWidth
            size="small"
            label="Subhead Name"
            value={newSubHead.name}
            onChange={(e) => setNewSubHead({ name: e.target.value })}
            placeholder="Example: Rent, Salary, Bank Charges"
          />
        </Stack>
      </Modal>
    </AppShell>
  );
}
