import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
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
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { proformaInvoiceApi } from "../api/customerVendorApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pickData = (v) => v?.data || v?.result || v || {};
const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.data)) return v.data;
  return [];
};
const getId = (r) => String(r?._id || r?.id || "");

const fmt = (date) => {
  if (!date) return "—";
  try { return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return "—"; }
};

const money = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "₹0.00";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
};

const partyName = (pi) => {
  const c = pi?.customerId;
  if (c && typeof c === "object") return c.displayName || c.customerName || c.companyName || "";
  return pi?.customerSnapshot?.name || "";
};

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    UNPAID:          { label: "Unpaid",          bg: "#fef9c3", color: "#854d0e" },
    PARTIALLY_PAID:  { label: "Partially Paid",  bg: "#fff7ed", color: "#c2410c" },
    PAID:            { label: "Paid",            bg: "#f0fdf4", color: "#16a34a" },
    NOT_CREATED:     { label: "Not Created",     bg: "#f3f4f6", color: "#9ca3af" },
    CREATED:         { label: "Created",         bg: "#eff6ff", color: "#2563eb" },
    DRAFT:           { label: "Draft",           bg: "#f3f4f6", color: "#6b7280" },
    SENT:            { label: "Sent",            bg: "#eff6ff", color: "#2563eb" },
    CANCELLED:       { label: "Cancelled",       bg: "#fef2f2", color: "#dc2626" },
  };
  const c = map[status] || { label: status || "—", bg: "#f3f4f6", color: "#6b7280" };
  return (
    <Box component="span"
      sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: "4px", fontSize: 11, fontWeight: 700,
        bgcolor: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {c.label}
    </Box>
  );
}

// ─── Payment Summary Card ─────────────────────────────────────────────────────

function PaymentSummaryCard({ proforma }) {
  const total    = Number(proforma?.totalAmount   || 0);
  const received = Number(proforma?.paymentReceived || 0);
  const balance  = Math.max(total - received, 0);
  const pct      = total > 0 ? Math.min((received / total) * 100, 100) : 0;

  return (
    <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "10px", p: 2.5, mb: 2, bgcolor: "#fafbfc" }}>
      <Stack direction="row" spacing={3} flexWrap="wrap">
        <Box sx={{ flex: 1, minWidth: 130 }}>
          <Typography sx={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, mb: 0.5 }}>Total Amount</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{money(total)}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 130 }}>
          <Typography sx={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, mb: 0.5 }}>Payment Received</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{money(received)}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 130 }}>
          <Typography sx={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, mb: 0.5 }}>Receivable Amount</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: balance > 0 ? "#c2410c" : "#16a34a" }}>{money(balance)}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <StatusChip status={proforma?.paymentStatus || "UNPAID"} />
        </Box>
      </Stack>

      {/* Progress bar */}
      <Box sx={{ mt: 2, bgcolor: "#e5e7eb", borderRadius: "4px", height: 6, overflow: "hidden" }}>
        <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: pct >= 100 ? "#22c55e" : "#4088ff", transition: "width 0.4s ease" }} />
      </Box>
      <Typography sx={{ fontSize: 11, color: "#9ca3af", mt: 0.5 }}>{pct.toFixed(0)}% paid</Typography>
    </Box>
  );
}

// ─── PDF Preview ──────────────────────────────────────────────────────────────

function PdfPreview({ proforma, companyName }) {
  const snap = proforma?.customerSnapshot || {};
  const customer = proforma?.customerId;
  const customerDisplayName = (customer && typeof customer === "object")
    ? (customer.displayName || customer.customerName || customer.companyName || snap.name || "")
    : snap.name || "";
  const billingAddr = (customer && typeof customer === "object" && customer.billingAddress)
    ? (typeof customer.billingAddress === "object"
        ? [customer.billingAddress.address, customer.billingAddress.city, customer.billingAddress.state].filter(Boolean).join(", ")
        : customer.billingAddress)
    : snap.billingAddress || "";
  const items = proforma?.items || [];
  const total    = Number(proforma?.totalAmount   || 0);
  const received = Number(proforma?.paymentReceived || 0);
  const balance  = Math.max(total - received, 0);

  return (
    <Box sx={{ m: 2, border: "1px solid #e0e0e0", borderRadius: "4px", fontFamily: "Arial, sans-serif", fontSize: 13, color: "#222", bgcolor: "#fff" }}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{companyName || "Company"}</Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: "#222", letterSpacing: 1 }}>PROFORMA INVOICE</Typography>
            <Typography sx={{ fontSize: 12, color: "#888", mt: 0.25, fontStyle: "italic" }}>
              This is not a Tax Invoice. Subject to payment.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", mb: 0.5 }}>Bill To</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{customerDisplayName}</Typography>
            {billingAddr && <Typography sx={{ fontSize: 12, color: "#555", mt: 0.25, maxWidth: 200 }}>{billingAddr}</Typography>}
            {snap.gstNumber && <Typography sx={{ fontSize: 11, color: "#888", mt: 0.25 }}>GSTIN: {snap.gstNumber}</Typography>}
          </Box>
          <Box sx={{ textAlign: "right" }}>
            {[
              ["Proforma Invoice#", proforma?.proformaNumber || "—"],
              ["Invoice Date", fmt(proforma?.invoiceDate)],
              ["Sales Order#", proforma?.salesOrderNumber || "—"],
            ].map(([label, val]) => (
              <Stack key={label} direction="row" justifyContent="flex-end" gap={2} sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: "#888" }}>{label} :</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#222", minWidth: 80, textAlign: "right" }}>{val}</Typography>
              </Stack>
            ))}
          </Box>
        </Stack>

        {/* Items */}
        <Box sx={{ border: "1px solid #ddd", borderRadius: "3px", overflow: "hidden", mb: 2 }}>
          <Box sx={{ bgcolor: "#222", color: "#fff", display: "grid", gridTemplateColumns: "2rem 1fr 5rem 5rem 6rem", px: 1.5, py: 1 }}>
            {["#", "Item & Description", "Qty", "Rate", "Amount"].map((h) => (
              <Typography key={h} sx={{ fontSize: 11, fontWeight: 700 }}>{h}</Typography>
            ))}
          </Box>
          {items.length === 0 ? (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>No items</Typography>
            </Box>
          ) : (
            items.map((item, idx) => (
              <Box key={idx} sx={{
                display: "grid", gridTemplateColumns: "2rem 1fr 5rem 5rem 6rem",
                px: 1.5, py: 1, borderBottom: "1px solid #f0f0f0",
                bgcolor: idx % 2 === 0 ? "#fff" : "#fafafa",
              }}>
                <Typography sx={{ fontSize: 12 }}>{idx + 1}</Typography>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{item.itemDetails || "—"}</Typography>
                  {item.hsnOrSac && <Typography sx={{ fontSize: 10, color: "#aaa" }}>HSN: {item.hsnOrSac}</Typography>}
                </Box>
                <Typography sx={{ fontSize: 12 }}>{item.quantity ?? "—"}</Typography>
                <Typography sx={{ fontSize: 12 }}>{Number(item.rate || 0).toFixed(2)}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{Number(item.amount || 0).toFixed(2)}</Typography>
              </Box>
            ))
          )}
        </Box>

        {/* Totals */}
        <Stack direction="row" justifyContent="flex-end">
          <Box sx={{ minWidth: 260 }}>
            {[
              ["Sub Total", proforma?.amount || proforma?.subtotal],
              proforma?.discountAmount > 0 && ["Discount", -proforma.discountAmount],
              proforma?.gstAmount > 0 && [`GST (${proforma.gstPercent || 0}%)`, proforma.gstAmount],
              proforma?.tdsAmount > 0 && [`TDS (${proforma.tdsPercent || 0}%)`, -proforma.tdsAmount],
              proforma?.tcsAmount > 0 && [`TCS (${proforma.tcsPercent || 0}%)`, proforma.tcsAmount],
              proforma?.adjustmentAmount && proforma.adjustmentAmount !== 0 && ["Adjustment", proforma.adjustmentAmount],
            ].filter(Boolean).map(([label, val]) => (
              <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.4, borderBottom: "1px solid #f0f0f0" }}>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{money(val)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75, borderTop: "2px solid #222", mt: 0.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{money(total)}</Typography>
            </Stack>
            {/* Payment summary */}
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: "#16a34a" }}>Payment Received</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>{money(received)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5, borderTop: "1px dashed #ddd", mt: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: balance > 0 ? "#c2410c" : "#16a34a" }}>Receivable Amount</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: balance > 0 ? "#c2410c" : "#16a34a" }}>{money(balance)}</Typography>
            </Stack>
          </Box>
        </Stack>

        {proforma?.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", mb: 0.5 }}>Notes</Typography>
            <Typography sx={{ fontSize: 12, color: "#555" }}>{proforma.notes}</Typography>
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Box sx={{ textAlign: "center", borderTop: "1px solid #222", pt: 0.75, minWidth: 160 }}>
            <Typography sx={{ fontSize: 11, color: "#888" }}>Authorized Signature</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

const PAYMENT_MODES = ["Cash", "Bank Transfer", "NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Card", "Other"];

function RecordPaymentDialog({ open, onClose, proforma, onSaved }) {
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amountReceived: "",
    paymentMode: "Bank Transfer",
    referenceNumber: "",
    tdsAmount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const maxAmount = useMemo(() => {
    if (!proforma) return 0;
    return Math.max(Number(proforma.totalAmount || 0) - Number(proforma.paymentReceived || 0), 0);
  }, [proforma]);

  useEffect(() => {
    if (open) {
      setForm({
        paymentDate: new Date().toISOString().slice(0, 10),
        amountReceived: String(maxAmount > 0 ? maxAmount.toFixed(2) : ""),
        paymentMode: "Bank Transfer",
        referenceNumber: "",
        tdsAmount: "",
        notes: "",
      });
      setSaving(false);
    }
  }, [open, maxAmount]);

  const p = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const amount = Number(form.amountReceived);
    if (!amount || amount <= 0) { toast.error("Enter a valid payment amount"); return; }
    if (amount > maxAmount + 0.01) { toast.error(`Amount cannot exceed ₹${maxAmount.toFixed(2)}`); return; }
    setSaving(true);
    try {
      await proformaInvoiceApi.recordPayment(getId(proforma), {
        paymentDate: form.paymentDate,
        amountReceived: amount,
        paymentMode: form.paymentMode,
        referenceNumber: form.referenceNumber,
        tdsAmount: form.tdsAmount ? Number(form.tdsAmount) : 0,
        notes: form.notes,
      });
      toast.success("Payment recorded successfully!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const F = (label, key, opts = {}) => (
    <Box>
      <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>{label}{opts.required ? " *" : ""}</Typography>
      {opts.select ? (
        <TextField select fullWidth size="small" value={form[key]} onChange={(e) => p(key, e.target.value)}
          sx={{ "& .MuiOutlinedInput-root": { height: 34, fontSize: 13, borderRadius: "5px" } }}>
          {opts.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      ) : (
        <TextField fullWidth size="small" type={opts.type || "text"} value={form[key]}
          onChange={(e) => p(key, e.target.value)} placeholder={opts.placeholder || ""}
          sx={{ "& .MuiOutlinedInput-root": { height: opts.multiline ? "auto" : 34, fontSize: 13, borderRadius: "5px" } }}
          multiline={opts.multiline} rows={opts.rows || 2} />
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "10px" } }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: "#111827", pb: 1 }}>
        Record Payment
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {/* Payment summary */}
          <Box sx={{ bgcolor: "#f8fafc", borderRadius: "8px", p: 1.5, border: "1px solid #e3e7ef" }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: "#667085" }}>Proforma Invoice</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{proforma?.proformaNumber}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>Total Amount</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{money(proforma?.totalAmount)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>Already Paid</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>{money(proforma?.paymentReceived)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5, pt: 0.5, borderTop: "1px solid #e3e7ef" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#c2410c" }}>Remaining</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>{money(maxAmount)}</Typography>
            </Stack>
          </Box>

          {F("Payment Date", "paymentDate", { type: "date", required: true })}
          {F("Amount Received", "amountReceived", { type: "number", required: true, placeholder: maxAmount.toFixed(2) })}
          {F("Payment Mode", "paymentMode", { select: true, options: PAYMENT_MODES })}
          {F("Reference Number / UTR", "referenceNumber", { placeholder: "UTR, Cheque No., etc." })}
          {F("TDS Deducted (if any)", "tdsAmount", { type: "number", placeholder: "0.00" })}
          {F("Notes", "notes", { multiline: true, rows: 2, placeholder: "Any payment notes…" })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={14} sx={{ mr: 0.5, color: "#fff" }} /> : null}Save Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProformaInvoiceDetailPage() {
  const navigate     = useNavigate();
  const { proformaId } = useParams();

  const [proforma,    setProforma]    = useState(null);
  const [payments,    setPayments]    = useState([]);
  const [taxInvoices, setTaxInvoices] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [converting,  setConverting]  = useState(false);
  const [showPdf,     setShowPdf]     = useState(false);
  const [payDialog,   setPayDialog]   = useState(false);
  const [moreAnchor,  setMoreAnchor]  = useState(null);

  const companyName = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("loginData") || "{}").companyName || "Your Company"; }
    catch { return "Your Company"; }
  }, []);

  const loadData = useCallback(async () => {
    if (!proformaId) return;
    setLoading(true);
    try {
      const res  = await proformaInvoiceApi.getById(proformaId);
      const data = pickData(res);
      setProforma(data.proforma || data);
      setPayments(safeArray(data.payments));
      setTaxInvoices(safeArray(data.taxInvoices));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load proforma invoice");
    } finally {
      setLoading(false);
    }
  }, [proformaId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConvertToTaxInvoice = async () => {
    if (!proforma) return;
    if (proforma.paymentStatus !== "PAID") {
      toast.error("Tax Invoice can only be created after full payment is received");
      return;
    }
    if (!window.confirm("Create Tax Invoice from this Proforma Invoice?")) return;
    setConverting(true);
    try {
      const res  = await proformaInvoiceApi.convertToTaxInvoice(proformaId);
      const data = pickData(res);
      toast.success("Tax Invoice created successfully!");
      await loadData();
      if (data.taxInvoice?._id) navigate(`/invoices/${data.taxInvoice._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create tax invoice");
    } finally {
      setConverting(false);
    }
  };

  if (loading && !proforma) {
    return (
      <AppShell>
        <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", gap: 1 }}>
          <CircularProgress size={28} />
          <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>Loading proforma invoice…</Typography>
        </Stack>
      </AppShell>
    );
  }

  if (!proforma) {
    return (
      <AppShell>
        <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", gap: 1.5 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>Proforma invoice not found</Typography>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </Stack>
      </AppShell>
    );
  }

  const isPaid = proforma.paymentStatus === "PAID";
  const taxInvoiceCreated = proforma.taxInvoiceStatus === "CREATED";

  return (
    <AppShell>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 3, py: 1.5, borderBottom: "1px solid #e3e7ef", flexShrink: 0, bgcolor: "#fff" }}>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
              {proforma.proformaNumber || "Proforma Invoice"}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
              <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                {partyName(proforma)} • {fmt(proforma.invoiceDate)}
              </Typography>
              {proforma.salesOrderNumber && (
                <Typography sx={{ fontSize: 12, color: "#4088ff", cursor: "pointer" }}
                  onClick={() => proforma.salesOrderId && navigate(`/sales-orders/${proforma.salesOrderId}`)}>
                  SO: {proforma.salesOrderNumber}
                </Typography>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            {/* Record Payment */}
            {!isPaid && (
              <Button variant="primary" onClick={() => setPayDialog(true)}
                sx={{ height: 32, px: 1.5, fontSize: 13, gap: 0.5 }}>
                <PaymentsRoundedIcon sx={{ fontSize: 15 }} /> Record Payment
              </Button>
            )}

            {/* Convert to Tax Invoice */}
            {isPaid && !taxInvoiceCreated && (
              <Button variant="primary" onClick={handleConvertToTaxInvoice} disabled={converting}
                sx={{ height: 32, px: 1.5, fontSize: 13, gap: 0.5, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>
                {converting ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <ReceiptLongRoundedIcon sx={{ fontSize: 15 }} />}
                Convert to Tax Invoice
              </Button>
            )}

            {/* Tax Invoice already created */}
            {taxInvoiceCreated && taxInvoices.length > 0 && (
              <Button variant="outline" onClick={() => navigate(`/invoices/${getId(taxInvoices[0])}`)}
                sx={{ height: 32, px: 1.5, fontSize: 13, gap: 0.5, color: "#16a34a", borderColor: "#16a34a" }}>
                View Tax Invoice
              </Button>
            )}

            {/* PDF toggle */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <PictureAsPdfRoundedIcon sx={{ fontSize: 15, color: "#667085" }} />
              <Typography sx={{ fontSize: 12, color: "#667085" }}>PDF</Typography>
              <Switch size="small" checked={showPdf} onChange={(e) => setShowPdf(e.target.checked)}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#4088ff" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#4088ff" } }} />
            </Stack>

            {/* More */}
            <Box>
              <Button variant="outline" endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ fontSize: 13, height: 32, px: 1.5 }}>
                More
              </Button>
            </Box>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
              PaperProps={{ sx: { minWidth: 180, borderRadius: "6px", border: "1px solid #e3e7ef" } }}>
              {proforma.salesOrderId && (
                <MenuItem onClick={() => { setMoreAnchor(null); navigate(`/sales-orders/${proforma.salesOrderId}`); }}
                  sx={{ fontSize: 13, py: 1 }}>
                  View Sales Order
                </MenuItem>
              )}
              <MenuItem onClick={() => { setMoreAnchor(null); navigate("/sales-orders"); }}
                sx={{ fontSize: 13, py: 1 }}>
                All Sales Orders
              </MenuItem>
            </Menu>

            <Tooltip title="Go back">
              <IconButton size="small" onClick={() => navigate(-1)}
                sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", width: 32, height: 32 }}>
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* ── Convert to Tax Invoice notice ──────────────────────────────── */}
        {isPaid && !taxInvoiceCreated && (
          <Alert severity="success" sx={{ m: 2, mb: 0, borderRadius: "8px", flexShrink: 0 }}>
            Full payment received! You can now convert this proforma invoice to a Tax Invoice.
          </Alert>
        )}
        {!isPaid && (
          <Alert severity="info" sx={{ m: 2, mb: 0, borderRadius: "8px", flexShrink: 0 }}>
            Tax Invoice can be created only after full payment is received against this Proforma Invoice.
          </Alert>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {showPdf ? (
            <PdfPreview proforma={proforma} companyName={companyName} />
          ) : (
            <Box sx={{ p: 3 }}>
              {/* Payment Summary */}
              <PaymentSummaryCard proforma={proforma} />

              {/* Payment History */}
              <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "8px", mb: 2, overflow: "hidden" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between"
                  sx={{ px: 2, py: 1.25, bgcolor: "#f8fafc", borderBottom: "1px solid #e3e7ef" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Payment History ({payments.length})
                  </Typography>
                  {!isPaid && (
                    <Button variant="outline" onClick={() => setPayDialog(true)}
                      sx={{ fontSize: 12, height: 28, px: 1.25 }}>
                      + Record Payment
                    </Button>
                  )}
                </Stack>
                {payments.length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: "#9ca3af", px: 2, py: 1.5 }}>No payments recorded yet</Typography>
                ) : (
                  payments.map((pay) => (
                    <Stack key={getId(pay)} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ px: 2, py: 1.1, borderBottom: "1px solid #f3f4f6" }}>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{pay.paymentNumber || "—"}</Typography>
                        <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                          {fmt(pay.paymentDate)} • {pay.paymentMode}
                          {pay.referenceNumber ? ` • Ref: ${pay.referenceNumber}` : ""}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>
                        {money(pay.amountReceived)}
                      </Typography>
                    </Stack>
                  ))
                )}
              </Box>

              {/* Tax Invoices */}
              {taxInvoices.length > 0 && (
                <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "8px", mb: 2, overflow: "hidden" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#374151", px: 2, py: 1.25, bgcolor: "#f8fafc", borderBottom: "1px solid #e3e7ef" }}>
                    Tax Invoices ({taxInvoices.length})
                  </Typography>
                  {taxInvoices.map((inv) => (
                    <Stack key={getId(inv)} direction="row" justifyContent="space-between" alignItems="center"
                      onClick={() => navigate(`/invoices/${getId(inv)}`)}
                      sx={{ px: 2, py: 1.1, borderBottom: "1px solid #f3f4f6", cursor: "pointer", "&:hover": { bgcolor: "#f7f8fb" } }}>
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#4088ff" }}>{inv.invoiceNumber || "—"}</Typography>
                        <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>{fmt(inv.invoiceDate)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{money(inv.totalAmount)}</Typography>
                        <Box component="span" sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: "4px", fontSize: 11, fontWeight: 700, bgcolor: "#f0fdf4", color: "#16a34a" }}>
                          PAID
                        </Box>
                      </Stack>
                    </Stack>
                  ))}
                </Box>
              )}

              {/* Proforma Details */}
              <Box sx={{ bgcolor: "#f8fafc", borderRadius: "8px", border: "1px solid #e3e7ef", p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#111827", mb: 1.5 }}>Invoice Details</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  {[
                    ["Customer",        partyName(proforma)],
                    ["Invoice Date",    fmt(proforma.invoiceDate)],
                    ["Sales Order#",    proforma.salesOrderNumber || "—"],
                    ["Payment Status",  proforma.paymentStatus || "UNPAID"],
                    ["Tax Invoice",     proforma.taxInvoiceStatus || "NOT_CREATED"],
                    ["Grand Total",     money(proforma.totalAmount)],
                  ].map(([label, val]) => (
                    <Stack key={label} sx={{ py: 0.75 }}>
                      <Typography sx={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4, mb: 0.25 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{val}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Record Payment dialog */}
      <RecordPaymentDialog
        open={payDialog}
        onClose={() => setPayDialog(false)}
        proforma={proforma}
        onSaved={loadData}
      />
    </AppShell>
  );
}
