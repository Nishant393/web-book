import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { invoiceApi, paymentApi } from "../api/customerVendorApi";
import DocumentPdfPreview, { downloadDocumentPdf, formatDate, formatMoney } from "../components/DocumentPdfPreview";

const pickData = (v) => v?.data || v?.result || v || {};
const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.payments)) return v.payments;
  if (Array.isArray(v.data)) return v.data;
  if (v.data && v.data !== v) return safeArray(v.data);
  return [];
};
const getId = (row) => row?._id || row?.id || "";
const partyName = (row) => {
  const c = row?.customerId;
  if (c && typeof c === "object") return c.displayName || c.customerName || c.companyName || c.name || "—";
  return row?.customerSnapshot?.name || "—";
};
const statusColor = (status) => {
  if (status === "DRAFT") return "#64748b";
  if (status === "SENT") return "#2563eb";
  if (status === "PARTIALLY_PAID") return "#d97706";
  if (status === "PAID") return "#16a34a";
  if (status === "CANCELLED") return "#dc2626";
  return "#64748b";
};
function buildEmailCacheKey(type, id) {
  return `moneyiq_send_${type}_${id}`;
}

// ─── Cash Payment Dialog ──────────────────────────────────────────────────────
function CashPaymentDialog({ open, onClose, invoice, onSave, loading }) {
  const balance = Number(invoice?.balanceAmount ?? invoice?.totalAmount ?? 0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(String(balance || ""));
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setNotes("");
    }
  }, [balance, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Record Cash Payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 1.5, bgcolor: "#f8fafc", border: "1px solid #e3e7ef", borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: "#667085" }}>Invoice Balance Due</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatMoney(balance)}</Typography>
            </Stack>
          </Box>
          <TextField size="small" label="Amount Received" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField size="small" label="Payment Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Reference Number" value={reference} onChange={(e) => setReference(e.target.value)} />
          <TextField size="small" label="Notes" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={loading || !Number(amount)}
          onClick={() => onSave({ paymentMode: "CASH", amountReceived: Number(amount), paymentDate: date, referenceNumber: reference, notes })}
        >
          {loading ? "Saving..." : "Save Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Apply Credits Dialog ─────────────────────────────────────────────────────
// Shows individual bank deposit transactions linked to the customer.
// unusedCredits = total deposits − total already applied to invoices (from backend).
function ApplyCreditsDialog({ open, onClose, invoice, creditTransactions, unusedCredits, onApply, loading }) {
  const invoiceBalance = Number(invoice?.balanceAmount ?? invoice?.totalAmount ?? 0);
  const invoiceNumber  = invoice?.invoiceNumber || "Invoice";
  const maxApply       = Math.min(invoiceBalance, unusedCredits);

  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rowAmounts, setRowAmounts]   = useState({});

  useEffect(() => {
    if (open) { setAppliedDate(new Date().toISOString().slice(0, 10)); setRowAmounts({}); }
  }, [open]);

  const totalToCredit  = useMemo(() => Object.values(rowAmounts).reduce((s, v) => s + Number(v || 0), 0), [rowAmounts]);
  const balanceDue     = Math.max(0, invoiceBalance - totalToCredit);

  const setRow = (id, val) => setRowAmounts((prev) => ({ ...prev, [id]: val }));

  const handleApply = () => {
    if (totalToCredit <= 0) { toast.error("Enter at least one credit amount to apply"); return; }
    if (totalToCredit > maxApply) { toast.error(`Cannot apply more than available credit ${formatMoney(maxApply)}`); return; }
    const refs = creditTransactions
      .map((t) => ({ id: getId(t), ref: t.referenceNo || t.description || getId(t), amt: Number(rowAmounts[getId(t)] || 0) }))
      .filter((x) => x.amt > 0)
      .map((x) => `${x.ref} (${formatMoney(x.amt)})`)
      .join("; ");
    onApply({ paymentMode: "CUSTOMER_CREDIT", amountReceived: totalToCredit, paymentDate: appliedDate, referenceNumber: refs, notes: `Credits applied from bank deposits: ${refs}` });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: "10px" } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 15, borderBottom: "1px solid #e3e7ef", py: 1.5, px: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          Apply credits to {invoiceNumber}
          <IconButton size="small" onClick={onClose}><CloseRoundedIcon fontSize="small" /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Sub-header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.4, bgcolor: "#f8fafc", borderBottom: "1px solid #e3e7ef", flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Credits to Apply</Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>Set Applied on Date</Typography>
              <TextField size="small" type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ width: 150, "& .MuiOutlinedInput-root": { fontSize: 13, height: 32 } }} />
            </Stack>
            <Typography sx={{ fontSize: 13, color: "#667085" }}>
              Invoice Balance: <b style={{ color: "#111827" }}>{formatMoney(invoiceBalance)}</b>
              {invoice?.invoiceDate ? <span style={{ color: "#9ca3af" }}> ({formatDate(invoice.invoiceDate)})</span> : null}
            </Typography>
          </Stack>
        </Stack>

        {/* Credit transactions table */}
        {creditTransactions.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center", color: "#94a3b8" }}>
            <Typography sx={{ fontSize: 14 }}>No bank deposits linked to this customer yet.</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>Link bank statement transactions to the customer to create credit balance.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            {/* Header */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 1fr", bgcolor: "#f8fafc", borderBottom: "1px solid #e3e7ef" }}>
              {["TRANSACTION#", "DATE", "CREDIT AMT", "USED", "AVAILABLE", "STATUS", "TO APPLY"].map((h) => (
                <Typography key={h} sx={{ px: 1.5, py: 1.1, fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase" }}>{h}</Typography>
              ))}
            </Box>

            {creditTransactions.map((t) => {
              const id           = getId(t);
              const depositAmt   = Number(t.deposit              || 0);
              const usedAmt      = Number(t.creditUsedAmount     || 0);
              const availAmt     = Number(t.creditAvailableAmount ?? depositAmt); // fallback for old records
              const status       = t.creditStatus || (availAmt >= depositAmt ? "UNUSED" : availAmt <= 0 ? "FULLY_USED" : "PARTIALLY_USED");
              const isFullyUsed  = status === "FULLY_USED" || availAmt <= 0;
              const rowCap       = Math.min(availAmt, maxApply);
              const entered      = rowAmounts[id] ?? "";

              const statusColor  = status === "UNUSED" ? "#16a34a" : status === "PARTIALLY_USED" ? "#d97706" : "#dc2626";
              const statusLabel  = status === "UNUSED" ? "Unused" : status === "PARTIALLY_USED" ? "Partial" : "Used";

              return (
                <Box key={id} sx={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 1fr", alignItems: "center", borderBottom: "1px solid #f0f2f6", opacity: isFullyUsed ? 0.5 : 1, bgcolor: isFullyUsed ? "#fafafa" : "transparent", "&:hover": { bgcolor: isFullyUsed ? "#fafafa" : "#f8fbff" } }}>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: 12, color: "#374151" }} noWrap>
                    {t.referenceNo || (t.description || "").slice(0, 25) || "Bank Deposit"}
                  </Typography>
                  <Typography sx={{ px: 1.5, fontSize: 12 }}>{formatDate(t.transactionDate || t.createdAt)}</Typography>
                  <Typography sx={{ px: 1.5, fontSize: 12, fontWeight: 600 }}>{formatMoney(depositAmt)}</Typography>
                  <Typography sx={{ px: 1.5, fontSize: 12, color: "#dc2626" }}>{usedAmt > 0 ? formatMoney(usedAmt) : "—"}</Typography>
                  <Typography sx={{ px: 1.5, fontSize: 12, fontWeight: 600, color: availAmt > 0 ? "#16a34a" : "#94a3b8" }}>{formatMoney(availAmt)}</Typography>
                  <Box sx={{ px: 1.5 }}>
                    <Box sx={{ display: "inline-block", px: 0.8, py: 0.2, borderRadius: "10px", bgcolor: statusColor + "18", border: `1px solid ${statusColor}40` }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ px: 1.5, py: 0.8 }}>
                    {isFullyUsed ? (
                      <Typography sx={{ fontSize: 12, color: "#94a3b8", textAlign: "right" }}>—</Typography>
                    ) : (
                      <TextField
                        size="small" type="number" placeholder="Enter amount"
                        value={entered}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setRow(id, v > rowCap ? String(rowCap) : e.target.value);
                        }}
                        inputProps={{ min: 0, max: rowCap, step: "0.01", style: { textAlign: "right", fontSize: 12 } }}
                        sx={{ "& .MuiOutlinedInput-root": { height: 30, borderRadius: "6px" } }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Summary */}
        <Box sx={{ px: 3, py: 2, borderTop: "1px solid #e3e7ef" }}>
          <Stack direction="row" justifyContent="flex-end">
            <Stack spacing={0.8} sx={{ minWidth: 260 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: "#667085" }}>Amount to Credit:</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#2563eb" }}>{formatMoney(totalToCredit)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: "#667085" }}>Invoice Balance Due:</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: balanceDue > 0 ? "#d97706" : "#16a34a" }}>{formatMoney(balanceDue)}</Typography>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e3e7ef" }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={loading || totalToCredit <= 0 || totalToCredit > maxApply} onClick={handleApply}>
          {loading ? "Applying..." : "Apply Credits"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [unusedCredits, setUnusedCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [cashOpen, setCashOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState(null);

  const loadList = useCallback(async () => {
    try {
      const res = await invoiceApi.list({ limit: 500 });
      const data = pickData(res);
      const list = safeArray(data.items || data);
      setRows(list);
      if (!invoiceId && list[0]) navigate(`/invoices/${getId(list[0])}`, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load invoices");
    }
  }, [invoiceId, navigate]);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await invoiceApi.getById(invoiceId);
      const data = pickData(res);
      setInvoice(data.invoice || data);
      setPayments(safeArray(data.payments || []));
      setCreditTransactions(safeArray(data.creditTransactions || []));
      setUnusedCredits(Number(data.unusedCredits ?? 0));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const selectedId = getId(invoice);
  const status = invoice?.status || "DRAFT";
  const selectedInList = useMemo(() => rows.find((r) => getId(r) === invoiceId), [invoiceId, rows]);
  const typeLabel = invoice?.invoiceType === "TAX_INVOICE" || status === "PAID" ? "TAX INVOICE" : "PROFORMA INVOICE";
  const creditBalance = unusedCredits; // computed by backend: bankDeposits − creditApplied
  const isPaid = status === "PAID";
  const isSent = status === "SENT" || status === "PARTIALLY_PAID";
  const isDraft = status === "DRAFT";


  const handleMarkAsSent = async () => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await invoiceApi.update(selectedId, { status: "SENT" });
      toast.success("Invoice marked as sent");
      await Promise.all([loadInvoice(), loadList()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (payload) => {
    if (!invoice) return;
    setActionLoading(true);
    try {
      await paymentApi.create({ invoiceId: selectedId, ...payload });
      toast.success("Payment recorded");
      setCashOpen(false);
      setCreditOpen(false);
      await Promise.all([loadInvoice(), loadList()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to record payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = () => {
    if (!invoice) return;
    sessionStorage.setItem(buildEmailCacheKey("invoice", selectedId), JSON.stringify({
      mode: "invoice",
      documentId: selectedId,
      apiDocument: invoice,
      selectedParty: invoice.customerId,
      partyName: partyName(invoice),
      partyEmail: invoice.customerId?.email || invoice.customerSnapshot?.email || "",
      items: invoice.items || [],
      createdAt: new Date().toISOString(),
    }));
    navigate(`/send-email?type=invoice&id=${selectedId}`);
  };

  const handleDownload = () => {
    if (invoice) downloadDocumentPdf({ type: "invoice", doc: invoice, title: typeLabel });
  };

  return (
    <AppShell>
      <Box sx={{ height: "100%", display: "flex", bgcolor: "#f8fafc", overflow: "hidden" }}>

        {/* ── Sidebar list ── */}
        <Box sx={{ width: 365, flexShrink: 0, bgcolor: "#fff", borderRight: "1px solid #dfe4ef", display: "flex", flexDirection: "column" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 57, px: 2, borderBottom: "1px solid #e5e7eb" }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>All Invoices</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => navigate("/invoices/new")} sx={{ minWidth: 34, px: 1 }}><AddRoundedIcon sx={{ fontSize: 17 }} /></Button>
              <IconButton onClick={loadList} sx={{ border: "1px solid #d7dce8", borderRadius: "6px" }}><MoreHorizRoundedIcon /></IconButton>
            </Stack>
          </Stack>
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {rows.map((row) => {
              const id = getId(row);
              const active = id === invoiceId;
              return (
                <Stack key={id} direction="row" onClick={() => navigate(`/invoices/${id}`)} sx={{ px: 1.8, py: 1.25, gap: 1.2, borderBottom: "1px solid #edf0f6", bgcolor: active ? "#f1f3ff" : "#fff", cursor: "pointer", "&:hover": { bgcolor: "#f8fbff" } }}>
                  <Checkbox size="small" checked={active} onChange={() => {}} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{partyName(row)}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>{formatMoney(row.totalAmount)}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: "#4b5872", mt: 0.3 }} noWrap>
                      {row.invoiceNumber || "—"} • {formatDate(row.invoiceDate)}
                      {row.salesOrderNumber ? ` • ${row.salesOrderNumber}` : ""}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: statusColor(row.status), mt: 0.4 }}>{row.status || "DRAFT"}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Box>
        </Box>

        {/* ── Detail panel ── */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "#fff" }}>

          {/* Title bar */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 57, px: 2, borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{invoice?.invoiceNumber || selectedInList?.invoiceNumber || "Invoice"}</Typography>
              {status ? (
                <Box sx={{ px: 1.2, py: 0.3, borderRadius: "12px", bgcolor: statusColor(status) + "18", border: `1px solid ${statusColor(status)}40` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: statusColor(status) }}>{status}</Typography>
                </Box>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Attachment"><IconButton sx={{ border: "1px solid #d7dce8", borderRadius: "6px" }}><AttachFileRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Close"><IconButton onClick={() => navigate("/invoices")}><CloseRoundedIcon fontSize="small" sx={{ color: "#ef4444" }} /></IconButton></Tooltip>
            </Stack>
          </Stack>

          {/* Action toolbar */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 45, px: 2, borderBottom: "1px solid #e5e7eb", bgcolor: "#fbfcff", flexShrink: 0 }}>
            <Button variant="text" startIcon={<EditRoundedIcon fontSize="small" />} onClick={() => navigate(`/invoices/${selectedId}/edit`)}>Edit</Button>
            <Divider orientation="vertical" flexItem />
            <Button variant="text" startIcon={<MailOutlineRoundedIcon fontSize="small" />} onClick={handleSendEmail}>Send Email</Button>
            <Divider orientation="vertical" flexItem />
            <Button variant="text" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={handleDownload}>PDF/Print</Button>
            <Divider orientation="vertical" flexItem />
            {isDraft ? (
              <Button variant="text" startIcon={<SendRoundedIcon fontSize="small" />} disabled={actionLoading} onClick={handleMarkAsSent}>Send Invoice</Button>
            ) : null}
            {isSent ? (
              <>
                <Button variant="text" startIcon={<PaymentRoundedIcon fontSize="small" />} onClick={() => setCashOpen(true)}>Record Payment</Button>
                {creditBalance > 0 ? (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Button variant="text" startIcon={<CreditCardRoundedIcon fontSize="small" />} onClick={() => setCreditOpen(true)}>Apply Credits</Button>
                  </>
                ) : null}
              </>
            ) : null}
            <IconButton size="small" onClick={(e) => setMoreAnchor(e.currentTarget)}><MoreHorizRoundedIcon fontSize="small" /></IconButton>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
              <MenuItem onClick={() => { setMoreAnchor(null); loadInvoice(); loadList(); }}>Refresh</MenuItem>
              <MenuItem onClick={() => { setMoreAnchor(null); handleDownload(); }}>Download PDF</MenuItem>
            </Menu>
          </Stack>

          {/* What's Next section */}
          <Box sx={{ px: 3, py: 1.8, borderBottom: "1px solid #edf0f6", flexShrink: 0 }}>
            <Stack spacing={1.2}>
              {isDraft ? (
                <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", p: 1.5, bgcolor: "#fffbf0" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Typography sx={{ fontSize: 13 }}>
                      <b>WHAT'S NEXT?</b> Send this invoice to the customer to make it receivable.
                    </Typography>
                    <Button disabled={actionLoading} onClick={handleMarkAsSent} startIcon={<SendRoundedIcon fontSize="small" />}>
                      {actionLoading ? "Sending..." : "Send Invoice"}
                    </Button>
                  </Stack>
                </Box>
              ) : null}

              {isSent ? (
                <>
                  {creditBalance > 0 ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CreditCardRoundedIcon sx={{ fontSize: 16, color: "#2563eb" }} />
                      <Typography sx={{ fontSize: 13 }}>
                        <b>Credits Available:</b> {formatMoney(creditBalance)}
                      </Typography>
                      <Box
                        component="span"
                        sx={{ fontSize: 13, color: "#2563eb", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
                        onClick={() => setCreditOpen(true)}
                      >
                        Apply Now
                      </Box>
                    </Stack>
                  ) : null}
                  <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", p: 1.5, bgcolor: "#f8fbff" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Typography sx={{ fontSize: 13 }}>
                        <b>WHAT'S NEXT?</b> Invoice has been sent. Record payment as soon as you receive it.
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {creditBalance > 0 ? (
                          <Button variant="outline" onClick={() => setCreditOpen(true)} startIcon={<CreditCardRoundedIcon fontSize="small" />}>Apply Credits</Button>
                        ) : null}
                        <Button onClick={() => setCashOpen(true)} startIcon={<PaymentRoundedIcon fontSize="small" />}>Record Payment</Button>
                      </Stack>
                    </Stack>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                    Get paid faster by setting up payment gateways or displaying a UPI QR code.
                  </Typography>
                </>
              ) : null}

              {isPaid ? (
                <Box sx={{ border: "1px solid #dcfce7", bgcolor: "#f0fdf4", borderRadius: "6px", p: 1.5 }}>
                  <Typography sx={{ fontSize: 13, color: "#166534" }}>
                    <b>Paid.</b> This document is now a Tax Invoice.
                  </Typography>
                </Box>
              ) : null}
            </Stack>
          </Box>

          {/* PDF toggle */}
          <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ px: 3, py: 1 }}>
            <Typography sx={{ fontSize: 13, mr: 1, color: "#667085" }}>Show PDF View</Typography>
            <Switch checked={showPdf} onChange={(e) => setShowPdf(e.target.checked)} size="small" />
          </Stack>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: "auto", bgcolor: "#f8fafc" }}>
            {loading ? (
              <Box sx={{ height: 300, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
            ) : invoice ? (
              showPdf ? (
                <DocumentPdfPreview type="invoice" doc={invoice} title={typeLabel} />
              ) : (
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>Payment History</Typography>
                  {payments.length ? payments.map((p) => (
                    <Stack key={getId(p)} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.4, border: "1px solid #e3e7ef", borderRadius: 1, mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.paymentNumber || "Payment"}</Typography>
                        <Typography sx={{ fontSize: 12, color: "#667085" }}>{p.paymentMode} • {formatDate(p.paymentDate)}</Typography>
                        {p.referenceNumber ? <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>Ref: {p.referenceNumber}</Typography> : null}
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{formatMoney(p.amountReceived)}</Typography>
                    </Stack>
                  )) : (
                    <Typography sx={{ color: "#94a3b8", fontSize: 14 }}>No payments recorded yet.</Typography>
                  )}
                </Box>
              )
            ) : (
              <Box sx={{ p: 4, color: "#94a3b8" }}>Select an invoice.</Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <CashPaymentDialog
        open={cashOpen}
        onClose={() => setCashOpen(false)}
        invoice={invoice}
        onSave={handleRecordPayment}
        loading={actionLoading}
      />
      <ApplyCreditsDialog
        open={creditOpen}
        onClose={() => setCreditOpen(false)}
        invoice={invoice}
        creditTransactions={creditTransactions}
        unusedCredits={unusedCredits}
        onApply={handleRecordPayment}
        loading={actionLoading}
      />
    </AppShell>
  );
}
