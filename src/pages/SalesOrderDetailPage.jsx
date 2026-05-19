import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { FileText } from "lucide-react";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { salesOrderApi, salesOrderCycleApi, proformaInvoiceApi } from "../api/customerVendorApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pickData = (v) => v?.data || v?.result || v || {};
const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.data)) return v.data;
  if (v.data && v.data !== v) return safeArray(v.data);
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
  if (!Number.isFinite(n) || n === 0) return "₹0.00";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
};

const partyName = (row) => {
  const c = row?.customerId;
  if (c && typeof c === "object") return c.displayName || c.customerName || c.companyName || "";
  return row?.customerSnapshot?.name || "";
};

// ─── Status chips ─────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    DRAFT:          { label: "Draft",           bg: "#f3f4f6", color: "#6b7280" },
    CONFIRMED:      { label: "Confirmed",        bg: "#fff7ed", color: "#c2410c" },
    CLOSED:         { label: "Closed",           bg: "#f0fdf4", color: "#16a34a" },
    CANCELLED:      { label: "Cancelled",        bg: "#fef2f2", color: "#dc2626" },
    NOT_CREATED:    { label: "Not Created",      bg: "#f3f4f6", color: "#9ca3af" },
    CREATED:        { label: "Created",          bg: "#eff6ff", color: "#2563eb" },
    SENT:           { label: "Sent",             bg: "#eff6ff", color: "#2563eb" },
    PARTIALLY_PAID: { label: "Partially Paid",   bg: "#fff7ed", color: "#c2410c" },
    PAID:           { label: "Paid",             bg: "#f0fdf4", color: "#16a34a" },
    UNPAID:         { label: "Unpaid",           bg: "#fef9c3", color: "#854d0e" },
    INVOICED:       { label: "Invoiced",         bg: "#eff6ff", color: "#2563eb" },
    FULFILLED:      { label: "Fulfilled",        bg: "#f0fdf4", color: "#16a34a" },
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

// ─── PDF Preview ──────────────────────────────────────────────────────────────

function PdfPreview({ order, companyName }) {
  const customer = order?.customerId;
  const snap = order?.customerSnapshot || {};
  const customerDisplayName = (customer && typeof customer === "object")
    ? (customer.displayName || customer.customerName || customer.companyName || snap.name || "")
    : snap.name || "";
  const billingAddr = (customer && typeof customer === "object" && customer.billingAddress)
    ? (typeof customer.billingAddress === "object"
        ? [customer.billingAddress.address, customer.billingAddress.city, customer.billingAddress.state].filter(Boolean).join(", ")
        : customer.billingAddress)
    : snap.billingAddress || "";
  const customerEmail = (customer && typeof customer === "object") ? customer.email : snap.email || "";
  const customerMobile = (customer && typeof customer === "object") ? customer.mobile : snap.mobile || "";
  const items = order?.items || [];

  return (
    <Box sx={{
      m: 2, border: "1px solid #e0e0e0", borderRadius: "4px",
      fontFamily: "Arial, sans-serif", fontSize: 13, color: "#222",
      bgcolor: "#fff", position: "relative", overflow: "hidden",
    }}>
      {/* Watermark corner */}
      {(order?.status === "CLOSED" || order?.status === "CANCELLED") && (
        <Box sx={{
          position: "absolute", top: 20, right: -28, bgcolor: "#22c55e",
          color: "#fff", fontSize: 13, fontWeight: 700, px: 5, py: 0.5,
          transform: "rotate(45deg)", transformOrigin: "center", letterSpacing: 1, zIndex: 2,
        }}>
          {order.status === "CANCELLED" ? "CANCELLED" : "CLOSED"}
        </Box>
      )}

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{companyName || "Company"}</Typography>
            {customerMobile && <Typography sx={{ fontSize: 12, color: "#555", mt: 0.25 }}>{customerMobile}</Typography>}
            {customerEmail && <Typography sx={{ fontSize: 12, color: "#555" }}>{customerEmail}</Typography>}
          </Box>
          <Typography sx={{ fontSize: 26, fontWeight: 700, color: "#222", letterSpacing: 1 }}>SALES ORDER</Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2.5 }}>
          {/* Bill To */}
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", mb: 0.5 }}>Bill To</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{customerDisplayName}</Typography>
            {billingAddr && <Typography sx={{ fontSize: 12, color: "#555", mt: 0.25, maxWidth: 200 }}>{billingAddr}</Typography>}
          </Box>

          {/* Order meta */}
          <Box sx={{ textAlign: "right" }}>
            {[
              ["Sales Order#", order?.salesOrderNumber || "—"],
              ["Order Date", fmt(order?.orderDate)],
              ["Expected Shipment Date", fmt(order?.expectedShipmentDate)],
              ["Reference#", order?.referenceNumber || "—"],
              ["Delivery Method", order?.deliveryMethod || "—"],
            ].map(([label, val]) => (
              <Stack key={label} direction="row" justifyContent="flex-end" gap={2} sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: "#888" }}>{label} :</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#222", minWidth: 80, textAlign: "right" }}>{val}</Typography>
              </Stack>
            ))}
          </Box>
        </Stack>

        {/* Items Table */}
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
                  {item.description && <Typography sx={{ fontSize: 11, color: "#888" }}>{item.description}</Typography>}
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
          <Box sx={{ minWidth: 240 }}>
            {[
              ["Sub Total", order?.amount || order?.subtotal],
              order?.discountAmount > 0 && ["Discount", -order.discountAmount],
              order?.gstAmount > 0 && [`GST (${order.gstPercent || 0}%)`, order.gstAmount],
              order?.tdsAmount > 0 && [`TDS (${order.tdsPercent || 0}%)`, -order.tdsAmount],
              order?.tcsAmount > 0 && [`TCS (${order.tcsPercent || 0}%)`, order.tcsAmount],
              order?.adjustmentAmount && order.adjustmentAmount !== 0 && ["Adjustment", order.adjustmentAmount],
            ].filter(Boolean).map(([label, val]) => (
              <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.4, borderBottom: "1px solid #f0f0f0" }}>
                <Typography sx={{ fontSize: 12, color: "#555" }}>{label}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{money(val)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75, borderTop: "2px solid #222", mt: 0.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{money(order?.totalAmount)}</Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Notes */}
        {order?.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", mb: 0.5 }}>Notes</Typography>
            <Typography sx={{ fontSize: 12, color: "#555" }}>{order.notes}</Typography>
          </Box>
        )}

        {/* Signature */}
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Box sx={{ textAlign: "center", borderTop: "1px solid #222", pt: 0.75, minWidth: 160 }}>
            <Typography sx={{ fontSize: 11, color: "#888" }}>Authorized Signature</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ─── Create Challan Dialog ────────────────────────────────────────────────────

function ChallanDialog({ open, onClose, onSave, order, type }) {
  const [remarks, setRemarks] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRemarks(""); setSiteAddress(""); setTechnicianName(""); setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ remarks, siteAddress, technicianName });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create challan");
    } finally {
      setSaving(false);
    }
  };

  const isInstallation = type === "INSTALLATION_CHALLAN";
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: "10px" } }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: "#111827", pb: 1 }}>
        {isInstallation ? "Create Installation Challan" : "Create Delivery Challan"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {isInstallation && (
            <>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Site Address</Typography>
                <TextField fullWidth size="small" multiline rows={2} value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)} placeholder="Installation site address" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Technician Name</Typography>
                <TextField fullWidth size="small" value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)} placeholder="Name of technician" />
              </Box>
            </>
          )}
          <Box>
            <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Remarks</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={remarks}
              onChange={(e) => setRemarks(e.target.value)} placeholder="Any delivery remarks…" />
          </Box>
          <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
            Items will be copied from the sales order.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}Create Challan
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function SalesOrderDetailPage() {
  const navigate  = useNavigate();
  const { orderId } = useParams();

  const [allOrders,  setAllOrders]  = useState([]);
  const [order,      setOrder]      = useState(null);
  const [proformas,  setProformas]  = useState([]);
  const [challans,   setChallans]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [converting, setConverting] = useState(false);
  const [showPdf,    setShowPdf]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [moreAnchor,   setMoreAnchor]   = useState(null);
  const [challanDialog, setChallanDialog] = useState({ open: false, type: null });

  const companyName = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("loginData") || "{}").companyName || "Your Company"; }
    catch { return "Your Company"; }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await salesOrderApi.list({ limit: 500 });
      const data = pickData(listRes);
      setAllOrders(safeArray(data.items || data));
    } catch (err) {
      toast.error("Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrder = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await salesOrderApi.getById(id);
      const data = pickData(res);
      setOrder(data.order || data);
      setProformas(safeArray(data.proformaInvoices));
      setChallans(safeArray(data.challans));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadOrder(orderId); }, [orderId, loadOrder]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allOrders;
    return allOrders.filter((r) =>
      (r.salesOrderNumber || "").toLowerCase().includes(q) ||
      partyName(r).toLowerCase().includes(q)
    );
  }, [allOrders, search]);

  const handleConvertToProforma = async () => {
    if (!order) return;
    if (order.proformaInvoiceStatus !== "NOT_CREATED" && !window.confirm("A proforma invoice already exists. Create another one?")) return;
    setConverting(true);
    try {
      const res = await salesOrderCycleApi.convertToProforma(getId(order));
      const data = pickData(res);
      toast.success("Proforma invoice created!");
      await loadOrder(orderId);
      if (data.proforma?._id) navigate(`/proforma-invoices/${data.proforma._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create proforma invoice");
    } finally {
      setConverting(false);
    }
  };

  const handleCreateChallan = async (type, payload) => {
    const fn = type === "DELIVERY_CHALLAN"
      ? (p) => salesOrderCycleApi.createDeliveryChallan(getId(order), p)
      : (p) => salesOrderCycleApi.createInstallationChallan(getId(order), p);
    await fn(payload);
    toast.success(`${type === "DELIVERY_CHALLAN" ? "Delivery" : "Installation"} challan created!`);
    await loadOrder(orderId);
  };

  const selectOrder = (o) => {
    navigate(`/sales-orders/${getId(o)}`, { replace: true });
  };

  if (!orderId && allOrders.length === 0 && !loading) {
    return (
      <AppShell>
        <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", gap: 1.5 }}>
          <FileText size={44} color="#d1d5db" />
          <Typography sx={{ fontSize: 15, fontWeight: 500 }}>No sales orders</Typography>
          <Button variant="primary" onClick={() => navigate("/sales-orders/new")}>+ New Sales Order</Button>
        </Stack>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", bgcolor: "#fff" }}>

        {/* ══ LEFT PANEL ════════════════════════════════════════════════════ */}
        <Box sx={{ width: 290, flexShrink: 0, borderRight: "1px solid #e3e7ef", display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Left header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 1.75, py: 1.25, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: "pointer" }}
              onClick={(e) => setFilterAnchor(e.currentTarget)}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>All Sales Orders</Typography>
              <ExpandMoreRoundedIcon sx={{ fontSize: 17, color: "#667085" }} />
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="New Sales Order">
                <IconButton size="small" onClick={() => navigate("/sales-orders/new")}
                  sx={{ bgcolor: "#4088ff", color: "#fff", borderRadius: "6px", width: 28, height: 28, "&:hover": { bgcolor: "#3070e0" } }}>
                  <AddRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="More">
                <IconButton size="small" sx={{ borderRadius: "6px", width: 28, height: 28, border: "1px solid #e3e7ef" }}>
                  <MoreHorizRoundedIcon sx={{ fontSize: 15, color: "#667085" }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Search */}
          <Box sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: "1px solid #f3f4f6" }}>
            <TextField fullWidth size="small" placeholder="Search orders…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 15, color: "#9ca3af" }} /></InputAdornment> }}
              sx={{ "& .MuiOutlinedInput-root": { height: 32, fontSize: 13, borderRadius: "6px", bgcolor: "#f7f8fb", "& fieldset": { border: "none" } } }} />
          </Box>

          {/* Order list */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loading && allOrders.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
            ) : (
              filtered.map((o) => {
                const isSelected = getId(o) === orderId;
                return (
                  <Box key={getId(o)} onClick={() => selectOrder(o)}
                    sx={{
                      px: 1.75, py: 1.25, cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                      bgcolor: isSelected ? "#eaf2ff" : "transparent",
                      borderLeft: isSelected ? "3px solid #4088ff" : "3px solid transparent",
                      "&:hover": { bgcolor: isSelected ? "#eaf2ff" : "#f7f8fb" },
                    }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? "#1d4ed8" : "#111827" }}>
                          {partyName(o)}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                          {o.salesOrderNumber && (
                            <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>{o.salesOrderNumber}</Typography>
                          )}
                          {o.salesOrderNumber && o.orderDate && (
                            <Typography sx={{ fontSize: 11, color: "#d1d5db" }}>•</Typography>
                          )}
                          <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>{fmt(o.orderDate)}</Typography>
                          {o.referenceNumber && (
                            <>
                              <Typography sx={{ fontSize: 11, color: "#d1d5db" }}>•</Typography>
                              <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>{o.referenceNumber}</Typography>
                            </>
                          )}
                        </Stack>
                        <Box sx={{ mt: 0.5 }}>
                          <StatusChip status={o.status} />
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#1d4ed8" : "#374151", whiteSpace: "nowrap", ml: 1 }}>
                        ₹{Number(o.totalAmount || o.amount || 0).toLocaleString("en-IN")}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* ══ RIGHT PANEL ════════════════════════════════════════════════════ */}
        {order ? (
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff" }}>

            {/* Detail header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              sx={{ px: 3, py: 1.25, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                {order.salesOrderNumber || "Sales Order"}
              </Typography>

              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                {/* Edit */}
                <Button variant="outline" onClick={() => navigate(`/sales-orders/new?edit=${getId(order)}`)}
                  sx={{ height: 32, px: 1.5, fontSize: 13, gap: 0.5 }}>
                  <EditRoundedIcon sx={{ fontSize: 15 }} /> Edit
                </Button>

                {/* Convert to Proforma */}
                {order.proformaInvoiceStatus === "NOT_CREATED" && (
                  <Button variant="primary" onClick={handleConvertToProforma} disabled={converting}
                    sx={{ height: 32, px: 1.5, fontSize: 13, gap: 0.5 }}>
                    {converting ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <ReceiptLongRoundedIcon sx={{ fontSize: 15 }} />}
                    Convert to Proforma
                  </Button>
                )}

                {/* PDF toggle */}
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PictureAsPdfRoundedIcon sx={{ fontSize: 16, color: "#667085" }} />
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
                  PaperProps={{ sx: { minWidth: 220, borderRadius: "6px", border: "1px solid #e3e7ef", boxShadow: "0 8px 24px rgba(16,24,40,0.12)" } }}>
                  <MenuItem onClick={() => { setMoreAnchor(null); setChallanDialog({ open: true, type: "DELIVERY_CHALLAN" }); }}
                    sx={{ fontSize: 13, py: 1, gap: 1.25 }}>
                    Create Delivery Challan
                  </MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); setChallanDialog({ open: true, type: "INSTALLATION_CHALLAN" }); }}
                    sx={{ fontSize: 13, py: 1, gap: 1.25 }}>
                    Create Installation Challan
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { setMoreAnchor(null); navigate("/sales-orders"); }}
                    sx={{ fontSize: 13, py: 1, gap: 1.25, color: "#dc2626" }}>
                    Back to List
                  </MenuItem>
                </Menu>

                <Tooltip title="Back to list">
                  <IconButton size="small" onClick={() => navigate("/sales-orders")}
                    sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", width: 32, height: 32 }}>
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Status row */}
            <Stack direction="row" spacing={2.5} sx={{ px: 3, py: 1, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 12, color: "#667085" }}>Order Status</Typography>
                <StatusChip status={order.status} />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 12, color: "#667085" }}>Proforma Invoice</Typography>
                <StatusChip status={order.proformaInvoiceStatus || "NOT_CREATED"} />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 12, color: "#667085" }}>Payment</Typography>
                <StatusChip status={order.paymentStatus || "UNPAID"} />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: 12, color: "#667085" }}>Tax Invoice</Typography>
                <StatusChip status={order.taxInvoiceStatus || "NOT_CREATED"} />
              </Stack>
            </Stack>

            {/* Content */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {showPdf ? (
                <PdfPreview order={order} companyName={companyName} />
              ) : (
                <Box sx={{ p: 3 }}>
                  {/* ── Linked Proforma Invoices ─────────────────────── */}
                  <LinkedSection
                    title="Proforma Invoices"
                    count={proformas.length}
                    emptyText="No proforma invoice created yet"
                    action={order.proformaInvoiceStatus === "NOT_CREATED" ? (
                      <Button variant="primary" onClick={handleConvertToProforma} disabled={converting}
                        sx={{ fontSize: 12, height: 28, px: 1.25 }}>
                        Convert to Proforma
                      </Button>
                    ) : null}
                  >
                    {proformas.map((pi) => (
                      <LinkedDocRow key={getId(pi)}
                        label={pi.proformaNumber || "PI"}
                        sub={`Date: ${fmt(pi.invoiceDate)} • ₹${Number(pi.totalAmount || 0).toLocaleString("en-IN")}`}
                        badge={<StatusChip status={pi.paymentStatus || "UNPAID"} />}
                        onClick={() => navigate(`/proforma-invoices/${getId(pi)}`)}
                      />
                    ))}
                  </LinkedSection>

                  {/* ── Linked Challans ──────────────────────────────── */}
                  <LinkedSection
                    title="Delivery Challans"
                    count={challans.filter((c) => c.challanType === "DELIVERY_CHALLAN").length}
                    emptyText="No delivery challan created"
                    action={
                      <Button variant="outline" onClick={() => setChallanDialog({ open: true, type: "DELIVERY_CHALLAN" })}
                        sx={{ fontSize: 12, height: 28, px: 1.25 }}>
                        Create Challan
                      </Button>
                    }
                  >
                    {challans.filter((c) => c.challanType === "DELIVERY_CHALLAN").map((ch) => (
                      <LinkedDocRow key={getId(ch)}
                        label={ch.challanNumber || "DC"}
                        sub={`Date: ${fmt(ch.challanDate)}`}
                        badge={<StatusChip status={ch.status} />}
                      />
                    ))}
                  </LinkedSection>

                  <LinkedSection
                    title="Installation Challans"
                    count={challans.filter((c) => c.challanType === "INSTALLATION_CHALLAN").length}
                    emptyText="No installation challan created"
                    action={
                      <Button variant="outline" onClick={() => setChallanDialog({ open: true, type: "INSTALLATION_CHALLAN" })}
                        sx={{ fontSize: 12, height: 28, px: 1.25 }}>
                        Create Challan
                      </Button>
                    }
                  >
                    {challans.filter((c) => c.challanType === "INSTALLATION_CHALLAN").map((ch) => (
                      <LinkedDocRow key={getId(ch)}
                        label={ch.challanNumber || "IC"}
                        sub={`Date: ${fmt(ch.challanDate)}`}
                        badge={<StatusChip status={ch.status} />}
                      />
                    ))}
                  </LinkedSection>

                  {/* ── Order Details ──────────────────────────────────── */}
                  <Box sx={{ bgcolor: "#f8fafc", borderRadius: "8px", border: "1px solid #e3e7ef", p: 2.5, mt: 2 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#111827", mb: 1.5 }}>Order Details</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                      {[
                        ["Customer",           partyName(order)],
                        ["Order Date",         fmt(order.orderDate)],
                        ["Expected Shipment",  fmt(order.expectedShipmentDate)],
                        ["Reference#",         order.referenceNumber || "—"],
                        ["Delivery Method",    order.deliveryMethod || "—"],
                        ["Payment Terms",      order.paymentTerms || "—"],
                        ["Salesperson",        order.salesperson || "—"],
                        ["Grand Total",        money(order.totalAmount)],
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
        ) : (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", bgcolor: "#fafbfc", gap: 1.5 }}>
            {loading ? (
              <CircularProgress size={28} />
            ) : (
              <>
                <FileText size={44} color="#d1d5db" />
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>Select an order to view details</Typography>
                <Button variant="primary" onClick={() => navigate("/sales-orders/new")}>+ New Sales Order</Button>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Challan dialog */}
      <ChallanDialog
        open={challanDialog.open}
        onClose={() => setChallanDialog({ open: false, type: null })}
        onSave={(payload) => handleCreateChallan(challanDialog.type, payload)}
        order={order}
        type={challanDialog.type}
      />
    </AppShell>
  );
}

// ─── Linked section helper ────────────────────────────────────────────────────

function LinkedSection({ title, count, children, emptyText, action }) {
  const [open, setOpen] = useState(true);
  return (
    <Box sx={{ mb: 2, border: "1px solid #e3e7ef", borderRadius: "8px", overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        onClick={() => setOpen(!open)}
        sx={{ px: 2, py: 1.25, bgcolor: "#f8fafc", cursor: "pointer", "&:hover": { bgcolor: "#f3f4f6" } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{title}</Typography>
          {count > 0 && (
            <Chip label={count} size="small" sx={{ height: 18, fontSize: 11, fontWeight: 700, bgcolor: "#eaf2ff", color: "#4088ff" }} />
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {action}
          <ChevronRightRoundedIcon sx={{ fontSize: 18, color: "#9ca3af", transform: open ? "rotate(90deg)" : "none", transition: "150ms" }} />
        </Stack>
      </Stack>
      {open && (
        <Box>
          {count === 0 ? (
            <Typography sx={{ fontSize: 13, color: "#9ca3af", px: 2, py: 1.5 }}>{emptyText}</Typography>
          ) : children}
        </Box>
      )}
    </Box>
  );
}

function LinkedDocRow({ label, sub, badge, onClick }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between"
      onClick={onClick}
      sx={{ px: 2, py: 1.1, borderTop: "1px solid #f3f4f6", cursor: onClick ? "pointer" : "default", "&:hover": onClick ? { bgcolor: "#f7f8fb" } : {} }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: onClick ? "#4088ff" : "#111827" }}>{label}</Typography>
        {sub && <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>{sub}</Typography>}
      </Box>
      {badge}
    </Stack>
  );
}
