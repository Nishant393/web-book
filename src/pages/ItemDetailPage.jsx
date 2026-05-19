import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  InputBase,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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
  "Inventory Asset", "Finished Goods", "Raw Materials", "Work In Progress", "Goods In Transit",
];

const EMPTY_ITEM = {
  itemType: "GOODS", name: "", sku: "", unit: "", hsnOrSac: "",
  isTaxable: true, gstRate: "18", taxExemptionReason: "",
  salesEnabled: true, salesRate: "", salesAccount: "Sales", salesAccountId: "", salesDescription: "",
  purchaseEnabled: false, purchaseRate: "", purchaseAccount: "Cost of Goods Sold", purchaseAccountId: "",
  purchaseDescription: "", preferredVendorId: "",
  trackInventory: false, inventoryAccount: "Inventory Asset", inventoryAccountId: "",
  openingStockQty: "", openingStockRate: "", reorderPoint: "", isActive: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pickData = (v) => v?.data || v?.result || v || {};
const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.data)) return v.data;
  if (v.data && v.data !== v) return safeArray(v.data);
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
    if (open) { setForm(initialData ? { ...EMPTY_ITEM, ...initialData } : { ...EMPTY_ITEM }); setSaving(false); }
  }, [open, initialData]);

  const p = (key, value) => setForm((prev) => {
    const next = { ...prev, [key]: value };
    if (key === "itemType" && value === "SERVICE") {
      next.trackInventory = false; next.inventoryAccountId = ""; next.inventoryAccount = "";
      next.openingStockQty = ""; next.openingStockRate = ""; next.reorderPoint = "";
    }
    if (key === "isTaxable") {
      const taxable = value === true || value === "true"; next.isTaxable = taxable;
      if (taxable) next.taxExemptionReason = ""; else next.gstRate = "";
    }
    if (key === "salesEnabled" && !value) { next.salesRate = ""; next.salesAccountId = ""; next.salesAccount = "Sales"; next.salesDescription = ""; }
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
    if (!form.name.trim()) { toast.error("Item Name is required"); return false; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return false; }
    if (!form.salesEnabled && !form.purchaseEnabled) { toast.error("Enable at least Sales or Purchase information"); return false; }
    if (form.salesEnabled) {
      if (form.salesRate === "" || form.salesRate === null) { toast.error("Selling Price is required"); return false; }
      if (!form.salesAccount) { toast.error("Sales Account is required"); return false; }
    }
    if (form.purchaseEnabled) {
      if (form.purchaseRate === "" || form.purchaseRate === null) { toast.error("Cost Price is required"); return false; }
      if (!form.purchaseAccount) { toast.error("Purchase Account is required"); return false; }
    }
    if (form.itemType === "GOODS" && form.trackInventory && !form.inventoryAccount) { toast.error("Inventory Account is required"); return false; }
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
    } finally { setSaving(false); }
  };

  const isGoods = form.itemType === "GOODS";

  return (
    <Modal open={open} onClose={onClose} title={mode === "edit" ? "Edit Item" : "Add New Item"} size="lg" maxBodyHeight="76vh"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          {mode === "create" && <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>Save and New</Button>}
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
            <FormRow label="Name" required><FInput value={form.name} onChange={(v) => p("name", v)} placeholder="Item name" /></FormRow>
            {isGoods && <FormRow label="SKU"><FInput value={form.sku} onChange={(v) => p("sku", v)} placeholder="Stock Keeping Unit" /></FormRow>}
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
                <Typography sx={{ fontSize: 13, color: form.isActive ? "#16a34a" : "#6b7280" }}>{form.isActive ? "Active" : "Inactive"}</Typography>
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
                    <MenuItem key={getId(v)} value={getId(v)}>{v.vendorName || v.companyName || v.displayName || "Vendor"}</MenuItem>
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

// ─── Detail Row / Section ─────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <Stack direction="row" sx={{ py: 1.1, borderBottom: "1px solid #f3f4f6" }}>
      <Typography sx={{ fontSize: 13, color: "#9ca3af", minWidth: 180, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: "#374151" }}>{value}</Typography>
    </Stack>
  );
}

function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1a2236", mb: 1.5 }}>{title}</Typography>
      <Box sx={{ bgcolor: "#fff" }}>{children}</Box>
    </Box>
  );
}

// ─── Item Overview Tab ────────────────────────────────────────────────────────

function ItemOverview({ item, vendorName }) {
  if (!item) return null;

  const enabledLabel = item.salesEnabled && item.purchaseEnabled
    ? "Sales and Purchase Items"
    : item.salesEnabled ? "Sales Item"
    : item.purchaseEnabled ? "Purchase Item"
    : item.itemType === "SERVICE" ? "Service" : "Goods";

  const taxLabel = item.isTaxable
    ? `Taxable — ${item.gstRate ?? 0}% GST`
    : `Non-Taxable${item.taxExemptionReason ? ` — ${item.taxExemptionReason}` : ""}`;

  return (
    <Box sx={{ px: 4, py: 3, overflowY: "auto", flex: 1 }}>
      {/* Basic info */}
      <Box sx={{ mb: 3 }}>
        <DetailRow label="Item Type"     value={enabledLabel} />
        <DetailRow label="Unit"          value={item.unit} />
        <DetailRow label="SKU"           value={item.sku || null} />
        <DetailRow label={item.itemType === "SERVICE" ? "SAC Code" : "HSN Code"} value={item.hsnOrSac || null} />
        <DetailRow label="Tax"           value={taxLabel} />
        <DetailRow label="Created Source" value="User" />
      </Box>

      {/* Purchase Information */}
      {item.purchaseEnabled && (
        <DetailSection title="Purchase Information">
          <DetailRow label="Cost Price"       value={money(item.purchaseRate)} />
          <DetailRow label="Purchase Account" value={item.purchaseAccount} />
          {item.purchaseDescription && <DetailRow label="Description" value={item.purchaseDescription} />}
          {vendorName && <DetailRow label="Preferred Vendor" value={vendorName} />}
        </DetailSection>
      )}

      {/* Sales Information */}
      {item.salesEnabled && (
        <DetailSection title="Sales Information">
          <DetailRow label="Selling Price"  value={money(item.salesRate)} />
          <DetailRow label="Sales Account"  value={item.salesAccount} />
          {item.salesDescription && <DetailRow label="Description" value={item.salesDescription} />}
        </DetailSection>
      )}

      {/* Inventory Information */}
      {item.trackInventory && (
        <DetailSection title="Inventory Information">
          <DetailRow label="Inventory Account"  value={item.inventoryAccount} />
          <DetailRow label="Opening Stock Qty"  value={item.openingStockQty != null ? String(item.openingStockQty) : null} />
          <DetailRow label="Opening Stock Rate" value={item.openingStockRate != null ? money(item.openingStockRate) : null} />
          <DetailRow label="Current Stock"      value={item.currentStockQty != null ? String(item.currentStockQty) : null} />
          <DetailRow label="Reorder Point"      value={item.reorderPoint != null ? String(item.reorderPoint) : null} />
        </DetailSection>
      )}

      {/* Reporting Tags */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#1a2236", mb: 1.5 }}>Reporting Tags</Typography>
        <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>No reporting tag has been associated with this item.</Typography>
      </Box>
    </Box>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function ItemDetailPage() {
  const navigate  = useNavigate();
  const { itemId } = useParams();

  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [vendors,  setVendors]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [search,   setSearch]   = useState("");

  // Left panel filter
  const [statusFilter, setStatusFilter] = useState("active");
  const [filterAnchor, setFilterAnchor] = useState(null);

  // Right panel more menu
  const [moreAnchor, setMoreAnchor] = useState(null);

  // Modals
  const [formModal,    setFormModal]    = useState({ open: false, mode: "edit", data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null, loading: false });

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await itemsApi.list({ limit: 500 });
      const data = pickData(res);
      const list = safeArray(data.items || data);
      setItems(list);
      return list;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load items");
      return [];
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

  useEffect(() => {
    (async () => {
      const list = await loadItems();
      if (itemId && list.length) {
        const found = list.find((i) => getId(i) === itemId);
        if (found) setSelected(found);
      }
      loadVendors();
    })();
  }, []); // eslint-disable-line

  // Sync selected when itemId changes (e.g. back/forward)
  useEffect(() => {
    if (!itemId || items.length === 0) return;
    const found = items.find((i) => getId(i) === itemId);
    if (found) setSelected(found);
  }, [itemId, items]);

  // ── Filtered left-panel list ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter === "active")   list = list.filter((i) => i.isActive !== false);
    if (statusFilter === "inactive") list = list.filter((i) => i.isActive === false);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((i) => (i.name || "").toLowerCase().includes(q));
    return list;
  }, [items, statusFilter, search]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    const item = deleteDialog.item;
    if (!item) return;
    setDeleteDialog((p) => ({ ...p, loading: true }));
    try {
      await itemsApi.delete(getId(item));
      toast.success("Item deleted");
      setDeleteDialog({ open: false, item: null, loading: false });
      navigate("/items");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete item");
      setDeleteDialog((p) => ({ ...p, loading: false }));
    }
  };

  const handleItemSaved = async () => {
    const list = await loadItems();
    const updatedItem = list.find((i) => getId(i) === getId(selected));
    if (updatedItem) setSelected(updatedItem);
    setFormModal({ open: false, mode: "edit", data: null });
  };

  const selectItem = (item) => {
    setSelected(item);
    setDetailTab(0);
    navigate(`/items/${getId(item)}`, { replace: true });
  };

  // ── Vendor name ─────────────────────────────────────────────────────────────

  const vendorName = useMemo(() => {
    if (!selected?.preferredVendorId) return null;
    const vid = String(selected.preferredVendorId);
    const v = vendors.find((x) => getId(x) === vid);
    return v ? (v.vendorName || v.companyName || v.displayName || "") : null;
  }, [selected, vendors]);

  const filterLabel = statusFilter === "active" ? "Active Items" : statusFilter === "inactive" ? "Inactive Items" : "All Items";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", bgcolor: "#fff" }}>

        {/* ══ LEFT PANEL ═══════════════════════════════════════════════════════ */}
        <Box sx={{
          width: 290, flexShrink: 0,
          borderRight: "1px solid #e3e7ef",
          display: "flex", flexDirection: "column",
          bgcolor: "#fff", height: "100%",
        }}>
          {/* Left header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 1.75, py: 1.25, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: "pointer" }}
              onClick={(e) => setFilterAnchor(e.currentTarget)}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{filterLabel}</Typography>
              <ExpandMoreRoundedIcon sx={{ fontSize: 17, color: "#667085" }} />
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Add Item">
                <IconButton size="small" onClick={() => setFormModal({ open: true, mode: "create", data: null })}
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

          {/* Filter menu */}
          <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}
            PaperProps={{ sx: { minWidth: 180, borderRadius: "6px", border: "1px solid #e3e7ef", boxShadow: "0 8px 24px rgba(16,24,40,0.12)" } }}>
            {[["active", "Active Items"], ["inactive", "Inactive Items"], ["all", "All Items"]].map(([val, lbl]) => (
              <MenuItem key={val} selected={statusFilter === val}
                onClick={() => { setStatusFilter(val); setFilterAnchor(null); }}
                sx={{ fontSize: 13, py: 1, "&.Mui-selected": { bgcolor: "#eaf2ff", color: "#4088ff", fontWeight: 600 } }}>
                {lbl}
              </MenuItem>
            ))}
          </Menu>

          {/* Search */}
          <Box sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: "1px solid #f3f4f6" }}>
            <Box sx={{ display: "flex", alignItems: "center", bgcolor: "#f7f8fb", borderRadius: "6px", px: 1, height: 32, gap: 0.75 }}>
              <SearchRoundedIcon sx={{ fontSize: 15, color: "#9ca3af", flexShrink: 0 }} />
              <InputBase
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                sx={{ flex: 1, fontSize: 13, color: "#374151", "& input": { p: 0 } }}
              />
            </Box>
          </Box>

          {/* Item list */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loading && items.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>
            ) : filtered.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 5, px: 2, gap: 1 }}>
                <Inventory2RoundedIcon sx={{ fontSize: 32, color: "#d1d5db" }} />
                <Typography sx={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                  {search ? "No items match search" : "No items"}
                </Typography>
              </Stack>
            ) : (
              filtered.map((item) => {
                const isSelected = selected && getId(selected) === getId(item);
                const displayRate = item.salesEnabled ? item.salesRate : item.purchaseRate;
                return (
                  <Stack key={getId(item)} direction="row" alignItems="center"
                    onClick={() => selectItem(item)}
                    sx={{
                      px: 1.5, py: 1.1, cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                      bgcolor: isSelected ? "#eaf2ff" : "transparent",
                      borderLeft: isSelected ? "3px solid #4088ff" : "3px solid transparent",
                      "&:hover": { bgcolor: isSelected ? "#eaf2ff" : "#f7f8fb" },
                      transition: "background-color 0.1s",
                    }}>
                    <Checkbox size="small" checked={isSelected} readOnly
                      sx={{ p: 0, mr: 1, color: "#d1d5db", "&.Mui-checked": { color: "#4088ff" }, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
                      <Typography sx={{
                        fontSize: 13, fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "#1d4ed8" : "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.name}
                      </Typography>
                    </Box>
                    {displayRate != null && (
                      <Typography sx={{ fontSize: 13, fontWeight: 500, color: isSelected ? "#1d4ed8" : "#374151", whiteSpace: "nowrap" }}>
                        {money(displayRate)}
                      </Typography>
                    )}
                  </Stack>
                );
              })
            )}
          </Box>
        </Box>

        {/* ══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
        {selected ? (
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff" }}>

            {/* Detail header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
              sx={{ px: 3, py: 1.5, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected.name}
              </Typography>

              <Stack direction="row" spacing={0.75} alignItems="center">
                <Tooltip title="Edit item">
                  <IconButton size="small" onClick={() => setFormModal({ open: true, mode: "edit", data: selected })}
                    sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", width: 32, height: 32, color: "#374151", "&:hover": { bgcolor: "#f3f4f6" } }}>
                    <EditRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

                <Box>
                  <Button variant="outline" endIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />}
                    onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ fontSize: 13, height: 32, px: 1.5 }}>
                    More
                  </Button>
                </Box>
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
                  PaperProps={{ sx: { minWidth: 160, borderRadius: "6px", border: "1px solid #e3e7ef", boxShadow: "0 8px 24px rgba(16,24,40,0.12)" } }}>
                  <MenuItem onClick={() => { setMoreAnchor(null); setFormModal({ open: true, mode: "edit", data: selected }); }}
                    sx={{ fontSize: 13, py: 1, gap: 1.25 }}>
                    <EditRoundedIcon sx={{ fontSize: 15, color: "#667085" }} /> Edit
                  </MenuItem>
                  <MenuItem onClick={() => { setMoreAnchor(null); setDeleteDialog({ open: true, item: selected, loading: false }); }}
                    sx={{ fontSize: 13, py: 1, gap: 1.25, color: "#dc2626" }}>
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} /> Delete
                  </MenuItem>
                </Menu>

                <Tooltip title="Back to list">
                  <IconButton size="small" onClick={() => navigate("/items")}
                    sx={{ border: "1px solid #e3e7ef", borderRadius: "6px", width: 32, height: 32, color: "#374151", "&:hover": { bgcolor: "#f3f4f6" } }}>
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Tabs */}
            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)}
              sx={{
                px: 3, borderBottom: "1px solid #e3e7ef", flexShrink: 0, minHeight: 44,
                "& .MuiTabs-indicator": { bgcolor: "#4088ff", height: 2 },
                "& .MuiTab-root": { textTransform: "none", fontSize: 13, fontWeight: 500, minHeight: 44, px: 0, mr: 3.5, color: "#667085" },
                "& .Mui-selected": { color: "#4088ff !important", fontWeight: 600 },
              }}>
              <Tab label="Overview" />
              <Tab label="Transactions" />
              <Tab label="History" />
            </Tabs>

            {/* Tab content */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {detailTab === 0 && <ItemOverview item={selected} vendorName={vendorName} />}
              {detailTab === 1 && (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 10, gap: 1, color: "#9ca3af" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>No transactions found for this item.</Typography>
                  <Typography sx={{ fontSize: 13 }}>Transactions will appear here once this item is used in sales orders, invoices, or bills.</Typography>
                </Stack>
              )}
              {detailTab === 2 && (
                <Stack alignItems="center" justifyContent="center" sx={{ py: 10, gap: 1, color: "#9ca3af" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>No history available.</Typography>
                </Stack>
              )}
            </Box>
          </Box>
        ) : (
          /* Loading / not found state */
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", bgcolor: "#fafbfc", gap: 1.5 }}>
            {loading ? (
              <CircularProgress size={28} />
            ) : (
              <>
                <Inventory2RoundedIcon sx={{ fontSize: 48, color: "#d1d5db" }} />
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#374151" }}>Item not found</Typography>
                <Button variant="outline" onClick={() => navigate("/items")}
                  sx={{ mt: 0.5, fontSize: 13, display: "flex", gap: 0.75, alignItems: "center" }}>
                  <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Back to Items
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>

      <ItemFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, mode: "edit", data: null })}
        mode={formModal.mode}
        initialData={formModal.data}
        vendors={vendors}
        onSaved={handleItemSaved}
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
