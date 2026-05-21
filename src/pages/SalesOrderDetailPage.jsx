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
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { salesOrderApi } from "../api/customerVendorApi";
import DocumentPdfPreview, { downloadDocumentPdf, formatDate, formatMoney } from "../components/DocumentPdfPreview";

const pickData = (v) => v?.data || v?.result || v || {};
const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
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
const normalizedStatus = (status) => (status === "CONFIRMED" ? "ISSUED" : status || "DRAFT");
const statusColor = (status) => {
  const s = normalizedStatus(status);
  if (s === "DRAFT") return "#64748b";
  if (s === "ISSUED") return "#2563eb";
  if (s === "CLOSED") return "#16a34a";
  if (s === "CANCELLED") return "#dc2626";
  return "#64748b";
};
function buildEmailCacheKey(type, id) {
  return `moneyiq_send_${type}_${id}`;
}

function ChallanDialog({ open, onClose, onCreate }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(""); }, [open]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Delivery Challan</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: "#667085", mb: 1 }}>A delivery challan will be generated from this issued sales order and downloaded as a PDF.</Typography>
        <TextField fullWidth multiline minRows={3} label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onCreate({ notes })}>Create & Download</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SalesOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [challanOpen, setChallanOpen] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const res = await salesOrderApi.list({ limit: 500 });
      const data = pickData(res);
      setRows(safeArray(data.items || data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load sales order list");
    }
  }, []);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await salesOrderApi.getById(orderId);
      const data = pickData(res);
      setOrder(data.order || data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load sales order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadOrder(); }, [loadOrder]);

  const selectedId = getId(order);
  const status = normalizedStatus(order?.status);
  const selectedInList = useMemo(() => rows.find((r) => getId(r) === orderId), [orderId, rows]);

  const handleIssue = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await salesOrderApi.issue(selectedId);
      toast.success("Sales order issued");
      await Promise.all([loadOrder(), loadList()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to issue sales order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDeliveryChallan = async (payload) => {
    setActionLoading(true);
    try {
      const res = await salesOrderApi.createDeliveryChallan(selectedId, payload);
      const data = pickData(res);
      const challan = data.challan || data;
      toast.success("Delivery challan created");
      downloadDocumentPdf({ type: "delivery-challan", doc: { ...challan, customerId: order.customerId, customerSnapshot: order.customerSnapshot, items: challan.items || order.items, salesOrderNumber: order.salesOrderNumber, orderDate: order.orderDate, status: "GENERATED" } });
      setChallanOpen(false);
      await Promise.all([loadOrder(), loadList()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create delivery challan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await salesOrderApi.convertToInvoice(selectedId);
      const data = pickData(res);
      const invoice = data.invoice || data;
      toast.success("Proforma invoice created");
      navigate(`/invoices/${getId(invoice)}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create proforma invoice");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = () => {
    if (!order) return;
    sessionStorage.setItem(buildEmailCacheKey("sales-order", selectedId), JSON.stringify({
      mode: "sales-order",
      documentId: selectedId,
      apiDocument: order,
      selectedParty: order.customerId,
      partyName: partyName(order),
      partyEmail: order.customerId?.email || order.customerSnapshot?.email || "",
      items: order.items || [],
      createdAt: new Date().toISOString(),
    }));
    navigate(`/send-email?type=sales-order&id=${selectedId}`);
  };

  const handlePrintOrDownload = () => {
    if (order) downloadDocumentPdf({ type: "sales-order", doc: order });
  };

  return (
    <AppShell>
      <Box sx={{ height: "100%", display: "flex", bgcolor: "#f8fafc", overflow: "hidden" }}>
        <Box sx={{ width: 365, flexShrink: 0, bgcolor: "#fff", borderRight: "1px solid #dfe4ef", display: "flex", flexDirection: "column" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 57, px: 2, borderBottom: "1px solid #e5e7eb" }}>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>All Sales Orders</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => navigate("/sales-orders/new")} sx={{ minWidth: 34, px: 1 }}><AddRoundedIcon sx={{ fontSize: 17 }} /></Button>
              <IconButton onClick={loadList} sx={{ border: "1px solid #d7dce8", borderRadius: "6px" }}><MoreHorizRoundedIcon /></IconButton>
            </Stack>
          </Stack>
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {rows.map((row) => {
              const id = getId(row);
              const active = id === orderId;
              const s = normalizedStatus(row.status);
              return (
                <Stack key={id} direction="row" onClick={() => navigate(`/sales-orders/${id}`)} sx={{ px: 1.8, py: 1.25, gap: 1.2, borderBottom: "1px solid #edf0f6", bgcolor: active ? "#f1f3ff" : "#fff", cursor: "pointer", "&:hover": { bgcolor: "#f8fbff" } }}>
                  <Checkbox size="small" checked={active} onChange={() => {}} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>{partyName(row)}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>{formatMoney(row.totalAmount)}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: "#4b5872", mt: 0.3 }} noWrap>{row.salesOrderNumber || "—"} • {formatDate(row.orderDate)}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: statusColor(s), mt: 0.4 }}>{s}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 57, px: 2, borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{order?.salesOrderNumber || selectedInList?.salesOrderNumber || "Sales Order"}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Attachment"><IconButton sx={{ border: "1px solid #d7dce8", borderRadius: "6px" }}><AttachFileRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Close"><IconButton onClick={() => navigate("/sales-orders")}><CloseRoundedIcon fontSize="small" sx={{ color: "#ef4444" }} /></IconButton></Tooltip>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 45, px: 2, borderBottom: "1px solid #e5e7eb", bgcolor: "#fbfcff", flexShrink: 0 }}>
            <Button variant="text" startIcon={<EditRoundedIcon fontSize="small" />} onClick={() => navigate(`/sales-orders/${selectedId}/edit`)}>Edit</Button>
            <Divider orientation="vertical" flexItem />
            <Button variant="text" startIcon={<MailOutlineRoundedIcon fontSize="small" />} onClick={handleSendEmail}>Send Email</Button>
            <Divider orientation="vertical" flexItem />
            <Button variant="text" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={handlePrintOrDownload}>PDF/Print</Button>
            <Divider orientation="vertical" flexItem />
            {status === "DRAFT" ? <Button variant="text" disabled={actionLoading} onClick={handleIssue}>Issue</Button> : null}
            {status === "ISSUED" ? <Button variant="text" disabled={actionLoading} onClick={() => setChallanOpen(true)}>Create Delivery Challan</Button> : null}
            {status === "ISSUED" ? <Button variant="text" disabled={actionLoading} onClick={handleConvertToInvoice}>Convert to Proforma Invoice</Button> : null}
            {status === "CLOSED" && order?.convertedInvoiceId ? <Button variant="text" onClick={() => navigate(`/invoices/${getId(order.convertedInvoiceId)}`)}>Open Invoice</Button> : null}
            <IconButton size="small" onClick={(e) => setMoreAnchor(e.currentTarget)}><MoreHorizRoundedIcon fontSize="small" /></IconButton>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
              <MenuItem onClick={() => { setMoreAnchor(null); loadOrder(); loadList(); }}>Refresh</MenuItem>
              <MenuItem onClick={() => { setMoreAnchor(null); handlePrintOrDownload(); }}>Download PDF</MenuItem>
            </Menu>
          </Stack>

          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #edf0f6" }}>
            <Stack spacing={1.3}>
              {status === "DRAFT" ? (
                <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "4px", p: 1.5 }}>
                  <Typography sx={{ fontSize: 13 }}><b>WHAT'S NEXT?</b> Issue this sales order before creating a delivery challan or proforma invoice. <Button sx={{ ml: 1 }} onClick={handleIssue} disabled={actionLoading}>Issue Sales Order</Button></Typography>
                </Box>
              ) : null}
              {status === "ISSUED" ? (
                <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "4px", p: 1.5 }}>
                  <Typography sx={{ fontSize: 13 }}><b>WHAT'S NEXT?</b> Create a delivery challan or convert this sales order to proforma invoice. <Button sx={{ ml: 1 }} onClick={() => setChallanOpen(true)}>Delivery Challan</Button> <Button sx={{ ml: 1 }} onClick={handleConvertToInvoice}>Create Proforma Invoice</Button></Typography>
                </Box>
              ) : null}
              {status === "CLOSED" ? (
                <Box sx={{ border: "1px solid #e3e7ef", borderRadius: "4px", p: 1.5, bgcolor: "#f0fdf4" }}>
                  <Typography sx={{ fontSize: 13, color: "#166534" }}><b>Closed.</b> This sales order is converted to a proforma invoice.</Typography>
                </Box>
              ) : null}
            </Stack>
          </Box>

          <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ px: 3, py: 1.2 }}>
            <Typography sx={{ fontSize: 13, mr: 1 }}>Show PDF View</Typography>
            <Switch checked={showPdf} onChange={(e) => setShowPdf(e.target.checked)} />
          </Stack>

          <Box sx={{ flex: 1, overflow: "auto", bgcolor: "#f8fafc" }}>
            {loading ? <Box sx={{ height: 300, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : order ? (
              showPdf ? <DocumentPdfPreview type="sales-order" doc={order} /> : (
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>Sales Order Details</Typography>
                  <Typography>Customer: {partyName(order)}</Typography>
                  <Typography>Status: {status}</Typography>
                  <Typography>Total: {formatMoney(order.totalAmount)}</Typography>
                </Box>
              )
            ) : <Box sx={{ p: 4 }}>Select a sales order.</Box>}
          </Box>
        </Box>
      </Box>
      <ChallanDialog open={challanOpen} onClose={() => setChallanOpen(false)} onCreate={handleCreateDeliveryChallan} />
    </AppShell>
  );
}
