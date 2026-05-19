import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { FileText } from "lucide-react";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { salesOrderApi } from "../api/customerVendorApi";

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
  try {
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
};

const money = (v) => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
};

const partyName = (row) => {
  const c = row?.customerId;
  if (c && typeof c === "object") {
    return c.displayName || c.customerName || c.companyName || c.name || "—";
  }
  return row?.customerSnapshot?.name || "—";
};

// ─── Status chips ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  DRAFT:           { bg: "#f3f4f6", color: "#6b7280" },
  CONFIRMED:       { bg: "#fff7ed", color: "#c2410c" },
  CLOSED:          { bg: "#f0fdf4", color: "#16a34a" },
  CANCELLED:       { bg: "#fef2f2", color: "#dc2626" },
  UNPAID:          { bg: "#fef9c3", color: "#854d0e" },
  PARTIALLY_PAID:  { bg: "#fff7ed", color: "#c2410c" },
  PAID:            { bg: "#f0fdf4", color: "#16a34a" },
  NOT_CREATED:     { bg: "#f3f4f6", color: "#9ca3af" },
  CREATED:         { bg: "#eff6ff", color: "#2563eb" },
  SENT:            { bg: "#eff6ff", color: "#2563eb" },
};

function StatusChip({ label, status }) {
  const c = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#6b7280" };
  if (!label && !status) return <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>—</Typography>;
  return (
    <Box component="span"
      sx={{ display: "inline-block", px: 1, py: 0.25, borderRadius: "4px", fontSize: 11, fontWeight: 600, bgcolor: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {label || status}
    </Box>
  );
}

function DotStatus({ status }) {
  const colors = {
    NOT_CREATED: "#d1d5db",
    CREATED: "#3b82f6",
    SENT: "#3b82f6",
    PARTIALLY_PAID: "#f59e0b",
    PAID: "#22c55e",
    UNPAID: "#d1d5db",
  };
  return (
    <Box component="span"
      sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: colors[status] || "#d1d5db" }} />
  );
}

// ─── Table cells ──────────────────────────────────────────────────────────────

const TH = ({ children, align = "left", width }) => (
  <TableCell align={align} sx={{
    fontSize: 11, fontWeight: 700, color: "#667085", textTransform: "uppercase",
    letterSpacing: 0.5, py: 1.25, px: 2, bgcolor: "#f8fafc",
    borderBottom: "1px solid #e3e7ef", whiteSpace: "nowrap",
    ...(width ? { width } : {}),
  }}>
    {children}
  </TableCell>
);

const TD = ({ children, align = "left", onClick, sx = {} }) => (
  <TableCell align={align} onClick={onClick} sx={{
    fontSize: 13, color: "#374151", py: 1.1, px: 2,
    borderBottom: "1px solid #f3f4f6", verticalAlign: "middle",
    ...(onClick ? { cursor: "pointer" } : {}), ...sx,
  }}>
    {children}
  </TableCell>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_TABS = ["All", "DRAFT", "CONFIRMED", "CLOSED", "CANCELLED"];

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState("");
  const [tabIdx,  setTabIdx]  = useState(0);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [deleting,   setDeleting]   = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await salesOrderApi.list({ limit: 500 });
      const data = pickData(res);
      setRows(safeArray(data.items || data));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  // Auto-navigate to new if ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      navigate("/sales-orders/new");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, navigate, setSearchParams]);

  const filtered = useMemo(() => {
    let list = rows;
    const statusFilter = ALL_TABS[tabIdx];
    if (statusFilter !== "All") list = list.filter((r) => r.status === statusFilter);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((r) =>
      (r.salesOrderNumber || "").toLowerCase().includes(q) ||
      (r.referenceNumber || "").toLowerCase().includes(q) ||
      partyName(r).toLowerCase().includes(q)
    );
    return list;
  }, [rows, tabIdx, search]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.salesOrderNumber || "this sales order"}?`)) return;
    setDeleting(getId(row));
    try {
      await salesOrderApi.delete(getId(row));
      toast.success("Sales order deleted");
      loadRows();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AppShell>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #e3e7ef", bgcolor: "#fff", flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{ bgcolor: "#eaf2ff", borderRadius: "8px", p: 0.75, display: "flex" }}>
              <FileText size={20} color="#4088ff" />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" gap={0.75}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Sales Orders</Typography>
                <Chip label={rows.length} size="small"
                  sx={{ bgcolor: "#eaf2ff", color: "#4088ff", fontWeight: 700, fontSize: 11, height: 20, borderRadius: "5px" }} />
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#667085" }}>Manage your sales orders</Typography>
            </Box>
          </Stack>

          <Stack direction="row" gap={1} alignItems="center">
            <TextField size="small" placeholder="Search orders…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 15, color: "#9ca3af" }} /></InputAdornment> }}
              sx={{ width: 220, "& .MuiOutlinedInput-root": { height: 34, fontSize: 13, borderRadius: "7px" } }} />
            <Button variant="primary" onClick={() => navigate("/sales-orders/new")}
              sx={{ height: 34, px: 2, fontSize: 13, display: "flex", gap: 0.75, alignItems: "center" }}>
              <AddRoundedIcon sx={{ fontSize: 18 }} /> New
            </Button>
            <Tooltip title="More">
              <IconButton size="small" onClick={(e) => setMoreAnchor(e.currentTarget)}
                sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", width: 34, height: 34 }}>
                <MoreHorizRoundedIcon sx={{ fontSize: 18, color: "#667085" }} />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
              PaperProps={{ sx: { minWidth: 160, borderRadius: "6px", border: "1px solid #e3e7ef" } }}>
              <MenuItem onClick={() => { setMoreAnchor(null); loadRows(); }} sx={{ fontSize: 13, py: 1 }}>
                Refresh
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {/* ── Table card ─────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minHeight: 0, m: 2, bgcolor: "#fff", borderRadius: "10px", border: "1px solid #e3e7ef", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Status tabs */}
          <Box sx={{ px: 2, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
            <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)}
              sx={{
                minHeight: 42,
                "& .MuiTabs-indicator": { bgcolor: "#4088ff", height: 2 },
                "& .MuiTab-root": { textTransform: "none", fontSize: 13, fontWeight: 500, minHeight: 42, px: 0, mr: 3, color: "#667085" },
                "& .Mui-selected": { color: "#4088ff !important", fontWeight: 600 },
              }}>
              {ALL_TABS.map((t) => <Tab key={t} label={t === "All" ? "All Sales Orders" : t} />)}
            </Tabs>
          </Box>

          {/* Table */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                <CircularProgress size={26} />
                <Typography sx={{ fontSize: 13, color: "#9ca3af", mt: 1.5 }}>Loading…</Typography>
              </Stack>
            ) : filtered.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 10, gap: 1 }}>
                <FileText size={40} color="#d1d5db" />
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>
                  {search ? "No sales orders match your search" : "No sales orders yet"}
                </Typography>
                {!search && (
                  <Button variant="primary" onClick={() => navigate("/sales-orders/new")}
                    sx={{ mt: 0.5, fontSize: 13 }}>+ New Sales Order</Button>
                )}
              </Stack>
            ) : (
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TH width={100}>Date</TH>
                    <TH width={130}>Sales Order#</TH>
                    <TH width={120}>Reference#</TH>
                    <TH>Customer Name</TH>
                    <TH width={110}>Status</TH>
                    <TH width={80} align="center">Invoiced</TH>
                    <TH width={80} align="center">Payment</TH>
                    <TH width={130} align="right">Amount</TH>
                    <TH width={120}>Expected Ship.</TH>
                    <TH width={70} align="right">Actions</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={getId(row)} sx={{ "&:hover": { bgcolor: "#f7f8fb" }, "&:last-child td": { border: 0 } }}>
                      <TD sx={{ color: "#9ca3af", fontSize: 12 }}>{fmt(row.orderDate)}</TD>
                      <TD onClick={() => navigate(`/sales-orders/${getId(row)}`)}
                        sx={{ color: "#4088ff", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
                        {row.salesOrderNumber || "—"}
                      </TD>
                      <TD sx={{ color: "#6b7280", fontSize: 12 }}>{row.referenceNumber || "—"}</TD>
                      <TD onClick={() => navigate(`/sales-orders/${getId(row)}`)}
                        sx={{ fontWeight: 500, color: "#111827" }}>
                        {partyName(row)}
                      </TD>
                      <TD><StatusChip status={row.status} label={row.status} /></TD>
                      <TD align="center">
                        <DotStatus status={row.proformaInvoiceStatus || "NOT_CREATED"} />
                      </TD>
                      <TD align="center">
                        <DotStatus status={row.paymentStatus || "UNPAID"} />
                      </TD>
                      <TD align="right" sx={{ fontWeight: 600, color: "#111827" }}>
                        {money(row.totalAmount || row.amount)}
                      </TD>
                      <TD sx={{ fontSize: 12, color: "#9ca3af" }}>
                        {fmt(row.expectedShipmentDate)}
                      </TD>
                      <TD align="right">
                        <Tooltip title="Delete">
                          <IconButton size="small" disabled={deleting === getId(row)}
                            onClick={() => handleDelete(row)}
                            sx={{ color: "#9ca3af", "&:hover": { color: "#dc2626", bgcolor: "#fff1f2" } }}>
                            {deleting === getId(row)
                              ? <CircularProgress size={13} />
                              : <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Tooltip>
                      </TD>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>
      </Box>
    </AppShell>
  );
}
