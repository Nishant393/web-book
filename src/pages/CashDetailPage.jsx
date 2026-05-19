import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Box, Chip, Divider, Grid, IconButton, MenuItem, Paper,
  Stack, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { cashApi } from "../api/bankLedgerApi";
import { customerApi, vendorApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";

const MONEY_IN = [
  "Customer Advance", "Customer Payment", "Transfer From Another Account",
  "Interest Income", "Other Income", "Expense Refund",
  "Deposit From Other Accounts", "Owner's Contribution",
  "Vendor Credit Refund", "Vendor Payment Refund",
];

const MONEY_OUT = [
  "Expense", "Vendor Advance", "Vendor Payment",
  "Transfer To Another Account", "Card Payment",
  "Owner Drawings", "Deposit To Other Accounts",
  "Credit Note Refund", "Payment Refund",
];

// Fields shown per transaction type
const TYPE_FIELDS = {
  "Customer Advance":             ["customer","bankCharges","receivedVia","referenceNo"],
  "Customer Payment":             ["customer","invoiceNo","referenceNo"],
  "Transfer From Another Account":["fromAccount","referenceNo"],
  "Interest Income":              ["referenceNo"],
  "Other Income":                 ["referenceNo"],
  "Expense Refund":               ["vendor","referenceNo"],
  "Deposit From Other Accounts":  ["fromAccount","referenceNo"],
  "Owner's Contribution":         ["referenceNo"],
  "Vendor Credit Refund":         ["vendor","referenceNo"],
  "Vendor Payment Refund":        ["vendor","invoiceNo","referenceNo"],
  "Expense":                      ["expenseAccount","vendor","invoiceNo","referenceNo","customer"],
  "Vendor Advance":               ["vendor","referenceNo"],
  "Vendor Payment":               ["vendor","invoiceNo","referenceNo"],
  "Transfer To Another Account":  ["toAccount","referenceNo"],
  "Card Payment":                 ["referenceNo"],
  "Owner Drawings":               ["referenceNo"],
  "Deposit To Other Accounts":    ["toAccount","referenceNo"],
  "Credit Note Refund":           ["customer","referenceNo"],
  "Payment Refund":               ["customer","invoiceNo","referenceNo"],
};

const RECEIVED_VIA = ["Cash","Cheque","Bank Transfer","UPI","NEFT","RTGS","IMPS","Other"];

const emptyForm = {
  type: "", date: new Date().toISOString().slice(0,10),
  amount: "", referenceNo: "", description: "",
  customer: "", vendor: "", invoiceNo: "",
  expenseAccount: "", toAccount: "", fromAccount: "",
  bankCharges: "", receivedVia: "",
};

const money = (v) =>
  Number(v || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const dateText = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" });
};

const safeArray = (v) => Array.isArray(v) ? v : (v?.items || v?.data || []);
const pickData  = (v) => v?.data || v?.result || v || {};
const getId     = (r) => r?._id || r?.id || "";

// --- Field input helper ---
function FieldRow({ label, required, children }) {
  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid item xs={12} md={3.5}>
        <Typography sx={{ fontSize: 13, color: required ? "#e11d48" : "#374151", fontWeight: 400 }}>
          {label}{required ? "*" : ""}
        </Typography>
      </Grid>
      <Grid item xs={12} md={8.5}>{children}</Grid>
    </Grid>
  );
}

function FInput({ value, onChange, type="text", select, children, placeholder, multiline, rows=2 }) {
  return (
    <TextField fullWidth size="small" type={type} select={select} value={value ?? ""} placeholder={placeholder}
      multiline={multiline} minRows={multiline ? rows : undefined}
      onChange={(e) => onChange(e.target.value)}
      sx={{ "& .MuiOutlinedInput-root": { fontSize: 13, height: multiline ? "auto" : 34, borderRadius: "5px" } }}
    >
      {children}
    </TextField>
  );
}

// --- Add Transaction modal ---
function AddTransactionModal({ open, onClose, onSave, saving, customers, vendors }) {
  const [form, setForm] = useState(emptyForm);
  const [direction, setDirection] = useState("in");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (open) { setForm(emptyForm); setDirection("in"); }
  }, [open]);

  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const selectType = (type, dir) => {
    patch("type", type);
    setDirection(dir);
    setMenuOpen(false);
  };

  const fields = TYPE_FIELDS[form.type] || [];
  const has = (f) => fields.includes(f);

  const handleSave = () => {
    if (!form.type) return toast.error("Select a transaction type");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    onSave({ ...form, amount: Number(form.amount), bankCharges: Number(form.bankCharges || 0) });
  };

  return (
    <Modal open={open} onClose={onClose} title={form.type || "Add Transaction"} size="md"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width:"100%" }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !form.type}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2} sx={{ pt: 0.5 }}>
        {/* Type selector */}
        {!form.type ? (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#697386", textTransform: "uppercase", mb: 1 }}>
                  Money In
                </Typography>
                {MONEY_IN.map((t) => (
                  <Box key={t} onClick={() => selectType(t, "in")}
                    sx={{ px: 1.5, py: 1, cursor: "pointer", fontSize: 13, borderRadius: "4px",
                      "&:hover": { bgcolor: "#eaf2ff", color: "#1f6ff2" } }}>
                    {t}
                  </Box>
                ))}
              </Grid>
              <Divider orientation="vertical" flexItem />
              <Grid item xs={12} md={5.8}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#697386", textTransform: "uppercase", mb: 1 }}>
                  Money Out
                </Typography>
                {MONEY_OUT.map((t) => (
                  <Box key={t} onClick={() => selectType(t, "out")}
                    sx={{ px: 1.5, py: 1, cursor: "pointer", fontSize: 13, borderRadius: "4px",
                      "&:hover": { bgcolor: "#fff2f0", color: "#e11d48" } }}>
                    {t}
                  </Box>
                ))}
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={direction === "in" ? "Money In" : "Money Out"}
                size="small"
                sx={{ bgcolor: direction === "in" ? "#e6f4ea" : "#fdecea", color: direction === "in" ? "#1e7e34" : "#c0392b", fontSize: 12 }}
              />
              <Chip label={form.type} size="small" variant="outlined" sx={{ fontSize: 12 }} />
              <Button variant="text" onClick={() => patch("type", "")} sx={{ fontSize: 12 }}>Change</Button>
            </Stack>

            <FieldRow label="Date" required>
              <FInput type="date" value={form.date} onChange={(v) => patch("date", v)} />
            </FieldRow>

            <FieldRow label="Amount" required>
              <FInput type="number" value={form.amount} onChange={(v) => patch("amount", v)} placeholder="0.00" />
            </FieldRow>

            {has("customer") && (
              <FieldRow label="Customer">
                <FInput select value={form.customer} onChange={(v) => patch("customer", v)}>
                  <MenuItem value=""><em>Select customer</em></MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={getId(c)} value={c.displayName || c.customerName}>{c.displayName || c.customerName}</MenuItem>
                  ))}
                </FInput>
              </FieldRow>
            )}

            {has("vendor") && (
              <FieldRow label="Vendor">
                <FInput select value={form.vendor} onChange={(v) => patch("vendor", v)}>
                  <MenuItem value=""><em>Select vendor</em></MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={getId(v)} value={v.displayName || v.vendorName}>{v.displayName || v.vendorName}</MenuItem>
                  ))}
                </FInput>
              </FieldRow>
            )}

            {has("expenseAccount") && (
              <FieldRow label="Expense Account" required>
                <FInput value={form.expenseAccount} onChange={(v) => patch("expenseAccount", v)} placeholder="Select an account" />
              </FieldRow>
            )}

            {has("invoiceNo") && (
              <FieldRow label="Invoice#">
                <FInput value={form.invoiceNo} onChange={(v) => patch("invoiceNo", v)} />
              </FieldRow>
            )}

            {has("referenceNo") && (
              <FieldRow label="Reference#">
                <FInput value={form.referenceNo} onChange={(v) => patch("referenceNo", v)} />
              </FieldRow>
            )}

            {has("toAccount") && (
              <FieldRow label="To Account">
                <FInput value={form.toAccount} onChange={(v) => patch("toAccount", v)} placeholder="Account name" />
              </FieldRow>
            )}

            {has("fromAccount") && (
              <FieldRow label="From Account">
                <FInput value={form.fromAccount} onChange={(v) => patch("fromAccount", v)} placeholder="Account name" />
              </FieldRow>
            )}

            {has("bankCharges") && (
              <FieldRow label="Bank Charges">
                <FInput type="number" value={form.bankCharges} onChange={(v) => patch("bankCharges", v)} placeholder="0.00" />
              </FieldRow>
            )}

            {has("receivedVia") && (
              <FieldRow label="Received Via">
                <FInput select value={form.receivedVia} onChange={(v) => patch("receivedVia", v)}>
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {RECEIVED_VIA.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </FInput>
              </FieldRow>
            )}

            <FieldRow label="Description">
              <FInput multiline rows={2} value={form.description} onChange={(v) => patch("description", v)}
                placeholder="Add a description" />
            </FieldRow>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

// --- Main page ---
export default function CashDetailPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [tab, setTab] = useState(0);
  const [txns, setTxns] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDirection, setAddDirection] = useState("in");
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, custRes, vendRes] = await Promise.allSettled([
        cashApi.list({ limit: 500, sort: "date:-1" }),
        customerApi.list({ limit: 500 }),
        vendorApi.list({ limit: 500 }),
      ]);
      if (res.status === "fulfilled") {
        const data = pickData(res.value);
        setTxns(safeArray(data.items || data));
        setBalance(data.balance ?? 0);
      }
      if (custRes.status === "fulfilled") setCustomers(safeArray(pickData(custRes.value).items || pickData(custRes.value)));
      if (vendRes.status === "fulfilled") setVendors(safeArray(pickData(vendRes.value).items || pickData(vendRes.value)));
    } catch (e) {
      toast.error("Failed to load cash transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      await cashApi.create(payload);
      toast.success("Transaction added");
      setAddOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to add transaction");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (txnId) => {
    try {
      await cashApi.delete(txnId);
      toast.success("Transaction deleted");
      await load();
    } catch {
      toast.error("Failed to delete transaction");
    }
  };

  const totalIn  = useMemo(() => txns.filter((t) => t.direction === "in").reduce((a, t) => a + t.amount, 0), [txns]);
  const totalOut = useMemo(() => txns.filter((t) => t.direction === "out").reduce((a, t) => a + t.amount, 0), [txns]);

  const columns = [
    { key: "date",           header: "Date",            render: (r) => dateText(r.date) },
    { key: "referenceNo",    header: "Reference#",       render: (r) => r.referenceNo || "-" },
    { key: "type",           header: "Type",             render: (r) => (
      <Stack spacing={0.25}>
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{r.type}</Typography>
        <Typography sx={{ fontSize: 11, color: "#667085" }}>
          {r.customer || r.vendor || r.expenseAccount || ""}
        </Typography>
      </Stack>
    )},
    { key: "status",         header: "Status",           render: (r) => (
      <Chip size="small" label={r.status || "Manually Added"} variant="outlined"
        sx={{ fontSize: 11, color: "#667085", borderColor: "#e3e7ef" }} />
    )},
    { key: "deposit",        header: "Deposits",   align: "right",
      render: (r) => r.direction === "in"  ? <Typography sx={{ fontSize: 13, color: "#16a34a" }}>{money(r.amount)}</Typography> : "" },
    { key: "withdrawal",     header: "Withdrawals", align: "right",
      render: (r) => r.direction === "out" ? <Typography sx={{ fontSize: 13, color: "#dc2626" }}>{money(r.amount)}</Typography> : "" },
    { key: "runningBalance", header: "Running Balance", align: "right",
      render: (r) => <Typography sx={{ fontSize: 13, fontWeight: 500, color: (r.runningBalance ?? 0) < 0 ? "#dc2626" : "#111827" }}>{money(r.runningBalance)}</Typography> },
    { key: "actions", header: "", align: "right", render: (r) => (
      <IconButton size="small" onClick={() => handleDelete(getId(r))} sx={{ color: "#9ca3af", "&:hover": { color: "#ef4444" } }}>
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    )},
  ];

  const TAB_SX = { fontSize: 13, textTransform: "none", minHeight: 42, "&.Mui-selected": { color: "#1f6ff2", fontWeight: 600 } };

  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={{ width: "100%", height: "100%", bgcolor: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between"
          sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: "#f0f9ff", color: "#0ea5e9", display: "grid", placeItems: "center" }}>
              <AccountBalanceWalletRoundedIcon />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 18, fontWeight: 500 }}>Petty Cash</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#667085" }}>Account Number: CASH-001</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: { xs: 1.5, sm: 0 } }}>
            <Button variant="outline" startIcon={loading ? undefined : <RefreshRoundedIcon />} onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button variant="primary" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
              Add Transaction
            </Button>
          </Stack>
        </Stack>

        {/* Amount banner */}
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#fafbfc", borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountBalanceWalletRoundedIcon sx={{ fontSize: 32, color: "#94a3b8" }} />
            <Box>
              <Typography sx={{ fontSize: 12, color: "#667085" }}>Amount in Books</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 500, color: balance < 0 ? "#dc2626" : "#111827" }}>
                {money(balance)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1, flexShrink: 0, borderBottom: "1px solid #e3e7ef", "& .MuiTabs-indicator": { bgcolor: "#1f6ff2" } }}>
          <Tab label="Dashboard" sx={TAB_SX} />
          <Tab label="Transactions" sx={TAB_SX} />
        </Tabs>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {/* Dashboard tab */}
          {tab === 0 && (
            <Box sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 500, mb: 2 }}>Account Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#e3e7ef" }}>
                    <Typography sx={{ fontSize: 12, color: "#667085", mb: 0.5 }}>Current Balance</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, color: balance < 0 ? "#dc2626" : "#16a34a" }}>
                      {money(balance)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#e3e7ef" }}>
                    <Typography sx={{ fontSize: 12, color: "#667085", mb: 0.5 }}>Total Money In</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#16a34a" }}>{money(totalIn)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: "#e3e7ef" }}>
                    <Typography sx={{ fontSize: 12, color: "#667085", mb: 0.5 }}>Total Money Out</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, color: "#dc2626" }}>{money(totalOut)}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 1.5 }}>Recent Transactions</Typography>
                <DataTable
                  columns={columns.slice(0, -1)}
                  rows={txns.slice(0, 10)}
                  loading={loading}
                  emptyText="No transactions yet. Click Add Transaction to record one."
                />
              </Box>
            </Box>
          )}

          {/* Transactions tab */}
          {tab === 1 && (
            <Box sx={{ p: { xs: 1, md: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 500 }}>
                  All Transactions
                  <Chip size="small" label={`${txns.length} records`} sx={{ ml: 1, fontSize: 11 }} />
                </Typography>
                <Button variant="primary" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
                  Add Transaction
                </Button>
              </Stack>
              <DataTable
                columns={columns}
                rows={txns}
                loading={loading}
                emptyText="No transactions found."
                stickyHeader
              />
            </Box>
          )}
        </Box>
      </Box>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleSave}
        saving={saving}
        customers={customers}
        vendors={vendors}
      />
    </AppShell>
  );
}
