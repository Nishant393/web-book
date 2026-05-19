import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
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
  Checkbox,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import RefreshRoundedIcon from "@mui/icons-material/Refresh";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { itemsApi } from "../api/itemsApi";
import { vendorApi } from "../api/customerVendorApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const UNITS = [
  "Nos", "Box", "Pack", "Pcs", "Set", "Pair", "Dozen",
  "Kg", "Gm", "Mg", "L", "ML", "M", "Cm", "MM",
  "Sq Ft", "Sq M", "Cu Ft", "Hour", "Day", "Month", "Year", "Other",
];

const GST_RATES = ["0", "5", "12", "18", "28"];

const SALES_ACCOUNTS = [
  "Sales", "Service Income", "Consulting Income", "Interest Income",
  "Commission Income", "Other Income", "Scrap Sales",
];

const PURCHASE_ACCOUNTS = [
  "Cost of Goods Sold", "Purchase Expense", "Raw Material Purchase",
  "Job Work Charges", "Freight & Transport Inward", "Other Expenses",
];

const INVENTORY_ACCOUNTS = [
  "Inventory Asset", "Finished Goods", "Raw Materials",
  "Work In Progress", "Goods In Transit",
];

const EMPTY_ITEM = {
  itemType: "GOODS",
  name: "",
  sku: "",
  unit: "",
  hsnOrSac: "",
  isTaxable: true,
  gstRate: "18",
  taxExemptionReason: "",
  salesEnabled: true,
  salesRate: "",
  salesAccount: "Sales",
  salesAccountId: "",
  salesDescription: "",
  purchaseEnabled: false,
  purchaseRate: "",
  purchaseAccount: "Cost of Goods Sold",
  purchaseAccountId: "",
  purchaseDescription: "",
  preferredVendorId: "",
  trackInventory: false,
  inventoryAccount: "Inventory Asset",
  inventoryAccountId: "",
  openingStockQty: "",
  openingStockRate: "",
  reorderPoint: "",
  isActive: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pickData = (v) => v?.data || v?.result || v || {};

const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items))   return v.items;
  if (Array.isArray(v.data))    return v.data;
  if (Array.isArray(v.results)) return v.results;
  if (v.data   && v.data   !== v) return safeArray(v.data);
  if (v.result && v.result !== v) return safeArray(v.result);
  return [];
};

const getId = (row) => String(row?._id || row?.id || "");

const money = (value) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
};

// ─── Form Sub-components ──────────────────────────────────────────────────────

function FormRow({ label, required, children }) {
  return (
    <Grid container spacing={1.5} alignItems="flex-start">
      <Grid item xs={12} md={3.5} sx={{ pt: "10px !important" }}>
        <Typography sx={{ fontSize: 13, color: required ? "#e11d48" : "#374151" }}>
          {label}{required ? "*" : ""}
        </Typography>
      </Grid>
      <Grid item xs={12} md={8.5}>{children}</Grid>
    </Grid>
  );
}

function FInput({ value, onChange, placeholder, select, children, type = "text", multiline, rows = 3, disabled }) {
  return (
    <TextField
      fullWidth size="small" type={type} select={select}
      value={value ?? ""} placeholder={placeholder}
      multiline={multiline} minRows={multiline ? rows : undefined}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        "& .MuiOutlinedInput-root": { height: multiline ? "auto" : 34, borderRadius: "5px", fontSize: 13, bgcolor: disabled ? "#f8fafc" : "#fff" },
        "& .MuiInputBase-input": { fontSize: "13px !important", py: multiline ? "8px !important" : "7px !important" },
      }}
    >
      {children}
    </TextField>
  );
}

function SectionHeader({ enabled, label, description, onChange }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
      <Checkbox checked={enabled} onChange={(e) => onChange(e.target.checked)} size="small"
        sx={{ p: 0, color: "#d1d5db", "&.Mui-checked": { color: "#4088ff" } }} />
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{label}</Typography>
        {description && <Typography sx={{ fontSize: 12, color: "#667085" }}>{description}</Typography>}
      </Box>
    </Stack>
  );
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────

function ItemFormModal({ open, onClose, mode, initialData, onSaved, vendors }) {
  const [form, setForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY_ITEM, ...initialData } : { ...EMPTY_ITEM });
      setSaving(false);
    }
  }, [open, initialData]);

  const p = (key, value) => setForm((prev) => {
    const next = { ...prev, [key]: value };
    if (key === "itemType" && value === "SERVICE") {
      next.trackInventory = false;
      next.inventoryAccountId = "";
      next.inventoryAccount = "";
      next.openingStockQty = "";
      next.openingStockRate = "";
      next.reorderPoint = "";
    }
    if (key === "isTaxable") {
      const taxable = value === true || value === "true";
      next.isTaxable = taxable;
      if (taxable)  next.taxExemptionReason = "";
      else          next.gstRate = "";
    }
    if (key === "salesEnabled" && !value) {
      next.salesRate = ""; next.salesAccountId = ""; next.salesAccount = "Sales"; next.salesDescription = "";
    }
    if (key === "purchaseEnabled" && !value) {
      next.purchaseRate = ""; next.purchaseAccountId = ""; next.purchaseAccount = "Cost of Goods Sold";
      next.purchaseDescription = ""; next.preferredVendorId = "";
    }
    if (key === "trackInventory" && !value) {
      next.inventoryAccountId = ""; next.inventoryAccount = ""; next.openingStockQty = ""; next.openingStockRate = ""; next.reorderPoint = "";
    }
    return next;
  });

  const validate = () => {
    if (!form.name.trim())  { toast.error("Item Name is required"); return false; }
    if (!form.unit.trim())  { toast.error("Unit is required"); return false; }
    if (!form.salesEnabled && !form.purchaseEnabled) { toast.error("Enable at least Sales or Purchase information"); return false; }
    if (form.salesEnabled) {
      if (form.salesRate === "" || form.salesRate === null) { toast.error("Selling Price is required"); return false; }
      if (!form.salesAccount) { toast.error("Sales Account is required"); return false; }
    }
    if (form.purchaseEnabled) {
      if (form.purchaseRate === "" || form.purchaseRate === null) { toast.error("Cost Price is required"); return false; }
      if (!form.purchaseAccount) { toast.error("Purchase Account is required"); return false; }
    }
    if (form.itemType === "GOODS" && form.trackInventory) {
      if (!form.inventoryAccount) { toast.error("Inventory Account is required"); return false; }
    }
    return true;
  };

  const handleSave = async (andNew = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        salesRate:        form.salesRate        !== "" ? Number(form.salesRate)        : null,
        purchaseRate:     form.purchaseRate     !== "" ? Number(form.purchaseRate)     : null,
        openingStockQty:  form.openingStockQty  !== "" ? Number(form.openingStockQty)  : null,
        openingStockRate: form.openingStockRate !== "" ? Number(form.openingStockRate) : null,
        reorderPoint:     form.reorderPoint     !== "" ? Number(form.reorderPoint)     : null,
        gstRate:          form.gstRate          !== "" ? Number(form.gstRate)          : null,
      };
      if (mode === "edit" && initialData) {
        await itemsApi.update(getId(initialData), payload);
        toast.success("Item updated");
      } else {
        await itemsApi.create(payload);
        toast.success("Item created");
      }
      onSaved();
      if (!andNew) onClose();
      else setForm({ ...EMPTY_ITEM });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const isGoods = form.itemType === "GOODS";

  return (
    <Modal open={open} onClose={onClose} title={mode === "edit" ? "Edit Item" : "Add New Item"} size="lg" maxBodyHeight="76vh"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          {mode === "create" && (
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>Save and New</Button>
          )}
          <Button variant="primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <CircularProgress size={14} sx={{ mr: 0.75 }} /> : null}Save
          </Button>
        </Stack>
      }
    >
      <Stack spacing={0}>
        <Box sx={{ pb: 2.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: 0.5, mb: 2 }}>Basic Details</Typography>
          <Stack spacing={1.8}>
            <FormRow label="Type">
              <RadioGroup row value={form.itemType} onChange={(e) => p("itemType", e.target.value)}>
                <FormControlLabel value="GOODS"   control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Goods</Typography>} />
                <FormControlLabel value="SERVICE" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Service</Typography>} />
              </RadioGroup>
            </FormRow>
            <FormRow label="Name" required>
              <FInput value={form.name} onChange={(v) => p("name", v)} placeholder="Item name" />
            </FormRow>
            {isGoods && (
              <FormRow label="SKU">
                <FInput value={form.sku} onChange={(v) => p("sku", v)} placeholder="Stock Keeping Unit" />
              </FormRow>
            )}
            <FormRow label="Unit" required>
              <FInput select value={form.unit} onChange={(v) => p("unit", v)}>
                <MenuItem value=""><em>Select unit</em></MenuItem>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </FInput>
            </FormRow>
            <FormRow label={isGoods ? "HSN Code" : "SAC Code"}>
              <FInput value={form.hsnOrSac} onChange={(v) => p("hsnOrSac", v)} placeholder={isGoods ? "HSN Code" : "SAC Code"} />
            </FormRow>
            <FormRow label="Tax">
              <RadioGroup row value={String(form.isTaxable)} onChange={(e) => p("isTaxable", e.target.value === "true")}>
                <FormControlLabel value="true"  control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Taxable</Typography>} />
                <FormControlLabel value="false" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Non-Taxable</Typography>} />
              </RadioGroup>
            </FormRow>
            {form.isTaxable && (
              <FormRow label="GST Rate" required>
                <FInput select value={String(form.gstRate)} onChange={(v) => p("gstRate", v)}>
                  {GST_RATES.map((r) => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                </FInput>
              </FormRow>
            )}
            {!form.isTaxable && (
              <FormRow label="Exemption Reason">
                <FInput value={form.taxExemptionReason} onChange={(v) => p("taxExemptionReason", v)} placeholder="Reason for exemption" />
              </FormRow>
            )}
            <FormRow label="Status">
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch checked={form.isActive} onChange={(e) => p("isActive", e.target.checked)} size="small"
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#4088ff" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#4088ff" } }} />
                <Typography sx={{ fontSize: 13, color: form.isActive ? "#16a34a" : "#6b7280" }}>
                  {form.isActive ? "Active" : "Inactive"}
                </Typography>
              </Stack>
            </FormRow>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ py: 2.5 }}>
          <SectionHeader enabled={form.salesEnabled} label="Sales Information" description="Enable to set selling price and sales account" onChange={(v) => p("salesEnabled", v)} />
          {form.salesEnabled && (
            <Stack spacing={1.8} sx={{ mt: 1.5, pl: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: 13, color: "#e11d48", mb: 0.5 }}>Selling Price*</Typography>
                  <TextField fullWidth size="small" type="number" value={form.salesRate} onChange={(e) => p("salesRate", e.target.value)} placeholder="0.00"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: 13, color: "#667085" }}>INR</Typography></InputAdornment> }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 } }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: 13, color: "#e11d48", mb: 0.5 }}>Account*</Typography>
                  <FInput select value={form.salesAccount} onChange={(v) => p("salesAccount", v)}>
                    {SALES_ACCOUNTS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </FInput>
                </Grid>
              </Grid>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Description</Typography>
                <FInput multiline rows={3} value={form.salesDescription} onChange={(v) => p("salesDescription", v)} placeholder="Description for sales" />
              </Box>
            </Stack>
          )}
        </Box>

        <Divider />

        <Box sx={{ py: 2.5 }}>
          <SectionHeader enabled={form.purchaseEnabled} label="Purchase Information" description="Enable to set cost price and purchase account" onChange={(v) => p("purchaseEnabled", v)} />
          {form.purchaseEnabled && (
            <Stack spacing={1.8} sx={{ mt: 1.5, pl: 4 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: 13, color: "#e11d48", mb: 0.5 }}>Cost Price*</Typography>
                  <TextField fullWidth size="small" type="number" value={form.purchaseRate} onChange={(e) => p("purchaseRate", e.target.value)} placeholder="0.00"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: 13, color: "#667085" }}>₹</Typography></InputAdornment> }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 } }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontSize: 13, color: "#e11d48", mb: 0.5 }}>Account*</Typography>
                  <FInput select value={form.purchaseAccount} onChange={(v) => p("purchaseAccount", v)}>
                    {PURCHASE_ACCOUNTS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                  </FInput>
                </Grid>
              </Grid>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Description</Typography>
                <FInput multiline rows={3} value={form.purchaseDescription} onChange={(v) => p("purchaseDescription", v)} placeholder="Description for purchase" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Preferred Vendor</Typography>
                <FInput select value={form.preferredVendorId} onChange={(v) => p("preferredVendorId", v)}>
                  <MenuItem value=""><em>Select vendor (optional)</em></MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={getId(v)} value={getId(v)}>
                      {v.vendorName || v.companyName || v.displayName || v.name || "Vendor"}
                    </MenuItem>
                  ))}
                </FInput>
              </Box>
            </Stack>
          )}
        </Box>

        {isGoods && (
          <>
            <Divider />
            <Box sx={{ py: 2.5 }}>
              <SectionHeader enabled={form.trackInventory} label="Inventory Tracking" description="Track stock levels for this item" onChange={(v) => p("trackInventory", v)} />
              {form.trackInventory && (
                <Stack spacing={1.8} sx={{ mt: 1.5, pl: 4 }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, color: "#e11d48", mb: 0.5 }}>Inventory Account*</Typography>
                    <FInput select value={form.inventoryAccount} onChange={(v) => p("inventoryAccount", v)}>
                      {INVENTORY_ACCOUNTS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                    </FInput>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Opening Stock Qty</Typography>
                      <TextField fullWidth size="small" type="number" value={form.openingStockQty} onChange={(e) => p("openingStockQty", e.target.value)} placeholder="0"
                        sx={{ "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Opening Stock Rate</Typography>
                      <TextField fullWidth size="small" type="number" value={form.openingStockRate} onChange={(e) => p("openingStockRate", e.target.value)} placeholder="0.00"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: 13, color: "#667085" }}>₹</Typography></InputAdornment> }}
                        sx={{ "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography sx={{ fontSize: 13, color: "#374151", mb: 0.5 }}>Reorder Point</Typography>
                      <TextField fullWidth size="small" type="number" value={form.reorderPoint} onChange={(e) => p("reorderPoint", e.target.value)} placeholder="Min qty"
                        sx={{ "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 } }} />
                    </Grid>
                  </Grid>
                </Stack>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ open, onClose, onConfirm, item, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Item" size="xs"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}Delete
          </Button>
        </Stack>
      }
    >
      <Stack spacing={1.5} sx={{ py: 0.5 }}>
        <Alert severity="warning" sx={{ borderRadius: "6px" }}>This action cannot be undone.</Alert>
        <Typography sx={{ fontSize: 14, color: "#374151" }}>
          Are you sure you want to delete{" "}
          <Box component="span" sx={{ fontWeight: 600, color: "#111827" }}>{item?.name || "this item"}</Box>?
        </Typography>
      </Stack>
    </Modal>
  );
}

// ─── Table Head Cell ──────────────────────────────────────────────────────────

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
    fontSize: 13, color: "#374151", py: 1.25, px: 2,
    borderBottom: "1px solid #f3f4f6", verticalAlign: "middle",
    ...(onClick ? { cursor: "pointer" } : {}),
    ...sx,
  }}>
    {children}
  </TableCell>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItemsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [search,  setSearch]  = useState("");
  const [typeFilter, setTypeFilter] = useState(0); // 0=All 1=Sales 2=Purchase

  const [formModal,    setFormModal]    = useState({ open: false, mode: "create", data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null, loading: false });

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await itemsApi.list({ limit: 500 });
      const data = pickData(res);
      setItems(safeArray(data.items || data));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const res  = await vendorApi.list({ limit: 500 });
      const data = pickData(res);
      setVendors(safeArray(data.items || data));
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadItems(); loadVendors(); }, [loadItems, loadVendors]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setFormModal({ open: true, mode: "create", data: null });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── Filtered ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter === 1) list = list.filter((i) => i.salesEnabled);
    if (typeFilter === 2) list = list.filter((i) => i.purchaseEnabled);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((i) =>
      (i.name  || "").toLowerCase().includes(q) ||
      (i.sku   || "").toLowerCase().includes(q) ||
      (i.hsnOrSac || "").toLowerCase().includes(q)
    );
    return list;
  }, [items, typeFilter, search]);

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    const item = deleteDialog.item;
    if (!item) return;
    setDeleteDialog((p) => ({ ...p, loading: true }));
    try {
      await itemsApi.delete(getId(item));
      toast.success("Item deleted");
      setDeleteDialog({ open: false, item: null, loading: false });
      loadItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete item");
      setDeleteDialog((p) => ({ ...p, loading: false }));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Box sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{ bgcolor: "#eaf2ff", borderRadius: "10px", p: 1, display: "flex" }}>
              <Inventory2RoundedIcon sx={{ fontSize: 26, color: "#4088ff" }} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Items</Typography>
                <Chip label={items.length} size="small"
                  sx={{ bgcolor: "#eaf2ff", color: "#4088ff", fontWeight: 700, fontSize: 12, height: 22, borderRadius: "6px" }} />
              </Stack>
              <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.15 }}>Manage your products and services</Typography>
            </Box>
          </Stack>

          <Stack direction="row" gap={1.25} alignItems="center">
            <TextField
              size="small" placeholder="Search items..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 16, color: "#9ca3af" }} /></InputAdornment> }}
              sx={{ width: 230, "& .MuiOutlinedInput-root": { height: 36, fontSize: 13, borderRadius: "7px" } }}
            />
            <Button variant="outline" onClick={loadItems}
              sx={{ height: 36, px: 1.75, fontSize: 13, display: "flex", gap: 0.75, alignItems: "center" }}>
              <RefreshRoundedIcon sx={{ fontSize: 17 }} /> Refresh
            </Button>
            <Button variant="primary" onClick={() => setFormModal({ open: true, mode: "create", data: null })}
              sx={{ height: 36, px: 2, fontSize: 13, display: "flex", gap: 0.75, alignItems: "center" }}>
              <AddRoundedIcon sx={{ fontSize: 18 }} /> Add Item
            </Button>
          </Stack>
        </Stack>

        {/* ── Table Card ──────────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minHeight: 0, bgcolor: "#fff", borderRadius: "10px", border: "1px solid #e3e7ef", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tabs */}
          <Box sx={{ px: 2, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
            <Tabs value={typeFilter} onChange={(_, v) => setTypeFilter(v)}
              sx={{
                minHeight: 44,
                "& .MuiTabs-indicator": { bgcolor: "#4088ff", height: 2 },
                "& .MuiTab-root": { textTransform: "none", fontSize: 13, fontWeight: 500, minHeight: 44, px: 0, mr: 3, color: "#667085" },
                "& .Mui-selected": { color: "#4088ff !important", fontWeight: 600 },
              }}>
              <Tab label="All Items" />
              <Tab label="Sales" />
              <Tab label="Purchase" />
            </Tabs>
          </Box>

          {/* Table */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                <CircularProgress size={28} />
                <Typography sx={{ fontSize: 13, color: "#9ca3af", mt: 1.5 }}>Loading items…</Typography>
              </Stack>
            ) : filtered.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 10, gap: 1.5 }}>
                <Inventory2RoundedIcon sx={{ fontSize: 44, color: "#d1d5db" }} />
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>
                  {search ? "No items match your search" : "No items yet"}
                </Typography>
                {!search && (
                  <Button variant="primary" onClick={() => setFormModal({ open: true, mode: "create", data: null })}
                    sx={{ mt: 0.5, fontSize: 13, display: "flex", gap: 0.75, alignItems: "center" }}>
                    <AddRoundedIcon sx={{ fontSize: 17 }} /> Add Item
                  </Button>
                )}
              </Stack>
            ) : (
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TH width={52}>S.NO</TH>
                    <TH>Item Name</TH>
                    <TH width={100}>Type</TH>
                    <TH width={80}>Unit</TH>
                    <TH width={120}>HSN/SAC</TH>
                    <TH width={130} align="right">Sales Rate</TH>
                    <TH width={130} align="right">Purchase Rate</TH>
                    <TH width={140}>Enabled</TH>
                    <TH width={100}>Status</TH>
                    <TH width={100} align="right">Actions</TH>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item, idx) => {
                    const enabledLabel = item.salesEnabled && item.purchaseEnabled
                      ? "Sales & Purchase"
                      : item.salesEnabled ? "Sales"
                      : item.purchaseEnabled ? "Purchase"
                      : "—";
                    return (
                      <TableRow key={getId(item)}
                        sx={{ "&:hover": { bgcolor: "#f7f8fb" }, "&:last-child td": { border: 0 } }}>
                        <TD sx={{ color: "#9ca3af" }}>{idx + 1}</TD>
                        <TD onClick={() => navigate(`/items/${getId(item)}`)}
                          sx={{ color: "#111827", fontWeight: 500, "&:hover": { color: "#4088ff" } }}>
                          {item.name}
                        </TD>
                        <TD>
                          <Chip
                            label={item.itemType === "GOODS" ? "Goods" : "Service"} size="small"
                            sx={{
                              bgcolor: item.itemType === "GOODS" ? "#f0fdf4" : "#eff6ff",
                              color:   item.itemType === "GOODS" ? "#16a34a" : "#2563eb",
                              fontWeight: 600, fontSize: 11, height: 22, borderRadius: "5px",
                            }}
                          />
                        </TD>
                        <TD>{item.unit || "—"}</TD>
                        <TD>{item.hsnOrSac || "—"}</TD>
                        <TD align="right" sx={{ fontWeight: item.salesEnabled ? 500 : 400, color: item.salesEnabled ? "#111827" : "#d1d5db" }}>
                          {item.salesEnabled ? money(item.salesRate) : "—"}
                        </TD>
                        <TD align="right" sx={{ fontWeight: item.purchaseEnabled ? 500 : 400, color: item.purchaseEnabled ? "#111827" : "#d1d5db" }}>
                          {item.purchaseEnabled ? money(item.purchaseRate) : "—"}
                        </TD>
                        <TD>
                          <Typography sx={{ fontSize: 13, color: "#4088ff", fontWeight: 500 }}>{enabledLabel}</Typography>
                        </TD>
                        <TD>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: item.isActive !== false ? "#16a34a" : "#6b7280" }}>
                            {item.isActive !== false ? "Active" : "Inactive"}
                          </Typography>
                        </TD>
                        <TD align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip title="View detail">
                              <IconButton size="small" onClick={() => navigate(`/items/${getId(item)}`)}
                                sx={{ color: "#9ca3af", "&:hover": { color: "#4088ff", bgcolor: "#eaf2ff" } }}>
                                <VisibilityRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => setFormModal({ open: true, mode: "edit", data: item })}
                                sx={{ color: "#9ca3af", "&:hover": { color: "#374151", bgcolor: "#f3f4f6" } }}>
                                <EditRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => setDeleteDialog({ open: true, item, loading: false })}
                                sx={{ color: "#9ca3af", "&:hover": { color: "#dc2626", bgcolor: "#fff1f2" } }}>
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TD>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </Box>
      </Box>

      <ItemFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, mode: "create", data: null })}
        mode={formModal.mode}
        initialData={formModal.data}
        vendors={vendors}
        onSaved={loadItems}
      />

      <DeleteConfirmModal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null, loading: false })}
        onConfirm={handleDelete}
        item={deleteDialog.item}
        loading={deleteDialog.loading}
      />
    </AppShell>
  );
}
