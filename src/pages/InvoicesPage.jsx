import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
  TextField,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import { invoiceApi } from "../api/customerVendorApi";
import { formatDate, formatMoney } from "../components/DocumentPdfPreview";

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
const statusColor = (status) => {
  if (status === "DRAFT") return "#6b7280";
  if (status === "SENT") return "#2563eb";
  if (status === "PARTIALLY_PAID") return "#d97706";
  if (status === "PAID") return "#16a34a";
  if (status === "CANCELLED") return "#dc2626";
  return "#64748b";
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.list({ limit: 500 });
      const data = pickData(res);
      setRows(safeArray(data.items || data));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "ALL" && row.status !== filter) return false;
      if (!q) return true;
      return (
        String(row.invoiceNumber || "").toLowerCase().includes(q) ||
        String(row.salesOrderNumber || "").toLowerCase().includes(q) ||
        partyName(row).toLowerCase().includes(q)
      );
    });
  }, [filter, query, rows]);

  return (
    <AppShell>
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#fff" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 57, px: 2.2, borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>All Invoices</Typography>
            <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: "#2563eb" }} />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search invoices"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
              sx={{ width: 230, "& .MuiOutlinedInput-root": { height: 34, fontSize: 13, borderRadius: "6px" } }}
            />
            <Button onClick={() => navigate("/invoices/new")} sx={{ minWidth: 38, height: 34, px: 1 }}>
              <AddRoundedIcon sx={{ fontSize: 18 }} />
            </Button>
            <IconButton onClick={loadRows} sx={{ border: "1px solid #d7dce8", width: 34, height: 34, borderRadius: "6px" }}>
              <MoreHorizRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ px: 2, py: 1.2, borderBottom: "1px solid #edf0f6", flexShrink: 0 }}>
          {["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID"].map((s) => (
            <Chip
              key={s}
              label={s === "ALL" ? `All (${rows.length})` : s === "PARTIALLY_PAID" ? "PARTIAL" : s}
              clickable
              onClick={() => setFilter(s)}
              sx={{ height: 28, borderRadius: "14px", bgcolor: filter === s ? "#4088ff" : "#fff", color: filter === s ? "#fff" : "#344054", border: "1px solid #e3e7ef", fontSize: 12 }}
            />
          ))}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {loading ? (
            <Box sx={{ height: 240, display: "grid", placeItems: "center" }}><CircularProgress size={26} /></Box>
          ) : (
            <Box sx={{ minWidth: 1060 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "46px 1.3fr 0.9fr 0.9fr 0.8fr 0.8fr 0.9fr 0.8fr", bgcolor: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                {["", "Customer", "Invoice#", "Date", "Amount", "Balance", "Status", "Action"].map((h) => (
                  <Typography key={h} sx={{ px: 2, py: 1.2, fontSize: 11, color: "#667085", fontWeight: 700, textTransform: "uppercase" }}>{h}</Typography>
                ))}
              </Box>
              {filtered.map((row) => {
                const id = getId(row);
                const balance = row.balanceAmount ?? row.totalAmount;
                return (
                  <Box key={id} onClick={() => navigate(`/invoices/${id}`)} sx={{ display: "grid", gridTemplateColumns: "46px 1.3fr 0.9fr 0.9fr 0.8fr 0.8fr 0.9fr 0.8fr", alignItems: "center", borderBottom: "1px solid #edf0f6", cursor: "pointer", bgcolor: "#fff", "&:hover": { bgcolor: "#f8fbff" } }}>
                    <Box sx={{ px: 2 }}><Checkbox size="small" /></Box>
                    <Box sx={{ px: 2, py: 1.1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{partyName(row)}</Typography>
                      <Typography sx={{ fontSize: 12, color: "#667085" }}>{row.salesOrderNumber || "No reference"}</Typography>
                    </Box>
                    <Typography sx={{ px: 2, fontSize: 13, color: "#1d4ed8", fontWeight: 600 }}>{row.invoiceNumber || "—"}</Typography>
                    <Typography sx={{ px: 2, fontSize: 13 }}>{formatDate(row.invoiceDate)}</Typography>
                    <Typography sx={{ px: 2, fontSize: 13, fontWeight: 700 }}>{formatMoney(row.totalAmount)}</Typography>
                    <Typography sx={{ px: 2, fontSize: 13, color: Number(balance) > 0 ? "#d97706" : "#16a34a" }}>{formatMoney(balance)}</Typography>
                    <Typography sx={{ px: 2, fontSize: 12, fontWeight: 700, color: statusColor(row.status) }}>{row.status || "DRAFT"}</Typography>
                    <Box sx={{ px: 2 }}><Button variant="outline" sx={{ height: 28, fontSize: 12 }} onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${id}`); }}>View</Button></Box>
                  </Box>
                );
              })}
              {!filtered.length ? <Box sx={{ py: 8, textAlign: "center", color: "#94a3b8" }}>No invoices found</Box> : null}
            </Box>
          )}
        </Box>
      </Box>
    </AppShell>
  );
}
