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
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
// import { useNavigate } from "react-router-dom";
import { alpha, useTheme } from "@mui/material/styles";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import StickyHeaderShell from "../components/StickyHeaderShell";
import { bankStatementApi, ledgerApi } from "../api/bankLedgerApi";
import { customerApi, vendorApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";

const PAGE_LIMIT = 25; // server-side page size
const FALLBACK_HEAD_TYPES = ["Income", "Expense", "Asset", "Liability", "Tax", "Loan", "Capital"];

const EMPTY_DRAFT = {
  category: "",
  // SubHead account selections
  expenseAccountId:  "",
  expenseAccountName:"",
  incomeAccountId:   "",
  incomeAccountName: "",
  // Parties (separate vendor / customer)
  vendorParty:   null,
  customerParty: null,
  // Bank transfer
  fromAccount: "",
  toAccount:   "",
  // GST
  gstTreatment: "",
  gstRate:      "",
  gstAmount:    "",
  // TDS
  tdsApplicable: false,
  tdsRate:       "",
  tdsAmount:     "",
  // Text-based account fields (meta)
  creditCardAccount:      "",
  loanAccount:            "",
  equityAccount:          "",
  capitalAccount:         "",
  salaryAccount:          "",
  assetAccount:           "",
  openingBalanceAccount:  "",
  interestExpenseAccount: "",
  // Person / entity names (meta)
  ownerName:    "",
  lenderName:   "",
  payerName:    "",
  receivedFrom: "",
  payee:        "",
  // Tax fields (meta)
  taxType:   "",
  taxPeriod: "",
  challanNo: "",
  // Description fields (meta)
  interestAmount:  "",
  salaryMonth:     "",
  assetDescription:"",
  itemDetails:     "",
  refundReference: "",
  refundReason:    "",
  exclusionReason: "",
  // Standard
  referenceNo: "",
  notes:       "",
};

// ─── Category lists (Zoho-style) ─────────────────────────────────────────────

const DEBIT_CATEGORIES = [
  "Expense",
  "Vendor Payment",
  "Purchase Without Bill",
  "Credit Card Payment",
  "Bank Transfer",
  "Owner Drawings",
  "Loan Repayment",
  "Tax Payment",
  "Salary / Payroll Payment",
  "Asset Purchase",
  "Customer Refund",
  "Other Withdrawal",
  "Exclude / Ignore",
];

const CREDIT_CATEGORIES = [
  "Customer Payment",
  "Sales Without Invoice",
  "Other Income",
  "Vendor Refund",
  "Bank Transfer",
  "Owner Contribution",
  "Loan Received",
  "Tax Refund",
  "Opening Balance Adjustment",
  "Other Deposit",
  "Exclude / Ignore",
];

const GST_RATES      = ["0", "5", "12", "18", "28"];
const GST_TREATMENTS = ["None", "Registered", "Unregistered", "Composition", "Out of Scope"];
const TAX_TYPES      = ["GST", "TDS", "Income Tax", "Professional Tax", "Other Tax"];

// Field keys each category renders in the categorize panel
const CATEGORY_FIELDS = {
  // ── DEBIT ──────────────────────────────────────────────────────────────────
  "Expense":                   ["expenseAccount", "vendor", "gst", "tds", "referenceNo", "notes"],
  "Vendor Payment":            ["vendor", "referenceNo", "tds", "notes"],
  "Purchase Without Bill":     ["vendor", "expenseAccount", "gst", "itemDetails", "notes"],
  "Credit Card Payment":       ["creditCardAccount", "referenceNo", "notes"],
  "Bank Transfer":             ["fromAccount", "toAccount", "referenceNo"],
  "Owner Drawings":            ["ownerName", "equityAccount", "notes"],
  "Loan Repayment":            ["loanAccount", "interestAmount", "interestExpenseAccount", "referenceNo"],
  "Tax Payment":               ["taxType", "taxPeriod", "challanNo", "notes"],
  "Salary / Payroll Payment":  ["salaryAccount", "salaryMonth", "notes"],
  "Asset Purchase":            ["assetAccount", "vendor", "gst", "assetDescription"],
  "Customer Refund":           ["customer", "refundReference", "refundReason"],
  "Other Withdrawal":          ["payee", "referenceNo", "notes"],
  "Exclude / Ignore":          ["exclusionReason"],
  // ── CREDIT ─────────────────────────────────────────────────────────────────
  "Customer Payment":              ["customer", "referenceNo", "tds", "notes"],
  "Sales Without Invoice":         ["customer", "incomeAccount", "gst", "notes"],
  "Other Income":                  ["incomeAccount", "payerName", "gst", "notes"],
  "Vendor Refund":                 ["vendor", "refundReference", "refundReason"],
  "Owner Contribution":            ["ownerName", "capitalAccount", "notes"],
  "Loan Received":                 ["lenderName", "loanAccount", "referenceNo"],
  "Tax Refund":                    ["taxType", "taxPeriod", "referenceNo"],
  "Opening Balance Adjustment":    ["openingBalanceAccount", "notes"],
  "Other Deposit":                 ["receivedFrom", "referenceNo", "notes"],
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
  const navigate = useNavigate();
  const theme = useTheme();
  const scrollRef = useRef(null);
  const autosaveTimers = useRef({});
  const clearGreenTimers = useRef({});

  const accountNumberMasked = useMemo(() => normalizeAccount(decodeURIComponent(id || "")), [id]);

  const [accountDetail, setAccountDetail] = useState(null);
  const [accountBalance, setAccountBalance] = useState(null); // persists across page changes
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

  // Tab 0 = Uncategorized, Tab 1 = Categorized (All Transactions)
  const [mainTab, setMainTab] = useState(0);
  const [addTxnAnchor, setAddTxnAnchor] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const TABLE_PAGE_SIZE = PAGE_LIMIT;

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [categorizeDraft, setCategorizeDraft] = useState(EMPTY_DRAFT);
  const [categorizeSaving, setCategorizeSaving] = useState(false);
  const [categorizeTab, setCategorizeTab] = useState("manual");
  const [receiptFile, setReceiptFile] = useState(null);

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

  // categorized=true → only transactions with a category set
  const loadTransactions = useCallback(
    async ({ pageNum = 1, categorized = false } = {}) => {
      if (!accountNumberMasked) {
        setTransactions([]);
        setDraftRows({});
        setTotalCount(0);
        return;
      }

      setLoadingTransactions(true);
      try {
        const params = {
          page: pageNum,
          limit: PAGE_LIMIT,
          sort: "transactionDate:desc",
        };
        if (categorized) params.categorized = "true";

        const res = await bankStatementApi.getAccountTransactions(accountNumberMasked, params);

        const data = pickData(res);
        const list = safeArray(data.items || data.transactions || data);
        const pagination = data.pagination || {};
        const bankAccount = data.bankAccount || data.account || data.bank || null;

        setAccountDetail(bankAccount);
        // Only update the displayed account balance when we have a fresh value,
        // so it never jumps when the user flips pages.
        if (bankAccount?.currentBalance != null) {
          setAccountBalance(bankAccount.currentBalance);
        } else if (pageNum === 1 && list.length > 0) {
          // Fallback: derive from the most-recent transaction on first page load
          const sorted = [...list].sort(
            (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
          );
          const latestBal = sorted[0]?.balance;
          if (latestBal != null) setAccountBalance(latestBal);
        }
        setTransactions(list);
        prepareDraftRows(list);
        setPage(pageNum);
        setTotalCount(Number(pagination.total || list.length));
        setHasMore(Number(pagination.page || pageNum) < Number(pagination.pages || 1));
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
    setTotalCount(0);
    setTablePage(1);
    setAccountBalance(null); // reset so we don't show stale balance for new account
    setSelectedTransaction(null);
    loadTransactions({ pageNum: 1, categorized: mainTab === 1 });
  }, [accountNumberMasked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when tab or page changes
  useEffect(() => {
    setTablePage(1);
    loadTransactions({ pageNum: 1, categorized: mainTab === 1 });
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTransactions({ pageNum: tablePage, categorized: mainTab === 1 });
  }, [tablePage]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const linkedPartyId   = draft.linkedPartyId   || row.linkedPartyId   || "";
    const linkedPartyType = draft.linkedPartyType || row.linkedPartyType || "";
    const meta = row.meta || {};

    const savedParty = partyOptions.find(
      (item) => String(item.id) === String(linkedPartyId) && item.type === linkedPartyType,
    ) || null;

    setCategorizeTab("manual");
    setReceiptFile(null);
    setSelectedTransaction(row);
    setCategorizeDraft({
      category:           draft.category || row.category || "",
      expenseAccountId:   draft.subHeadId || row.subHeadId?._id || row.subHeadId || "",
      expenseAccountName: draft.subHeadName || row.subHeadName || "",
      incomeAccountId:    meta.incomeAccountId || "",
      incomeAccountName:  meta.incomeAccountName || "",
      vendorParty:   linkedPartyType === "VENDOR"   ? savedParty : null,
      customerParty: linkedPartyType === "CUSTOMER" ? savedParty : null,
      fromAccount:   draft.fromAccount || row.fromAccount || "",
      toAccount:     draft.toAccount   || row.toAccount   || "",
      gstTreatment:  row.gstTreatment  || "",
      gstRate:       row.gstRate != null ? String(row.gstRate) : "",
      gstAmount:     row.gstAmount != null ? String(row.gstAmount) : "",
      tdsApplicable: row.tdsApplicable  || false,
      tdsRate:       row.tdsRate != null ? String(row.tdsRate) : "",
      tdsAmount:     row.tdsAmount != null ? String(row.tdsAmount) : "",
      creditCardAccount:      meta.creditCardAccount      || "",
      loanAccount:            meta.loanAccount            || "",
      equityAccount:          meta.equityAccount          || "",
      capitalAccount:         meta.capitalAccount         || "",
      salaryAccount:          meta.salaryAccount          || "",
      assetAccount:           meta.assetAccount           || "",
      openingBalanceAccount:  meta.openingBalanceAccount  || "",
      interestExpenseAccount: meta.interestExpenseAccount || "",
      ownerName:    meta.ownerName    || "",
      lenderName:   meta.lenderName   || "",
      payerName:    meta.payerName    || "",
      receivedFrom: meta.receivedFrom || "",
      payee:        meta.payee        || "",
      taxType:      meta.taxType      || "",
      taxPeriod:    meta.taxPeriod    || "",
      challanNo:    meta.challanNo    || "",
      interestAmount:   meta.interestAmount   || "",
      salaryMonth:      meta.salaryMonth      || "",
      assetDescription: meta.assetDescription || "",
      itemDetails:      meta.itemDetails      || "",
      refundReference:  meta.refundReference  || "",
      refundReason:     meta.refundReason     || "",
      exclusionReason:  row.exclusionReason   || "",
      referenceNo: draft.referenceNo || row.referenceNo || "",
      notes:       draft.remarks     || row.remarks     || "",
    });
  };

  const closeCategorizePanel = () => {
    setSelectedTransaction(null);
    setCategorizeDraft(EMPTY_DRAFT);
    setCategorizeTab("manual");
    setReceiptFile(null);
  };

  const updateCategorizeField = (field, value) => {
    setCategorizeDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "category") {
        // Reset parties when category changes
        next.vendorParty   = null;
        next.customerParty = null;
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
      const category = categorizeDraft.category;
      const fields   = CATEGORY_FIELDS[category] || [];

      // Resolve linked party (vendor > customer priority)
      let linkedParty = null, linkedPartyType = "";
      if (fields.includes("vendor") && categorizeDraft.vendorParty) {
        linkedParty = categorizeDraft.vendorParty; linkedPartyType = "VENDOR";
      } else if (fields.includes("customer") && categorizeDraft.customerParty) {
        linkedParty = categorizeDraft.customerParty; linkedPartyType = "CUSTOMER";
      }

      // Resolve expense/income account
      const useIncomeAccount = fields.includes("incomeAccount");
      const accountId   = useIncomeAccount ? categorizeDraft.incomeAccountId   : categorizeDraft.expenseAccountId;
      const accountName = useIncomeAccount ? categorizeDraft.incomeAccountName : categorizeDraft.expenseAccountName;
      const selectedSubHead = subHeads.find((item) => String(getId(item)) === String(accountId));
      const resolvedAccountName = selectedSubHead?.name || selectedSubHead?.subHeadName || accountName || "";

      // Build meta object for category-specific fields
      const meta = {
        creditCardAccount:      categorizeDraft.creditCardAccount      || "",
        loanAccount:            categorizeDraft.loanAccount            || "",
        equityAccount:          categorizeDraft.equityAccount          || "",
        capitalAccount:         categorizeDraft.capitalAccount         || "",
        salaryAccount:          categorizeDraft.salaryAccount          || "",
        assetAccount:           categorizeDraft.assetAccount           || "",
        openingBalanceAccount:  categorizeDraft.openingBalanceAccount  || "",
        interestExpenseAccount: categorizeDraft.interestExpenseAccount || "",
        ownerName:    categorizeDraft.ownerName    || "",
        lenderName:   categorizeDraft.lenderName   || "",
        payerName:    categorizeDraft.payerName     || "",
        receivedFrom: categorizeDraft.receivedFrom  || "",
        payee:        categorizeDraft.payee         || "",
        taxType:      categorizeDraft.taxType       || "",
        taxPeriod:    categorizeDraft.taxPeriod     || "",
        challanNo:    categorizeDraft.challanNo     || "",
        interestAmount:   categorizeDraft.interestAmount   || "",
        salaryMonth:      categorizeDraft.salaryMonth      || "",
        assetDescription: categorizeDraft.assetDescription || "",
        itemDetails:      categorizeDraft.itemDetails      || "",
        refundReference:  categorizeDraft.refundReference  || "",
        refundReason:     categorizeDraft.refundReason     || "",
        incomeAccountId:   categorizeDraft.incomeAccountId   || "",
        incomeAccountName: categorizeDraft.incomeAccountName || "",
      };

      const patch = {
        category,
        // Linked party
        linkedPartyType,
        linkedPartyId:   linkedParty?.id   || null,
        linkedPartyName: linkedParty?.name || "",
        partyName:       linkedParty?.name || "",
        // Account (expense or income subHead)
        subHeadId:          accountId || undefined,
        subHeadName:        resolvedAccountName,
        expenseAccountName: resolvedAccountName,
        // Bank transfer
        fromAccount: categorizeDraft.fromAccount || "",
        toAccount:   categorizeDraft.toAccount   || "",
        // GST
        gstTreatment: categorizeDraft.gstTreatment || "",
        gstRate:   categorizeDraft.gstRate   !== "" ? Number(categorizeDraft.gstRate)   : null,
        gstAmount: categorizeDraft.gstAmount !== "" ? Number(categorizeDraft.gstAmount) : null,
        // TDS
        tdsApplicable: categorizeDraft.tdsApplicable || false,
        tdsRate:   categorizeDraft.tdsRate   !== "" ? Number(categorizeDraft.tdsRate)   : null,
        tdsAmount: categorizeDraft.tdsAmount !== "" ? Number(categorizeDraft.tdsAmount) : null,
        // Exclusion
        exclusionReason: categorizeDraft.exclusionReason || "",
        // Standard
        referenceNo: categorizeDraft.referenceNo || "",
        remarks:     categorizeDraft.notes       || "",
        // All other category fields
        meta,
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

  // Use stored accountBalance (stable across pagination) — never changes when user flips pages
  const latestBalance = accountBalance ?? 0;
  const totalPages = Math.ceil(totalCount / TABLE_PAGE_SIZE) || 1;
  const pageStart = (tablePage - 1) * TABLE_PAGE_SIZE + 1;
  const pageEnd   = Math.min(tablePage * TABLE_PAGE_SIZE, totalCount);

  const typeCell = (row) => {
    const category = row.category || row.subHeadName || row.headType;
    const party = row.linkedPartyName || row.partyName;
    const isCustomerCat = (row.category || "").toLowerCase().includes("customer");
    const isVendorCat = (row.category || "").toLowerCase().includes("vendor");
    return (
      <Stack spacing={0.2}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
          {category || row.description || "-"}
        </Typography>
        {party && (
          <Typography sx={{ fontSize: 11, color: "#1f6ff2" }}>
            {isCustomerCat ? "Customer" : isVendorCat ? "Vendor" : "Party"}: {party}
          </Typography>
        )}
        {row.fromAccount && (
          <Typography sx={{ fontSize: 11, color: "#1f6ff2" }}>From Account: {row.fromAccount}</Typography>
        )}
        {row.toAccount && (
          <Typography sx={{ fontSize: 11, color: "#667085" }}>To Account: {row.toAccount}</Typography>
        )}
      </Stack>
    );
  };

  const statusCell = (row) => {
    const categorized = Boolean(row.category || row.headType || row.subHeadName || row.linkedPartyName);
    return (
      <Typography sx={{ fontSize: 12, color: categorized ? "#f59e0b" : "#9ca3af", fontWeight: 500 }}>
        {categorized ? "Categorized" : "Manually Added"}
      </Typography>
    );
  };

  const zohoTxnColumns = [
    { key: "date",         header: "Date ↑",         render: (row) => <Typography sx={{ fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>{formatDate(row.transactionDate)}</Typography> },
    { key: "ref",          header: "Reference#",      render: (row) => <Typography sx={{ fontSize: 13, color: "#667085" }}>{row.referenceNo || "-"}</Typography> },
    { key: "type",         header: "Type",            render: (row) => typeCell(row) },
    { key: "status",       header: "Status",          render: (row) => statusCell(row) },
    { key: "deposit",      header: "Deposits",   align: "right",
      render: (row) => row.deposit > 0 ? <Typography sx={{ fontSize: 13, color: "#16a34a" }}>{formatMoney(row.deposit)}</Typography> : <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>-</Typography> },
    { key: "withdrawal",   header: "Withdrawals", align: "right",
      render: (row) => row.withdrawal > 0 ? <Typography sx={{ fontSize: 13, color: "#dc2626" }}>{formatMoney(row.withdrawal)}</Typography> : <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>-</Typography> },
    { key: "balance",      header: "Running Balance", align: "right",
      render: (row) => <Typography sx={{ fontSize: 13, fontWeight: 500, color: (row.balance ?? 0) < 0 ? "#dc2626" : "#111827" }}>{formatMoney(row.balance)}</Typography> },
  ];

  const uncatColumns = [
    { key: "date", header: "Date ↑",         render: (row) => <Typography sx={{ fontSize: 13, whiteSpace: "nowrap" }}>{formatDate(row.transactionDate)}</Typography> },
    { key: "desc", header: "Statement Details", render: (row) => (
      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: 13 }}>Description: {row.description || "-"}</Typography>
        {(row.duplicateCheck?.isDuplicateTransaction) && <Chip size="small" label="Duplicate" color="error" variant="outlined" sx={{ width: "fit-content" }} />}
      </Stack>
    )},
    { key: "deposit",    header: "Deposits",   align: "right", render: (row) => row.deposit > 0 ? formatMoney(row.deposit) : "-" },
    { key: "withdrawal", header: "Withdrawals", align: "right", render: (row) => row.withdrawal > 0 ? formatMoney(row.withdrawal) : "-" },
    { key: "balance",    header: "Running Balance", align: "right", render: (row) => formatMoney(row.balance) },
  ];

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

  const TAB_SX = {
    textTransform: "none",
    minHeight: 48,
    alignItems: "flex-start",
    px: 2,
    py: 0,
    "&.Mui-selected": { color: "#111827" },
  };

  const CategorizePanel = selectedTransaction ? (
    <Paper
      elevation={0}
      sx={{
        width: { xs: "100%", lg: 520 },
        flexShrink: 0,
        borderLeft: { lg: "1px solid #e3e7ef" },
        borderTop: { xs: "1px solid #e3e7ef", lg: 0 },
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        zIndex: 10,
        bgcolor: "#fff",
      }}
    >
      {/* Zoho-style top tabs */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          height: 50,
          px: 2,
          borderBottom: "1px solid #e3e7ef",
          bgcolor: "#fff",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography
            onClick={() => setCategorizeTab("match")}
            sx={{
              height: 50,
              display: "flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: categorizeTab === "match" ? "#111827" : "#4b5872",
              borderBottom:
                categorizeTab === "match"
                  ? "2px solid #4088ff"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            MATCH TRANSACTIONS
          </Typography>

          <Typography
            onClick={() => setCategorizeTab("manual")}
            sx={{
              height: 50,
              display: "flex",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.2,
              color: categorizeTab === "manual" ? "#111827" : "#4b5872",
              borderBottom:
                categorizeTab === "manual"
                  ? "2px solid #4088ff"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            CATEGORIZE MANUALLY
          </Typography>
        </Stack>

        <IconButton size="small" onClick={closeCategorizePanel}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.2 }}>
        {(() => {
          const isDebit = amount.direction === "DEBIT";
          const isCredit = amount.direction === "CREDIT";

          const categories = isDebit
            ? DEBIT_CATEGORIES
            : isCredit
              ? CREDIT_CATEGORIES
              : [...DEBIT_CATEGORIES, ...CREDIT_CATEGORIES];

          const currentCat = categorizeDraft.category;
          const fields = CATEGORY_FIELDS[currentCat] || [];
          const has = (field) => fields.includes(field);
          const isExclude = currentCat === "Exclude / Ignore";

          const showExpenseAccount = has("expenseAccount") || (!currentCat && isDebit);
          const showIncomeAccount = has("incomeAccount") || (!currentCat && isCredit);

          const selectedExpenseAccount = categorizeDraft.expenseAccountId || "";
          const selectedIncomeAccount = categorizeDraft.incomeAccountId || "";

          const commonSelectSx = {
            height: 36,
            fontSize: 13,
            borderRadius: "5px",
            bgcolor: "#fff",
            "& .MuiSelect-select": {
              py: "7px",
            },
          };

          const labelSx = {
            width: 160,
            flexShrink: 0,
            fontSize: 13,
            color: "#ef4444",
            pt: 1,
          };

          const normalLabelSx = {
            width: 160,
            flexShrink: 0,
            fontSize: 13,
            color: "#111827",
            pt: 1,
          };

          const fieldWrapSx = {
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            mb: 1.7,
          };

          const SmallText = ({ children, color = "#667085" }) => (
            <Typography sx={{ fontSize: 12, color }}>{children}</Typography>
          );

          if (categorizeTab === "match") {
            return (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                  Match Transactions UI can be connected here later. Use Categorize
                  Manually for now.
                </Alert>

                <Box
                  sx={{
                    border: "1px dashed #cbd5e1",
                    borderRadius: 1.5,
                    p: 2,
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                    Selected Transaction
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "#667085" }}>
                    {selectedTransaction.description || "-"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 700,
                      mt: 1,
                      color: isDebit ? "#dc2626" : "#16a34a",
                    }}
                  >
                    {moneyWithRupee(amount.amount)}
                  </Typography>
                </Box>
              </Stack>
            );
          }

          return (
            <Stack spacing={0}>
              {/* Category */}
              <Box sx={fieldWrapSx}>
                <Typography sx={labelSx}>Category*</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={currentCat}
                    onChange={(e) => updateCategorizeField("category", e.target.value)}
                    sx={commonSelectSx}
                  >
                    <MenuItem value="">
                      <em style={{ color: "#9ca3af" }}>Select category</em>
                    </MenuItem>

                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Exclude */}
              {isExclude ? (
                <Box sx={fieldWrapSx}>
                  <Typography sx={labelSx}>Reason*</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    value={categorizeDraft.exclusionReason || ""}
                    onChange={(e) => updateCategorizeField("exclusionReason", e.target.value)}
                    placeholder="Enter reason for excluding this transaction"
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: 13,
                        borderRadius: "5px",
                      },
                    }}
                  />
                </Box>
              ) : null}

              {!isExclude ? (
                <>
                  {/* Expense account */}
                  {showExpenseAccount ? (
                    <Box sx={fieldWrapSx}>
                      <Typography sx={labelSx}>Expense Account*</Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          displayEmpty
                          value={selectedExpenseAccount}
                          onChange={(e) => {
                            const match = subHeads.find(
                              (item) => String(getId(item)) === String(e.target.value)
                            );

                            updateCategorizeField("expenseAccountId", e.target.value);
                            updateCategorizeField(
                              "expenseAccountName",
                              match?.name || match?.subHeadName || ""
                            );
                          }}
                          sx={commonSelectSx}
                        >
                          <MenuItem value="">
                            <em style={{ color: "#9ca3af" }}>Select an account</em>
                          </MenuItem>

                          {subHeads.map((item) => (
                            <MenuItem key={getId(item)} value={getId(item)}>
                              {item.name || item.subHeadName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  ) : null}

                  {/* Income account */}
                  {showIncomeAccount ? (
                    <Box sx={fieldWrapSx}>
                      <Typography sx={labelSx}>Income Account*</Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          displayEmpty
                          value={selectedIncomeAccount}
                          onChange={(e) => {
                            const match = subHeads.find(
                              (item) => String(getId(item)) === String(e.target.value)
                            );

                            updateCategorizeField("incomeAccountId", e.target.value);
                            updateCategorizeField(
                              "incomeAccountName",
                              match?.name || match?.subHeadName || ""
                            );
                          }}
                          sx={commonSelectSx}
                        >
                          <MenuItem value="">
                            <em style={{ color: "#9ca3af" }}>Select an account</em>
                          </MenuItem>

                          {subHeads.map((item) => (
                            <MenuItem key={getId(item)} value={getId(item)}>
                              {item.name || item.subHeadName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  ) : null}

                  {/* Itemize */}
                  <Box
                    sx={{
                      ml: "calc(160px + 16px)",
                      mb: 1.7,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      color: "#1f6ff2",
                      cursor: "pointer",
                      width: "fit-content",
                    }}
                  >
                    <TableRowsRoundedIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Itemize</Typography>
                  </Box>

                  {/* Date */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={labelSx}>Date*</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatDate(selectedTransaction.transactionDate)}
                      InputProps={{ readOnly: true }}
                      sx={{
                        "& .MuiInputBase-root": {
                          height: 36,
                          fontSize: 13,
                          borderRadius: "5px",
                          bgcolor: "#fff",
                        },
                      }}
                    />
                  </Box>

                  {/* Amount */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={labelSx}>Amount*</Typography>
                    <Box sx={{ minHeight: 36, display: "flex", alignItems: "center" }}>
                      <Typography
                        sx={{
                          fontSize: 21,
                          fontWeight: 500,
                          color: isDebit ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {moneyWithRupee(amount.amount)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Vendor */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={normalLabelSx}>Vendor</Typography>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={vendorOptions}
                      value={categorizeDraft.vendorParty}
                      getOptionLabel={(option) => option?.name || ""}
                      isOptionEqualToValue={(option, value) => String(option?.id) === String(value?.id)}
                      onChange={(_, value) =>
                        setCategorizeDraft((prev) => ({ ...prev, vendorParty: value }))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select vendor"
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              height: 36,
                              fontSize: 13,
                              borderRadius: "5px",
                            },
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Invoice / Reference */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={normalLabelSx}>Invoice#</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={categorizeDraft.referenceNo || ""}
                      onChange={(e) => updateCategorizeField("referenceNo", e.target.value)}
                      placeholder="Enter invoice/reference number"
                      sx={{
                        "& .MuiInputBase-root": {
                          height: 36,
                          fontSize: 13,
                          borderRadius: "5px",
                        },
                      }}
                    />
                  </Box>

                  {/* Description */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={normalLabelSx}>Description</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={3}
                      value={categorizeDraft.notes || selectedTransaction.description || ""}
                      onChange={(e) => updateCategorizeField("notes", e.target.value)}
                      sx={{
                        "& .MuiInputBase-root": {
                          fontSize: 13,
                          borderRadius: "5px",
                        },
                      }}
                    />
                  </Box>

                  {/* Customer */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={normalLabelSx}>Customer</Typography>
                    <Autocomplete
                      fullWidth
                      size="small"
                      options={customerOptions}
                      value={categorizeDraft.customerParty}
                      getOptionLabel={(option) => option?.name || ""}
                      isOptionEqualToValue={(option, value) => String(option?.id) === String(value?.id)}
                      onChange={(_, value) =>
                        setCategorizeDraft((prev) => ({ ...prev, customerParty: value }))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select customer"
                          size="small"
                          sx={{
                            "& .MuiInputBase-root": {
                              height: 36,
                              fontSize: 13,
                              borderRadius: "5px",
                            },
                          }}
                        />
                      )}
                    />
                  </Box>

                  {/* Bank transfer extra fields */}
                  {has("fromAccount") ? (
                    <Box sx={fieldWrapSx}>
                      <Typography sx={normalLabelSx}>From Account</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={categorizeDraft.fromAccount || ""}
                        onChange={(e) => updateCategorizeField("fromAccount", e.target.value)}
                        placeholder="Source account"
                        sx={{
                          "& .MuiInputBase-root": {
                            height: 36,
                            fontSize: 13,
                            borderRadius: "5px",
                          },
                        }}
                      />
                    </Box>
                  ) : null}

                  {has("toAccount") ? (
                    <Box sx={fieldWrapSx}>
                      <Typography sx={normalLabelSx}>To Account</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={categorizeDraft.toAccount || ""}
                        onChange={(e) => updateCategorizeField("toAccount", e.target.value)}
                        placeholder="Destination account"
                        sx={{
                          "& .MuiInputBase-root": {
                            height: 36,
                            fontSize: 13,
                            borderRadius: "5px",
                          },
                        }}
                      />
                    </Box>
                  ) : null}

                  {/* GST details */}
                  {has("gst") ? (
                    <>
                      <Box sx={fieldWrapSx}>
                        <Typography sx={normalLabelSx}>GST Treatment</Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            displayEmpty
                            value={categorizeDraft.gstTreatment || ""}
                            onChange={(e) => updateCategorizeField("gstTreatment", e.target.value)}
                            sx={commonSelectSx}
                          >
                            <MenuItem value="">
                              <em style={{ color: "#9ca3af" }}>Select</em>
                            </MenuItem>

                            {GST_TREATMENTS.map((item) => (
                              <MenuItem key={item} value={item}>
                                {item}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      <Box sx={fieldWrapSx}>
                        <Typography sx={normalLabelSx}>GST Rate</Typography>
                        <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                          <FormControl fullWidth size="small">
                            <Select
                              displayEmpty
                              value={categorizeDraft.gstRate || ""}
                              onChange={(e) => updateCategorizeField("gstRate", e.target.value)}
                              sx={commonSelectSx}
                            >
                              <MenuItem value="">
                                <em style={{ color: "#9ca3af" }}>Rate</em>
                              </MenuItem>

                              {GST_RATES.map((item) => (
                                <MenuItem key={item} value={item}>
                                  {item}%
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={categorizeDraft.gstAmount || ""}
                            onChange={(e) => updateCategorizeField("gstAmount", e.target.value)}
                            placeholder="GST Amount"
                            sx={{
                              "& .MuiInputBase-root": {
                                height: 36,
                                fontSize: 13,
                                borderRadius: "5px",
                              },
                            }}
                          />
                        </Stack>
                      </Box>
                    </>
                  ) : null}

                  {/* TDS details */}
                  {has("tds") ? (
                    <>
                      <Box sx={fieldWrapSx}>
                        <Typography sx={normalLabelSx}>TDS Applicable</Typography>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 36 }}>
                          <input
                            type="checkbox"
                            checked={categorizeDraft.tdsApplicable || false}
                            onChange={(e) => updateCategorizeField("tdsApplicable", e.target.checked)}
                          />
                          <SmallText>Enable TDS for this transaction</SmallText>
                        </Stack>
                      </Box>

                      {categorizeDraft.tdsApplicable ? (
                        <Box sx={fieldWrapSx}>
                          <Typography sx={normalLabelSx}>TDS Details</Typography>
                          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={categorizeDraft.tdsRate || ""}
                              onChange={(e) => updateCategorizeField("tdsRate", e.target.value)}
                              placeholder="TDS %"
                              sx={{
                                "& .MuiInputBase-root": {
                                  height: 36,
                                  fontSize: 13,
                                  borderRadius: "5px",
                                },
                              }}
                            />

                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={categorizeDraft.tdsAmount || ""}
                              onChange={(e) => updateCategorizeField("tdsAmount", e.target.value)}
                              placeholder="TDS Amount"
                              sx={{
                                "& .MuiInputBase-root": {
                                  height: 36,
                                  fontSize: 13,
                                  borderRadius: "5px",
                                },
                              }}
                            />
                          </Stack>
                        </Box>
                      ) : null}
                    </>
                  ) : null}

                  {/* Reporting tags */}
                  <Box sx={fieldWrapSx}>
                    <Typography sx={normalLabelSx}>Reporting Tags</Typography>
                    <Box
                      sx={{
                        minHeight: 36,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.7,
                        color: "#1f6ff2",
                        cursor: "pointer",
                      }}
                    >
                      <LocalOfferRoundedIcon sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Associate Tags</Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Attach receipt */}
                  <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, color: "#374151", mb: 1, fontWeight: 500 }}>
                      Attach Receipt
                    </Typography>

                    <input
                      id="transaction-receipt-upload"
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setReceiptFile(file);
                      }}
                    />

                    <Button
                      variant="outline"
                      startIcon={<UploadFileRoundedIcon fontSize="small" />}
                      onClick={() => document.getElementById("transaction-receipt-upload")?.click()}
                    >
                      Upload File
                    </Button>

                    {receiptFile ? (
                      <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.8, wordBreak: "break-word" }}>
                        {receiptFile.name}
                      </Typography>
                    ) : null}
                  </Box>
                </>
              ) : null}
            </Stack>
          );
        })()}
      </Box>

      {/* Footer */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-start"
        sx={{
          px: 2,
          py: 1.5,
          borderTop: "1px solid #e3e7ef",
          bgcolor: "#fff",
          flexShrink: 0,
        }}
      >
        <Button
          variant="primary"
          disabled={categorizeSaving}
          startIcon={categorizeSaving ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
          onClick={saveCategorization}
        >
          {categorizeSaving ? "Saving..." : "Save"}
        </Button>

        <Button variant="outline" onClick={closeCategorizePanel} disabled={categorizeSaving}>
          Cancel
        </Button>
      </Stack>
    </Paper>
  ) : null;

  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#fff" }}>

        {/* Zoho-style header */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between"
          sx={{ px: 2, py: 1, borderBottom: "1px solid #e3e7ef", flexShrink: 0, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
                {accountDetail?.accountHolderName || accountNumberMasked || "Bank Account"}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: "#667085" }}>
              Account Number: {accountDetail?.accountNumberMasked || accountNumberMasked || "-"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="primary" onClick={() => { setTablePage(1); setMainTab(1); }}>
              Quick Categorize
            </Button>

            {/* Add Transaction dropdown */}
            <Button variant="outline" endIcon={<span style={{ fontSize: 10 }}>▾</span>}
              onClick={(e) => setAddTxnAnchor(e.currentTarget)}>
              Add Transaction
            </Button>
            <Menu anchorEl={addTxnAnchor} open={Boolean(addTxnAnchor)} onClose={() => setAddTxnAnchor(null)}
              PaperProps={{ sx: { minWidth: 220, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", borderRadius: 2 } }}>
              <ListSubheader sx={{ fontSize: 11, fontWeight: 700, color: "#667085", lineHeight: "28px" }}>MONEY OUT</ListSubheader>
              {DEBIT_CATEGORIES.map((cat) => (
                <MenuItem key={cat} onClick={() => { setAddTxnAnchor(null); }} sx={{ fontSize: 13, py: 0.75 }}>{cat}</MenuItem>
              ))}
              <Divider sx={{ my: 0.5 }} />
              <ListSubheader sx={{ fontSize: 11, fontWeight: 700, color: "#667085", lineHeight: "28px" }}>MONEY IN</ListSubheader>
              {CREDIT_CATEGORIES.map((cat) => (
                <MenuItem key={cat} onClick={() => { setAddTxnAnchor(null); }} sx={{ fontSize: 13, py: 0.75 }}>{cat}</MenuItem>
              ))}
            </Menu>

            <Button variant="outline" onClick={() => setSubHeadModal(true)}>Record Deposit</Button>
            <IconButton size="small" onClick={() => loadTransactions({ reset: true, nextPage: 1 })} sx={{ color: "#667085" }}>
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => navigate("/banks")} sx={{ color: "#667085" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Amount banner */}
        <Box sx={{ px: 2.5, py: 1.25, bgcolor: "#fafbfc", borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AccountBalanceRoundedIcon sx={{ fontSize: 36, color: "#94a3b8" }} />
            <Box>
              <Typography sx={{ fontSize: 12, color: "#667085" }}>Amount in Zoho Books</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 500, color: latestBalance < 0 ? "#dc2626" : "#111827" }}>
                {moneyWithRupee(latestBalance)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Two tabs — no Dashboard */}
        <Tabs value={mainTab} onChange={(_, v) => { setMainTab(v); }}
          sx={{ borderBottom: "1px solid #e3e7ef", flexShrink: 0, bgcolor: "#fff",
            "& .MuiTabs-indicator": { bgcolor: "#1f6ff2" } }}>
          <Tab label={
            <Box sx={{ textAlign: "left" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: mainTab === 0 && totalCount ? "#e11d48" : "inherit" }}>
                Uncategorized Transactions
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#667085" }}>From Bank Statements</Typography>
            </Box>
          } sx={TAB_SX} />
          <Tab label={
            <Box sx={{ textAlign: "left" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>All Transactions</Typography>
              <Typography sx={{ fontSize: 11, color: "#667085" }}>Categorized · In Zoho Books</Typography>
            </Box>
          } sx={TAB_SX} />
        </Tabs>

        {/* Tab content */}
        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Shared pagination footer */}
          {(() => {
            const columns = mainTab === 0 ? uncatColumns : zohoTxnColumns;
            const emptyText = mainTab === 0
              ? "No uncategorized transactions — all categorized!"
              : "No categorized transactions yet.";

            return (
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {/* alignItems: stretch makes both DataTable box and CategorizePanel fill the row height */}
                <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "stretch" }}>
                  <Box sx={{ flex: 1, minWidth: 0, overflow: "auto" }}>
                    <DataTable
                      columns={columns}
                      rows={transactions.map((row, i) => ({
                        ...row,
                        __rowKey: getId(row) || `r-${i}`,
                        __rowSx: rowHighlightSx(row),
                      }))}
                      loading={loadingTransactions}
                      loadingText="Loading transactions..."
                      emptyText={emptyText}
                      minWidth={mainTab === 0 ? 900 : 1050}
                      onRowClick={openCategorizePanel}
                      stickyHeader
                    />
                  </Box>
                  {CategorizePanel}
                </Box>

                {/* Server-side pagination */}
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ px: 2, py: 1, borderTop: "1px solid #e3e7ef", flexShrink: 0, bgcolor: "#fff" }}>
                  <Typography sx={{ fontSize: 13, color: "#667085" }}>
                    Total: <Box component="span" sx={{ color: "#1f6ff2", fontWeight: 500 }}>{totalCount}</Box>
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 13, color: "#667085" }}>{TABLE_PAGE_SIZE} per page</Typography>
                    <IconButton size="small" disabled={tablePage <= 1 || loadingTransactions}
                      onClick={() => setTablePage((p) => p - 1)}>◀</IconButton>
                    <Typography sx={{ fontSize: 13 }}>
                      {totalCount === 0 ? "0" : `${pageStart} – ${pageEnd}`}
                    </Typography>
                    <IconButton size="small" disabled={tablePage >= totalPages || loadingTransactions}
                      onClick={() => setTablePage((p) => p + 1)}>▶</IconButton>
                  </Stack>
                </Stack>
              </Box>
            );
          })()}
        </Box>
      </Box>

      <Modal open={subHeadModal} onClose={() => setSubHeadModal(false)} title="Add Subhead"
        footer={
          <Stack direction="row" spacing={1}>
            <Button variant="outline" onClick={() => setSubHeadModal(false)}>Cancel</Button>
            <Button variant="primary" disabled={actionLoading === "subhead"}
              startIcon={actionLoading === "subhead" ? <CircularProgress size={16} /> : <SaveRoundedIcon />}
              onClick={createSubHead}>Save Subhead</Button>
          </Stack>
        }>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>Subhead is independent and not linked under any Head.</Alert>
          <TextField fullWidth size="small" label="Subhead Name" value={newSubHead.name}
            onChange={(e) => setNewSubHead({ name: e.target.value })}
            placeholder="Example: Rent, Salary, Bank Charges" />
        </Stack>
      </Modal>
    </AppShell>
  );
}
