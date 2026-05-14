import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Plus, RefreshCcw, Search, Store, Users } from "lucide-react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { customerApi, vendorApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";
import { Card, FormField, Label, PAGE_PAD_SX, PAGE_SX, PageBar, ZohoStat, getId, money, pickData, safeArray } from "./businessUtils.jsx";

const BASE_CUSTOMER_FORM = {
  customerType: "Business",
  salutation: "",
  firstName: "",
  lastName: "",
  companyName: "",
  customerName: "",
  displayName: "",
  email: "",
  workPhone: "",
  mobile: "",
  language: "English",
  pan: "",
  currency: "INR",
  accountsReceivable: "",
  paymentTerms: "Due on Receipt",
  enablePortal: false,
  billingAddress: "",
  shippingAddress: "",
  remarks: "",
};

const BASE_VENDOR_FORM = {
  vendorType: "Business",
  salutation: "",
  firstName: "",
  lastName: "",
  companyName: "",
  vendorName: "",
  displayName: "",
  email: "",
  workPhone: "",
  mobile: "",
  language: "English",
  pan: "",
  currency: "INR",
  accountsPayable: "",
  paymentTerms: "Due on Receipt",
  billingAddress: "",
  shippingAddress: "",
  remarks: "",
};

const CONFIGS = {
  customer: {
    title: "Active Customers",
    newTitle: "New Customer",
    singular: "Customer",
    nameKey: "customerName",
    displayKey: "displayName",
    api: customerApi,
    detailPath: "/customers",
    icon: Users,
    totalOrderKey: "totalSalesOrderAmount",
    totalPaidKey: "totalPaymentReceived",
    paidLabel: "Received",
    remainingLabel: "Receivable",
    emptyForm: BASE_CUSTOMER_FORM,
    accountLabel: "Accounts Receivable",
    typeKey: "customerType",
    nameLabel: "Display Name",
  },
  vendor: {
    title: "Active Vendors",
    newTitle: "New Vendor",
    singular: "Vendor",
    nameKey: "vendorName",
    displayKey: "displayName",
    api: vendorApi,
    detailPath: "/vendors",
    icon: Store,
    totalOrderKey: "totalPurchaseOrderAmount",
    totalPaidKey: "totalPaymentMade",
    paidLabel: "Paid",
    remainingLabel: "Payable",
    emptyForm: BASE_VENDOR_FORM,
    accountLabel: "Accounts Payable",
    typeKey: "vendorType",
    nameLabel: "Display Name",
  },
};

const salutationOptions = ["Mr.", "Mrs.", "Ms.", "Dr.", "M/s"];

function makeDisplayName(form, cfg) {
  const existing = String(form[cfg.nameKey] || form.displayName || "").trim();
  if (existing) return existing;
  const personal = [form.salutation, form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  return form.companyName || personal || "";
}

export default function BusinessListPage({ type }) {
  const cfg = CONFIGS[type];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState(cfg.emptyForm);
  const [formTab, setFormTab] = useState(0);
  const Icon = cfg.icon;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cfg.api.list({ limit: 500, search: search || undefined });
      setItems(safeArray(pickData(res).items || pickData(res)));
    } catch (e) {
      toast.error(e?.response?.data?.message || `Failed to load ${cfg.title}`);
    } finally {
      setLoading(false);
    }
  }, [cfg, search]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { if (params.get("create") === "1") { openAdd(); setParams({}); } }, []); // eslint-disable-line

  const totals = useMemo(() => items.reduce((a, r) => ({
    order: a.order + Number(r?.summary?.[cfg.totalOrderKey] || 0),
    paid: a.paid + Number(r?.summary?.[cfg.totalPaidKey] || 0),
    remaining: a.remaining + Number(r?.summary?.remainingPayment || 0),
  }), { order: 0, paid: 0, remaining: 0 }), [items, cfg]);

  const openAdd = () => { setEditing(null); setForm({ ...cfg.emptyForm }); setFormTab(0); setModalOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...cfg.emptyForm, ...row, [cfg.nameKey]: row?.[cfg.nameKey] || row?.displayName || "" });
    setFormTab(0);
    setModalOpen(true);
  };

  const save = async () => {
    const displayName = makeDisplayName(form, cfg);
    if (!displayName) return toast.error(`${cfg.singular} display name is required`);
    setSaving(true);
    try {
      const payload = { ...form, displayName, [cfg.nameKey]: displayName };
      if (editing) { await cfg.api.update(getId(editing), payload); toast.success(`${cfg.singular} updated`); }
      else { await cfg.api.create(payload); toast.success(`${cfg.singular} created`); }
      setModalOpen(false);
      await loadItems();
    } catch (e) { toast.error(e?.response?.data?.message || `Failed to save ${cfg.singular}`); }
    finally { setSaving(false); }
  };

  const deleteItem = async () => {
    if (!confirm) return;
    setSaving(true);
    try { await cfg.api.delete(getId(confirm)); toast.success(`${cfg.singular} deleted`); setConfirm(null); await loadItems(); }
    catch (e) { toast.error(e?.response?.data?.message || `Failed to delete ${cfg.singular}`); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: "select", header: "", width: 36, render: () => <Checkbox size="small" /> },
    { key: "name", header: cfg.singular, render: (r) => <Stack><Typography sx={{ color: "#1f6ff2", fontSize: 13 }}>{r.displayName || r[cfg.nameKey]}</Typography><Typography sx={{ fontSize: 12, color: "#667085" }}>{r.companyName || r.contactPerson || "Contact not added"}</Typography></Stack> },
    { key: "mobile", header: "Phone", render: (r) => r.mobile || r.workPhone || "-" },
    { key: "email", header: "Email", render: (r) => r.email || "-" },
    { key: "orders", header: cfg.singular === "Customer" ? "Sales Orders" : "Purchase Orders", align: "right", render: (r) => money(r?.summary?.[cfg.totalOrderKey]) },
    { key: "paid", header: cfg.paidLabel, align: "right", render: (r) => money(r?.summary?.[cfg.totalPaidKey]) },
    { key: "remaining", header: cfg.remainingLabel, align: "right", render: (r) => money(r?.summary?.remainingPayment) },
    { key: "action", header: "", align: "right", render: (r) => <Stack direction="row" spacing={1} justifyContent="flex-end"><Button variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button><Button variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirm(r); }}>Delete</Button></Stack> },
  ];

  return <AppShell><HistoricalUiStyles /><Box sx={PAGE_SX}>
    <PageBar title={cfg.title} subtitle={`Manage ${cfg.title.toLowerCase()} with orders, transactions, documents and bank account details.`}>
      <Button variant="outline" icon={RefreshCcw} onClick={loadItems}>Refresh</Button><Button icon={Plus} onClick={openAdd}>New {cfg.singular}</Button>
    </PageBar>
    <Box sx={{ ...PAGE_PAD_SX, height: "calc(100% - 58px)", overflow: "auto" }}>
      <Grid container spacing={2} sx={{ mb: 2 }}><Grid item xs={12} md={4}><ZohoStat label="Total" value={money(totals.order)} /></Grid><Grid item xs={12} md={4}><ZohoStat label={cfg.paidLabel} value={money(totals.paid)} accent="#18b779" /></Grid><Grid item xs={12} md={4}><ZohoStat label={cfg.remainingLabel} value={money(totals.remaining)} accent="#f59e0b" /></Grid></Grid>
      <Card title={<Stack direction="row" spacing={1} alignItems="center"><Icon size={18}/><span>{cfg.title}</span></Stack>} action={<TextField size="small" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <Search size={15} /> }} /> } bodySx={{ p: 0 }}>
        <DataTable columns={columns} rows={items.map((r) => ({ ...r, __rowKey: getId(r) }))} loading={loading} emptyText={`No ${cfg.title.toLowerCase()} found`} minWidth={1120} onRowClick={(row) => navigate(`${cfg.detailPath}/${getId(row)}`)} stickyHeader />
      </Card>
    </Box>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? "Edit" : cfg.newTitle}`} size="lg" maxBodyHeight="78vh" footer={<Stack direction="row" spacing={1}><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></Stack>}>
      <Stack spacing={2}>
        <Box sx={{ bgcolor: "#eaf4ff", color: "#111827", fontSize: 13, px: 1.4, py: 1, borderRadius: 1 }}>
          Prefill {cfg.singular.toLowerCase()} details from the GST portal using GSTIN. <Box component="span" sx={{ color: "#1f6ff2" }}>Prefill &gt;</Box>
        </Box>
        <Grid container spacing={1.8} alignItems="center">
          <Grid item xs={12} md={2}><Label>{cfg.singular} Type</Label></Grid>
          <Grid item xs={12} md={6}><RadioGroup row value={form[cfg.typeKey] || "Business"} onChange={(e) => setForm((p) => ({ ...p, [cfg.typeKey]: e.target.value }))}><FormControlLabel value="Business" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Business</Typography>} /><FormControlLabel value="Individual" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>Individual</Typography>} /></RadioGroup></Grid>
          <Grid item xs={12} md={4} />
          <Grid item xs={12} md={2}><Label>Primary Contact</Label></Grid>
          <Grid item xs={12} md={2}><Select fullWidth size="small" displayEmpty value={form.salutation || ""} onChange={(e) => setForm((p) => ({ ...p, salutation: e.target.value }))}><MenuItem value="">Salutation</MenuItem>{salutationOptions.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</Select></Grid>
          <Grid item xs={12} md={2}><FormField placeholder="First Name" value={form.firstName} onChange={(v) => setForm((p) => ({ ...p, firstName: v }))} /></Grid>
          <Grid item xs={12} md={2}><FormField placeholder="Last Name" value={form.lastName} onChange={(v) => setForm((p) => ({ ...p, lastName: v }))} /></Grid>
          <Grid item xs={12} md={4} />
          <Grid item xs={12} md={2}><Label>Company Name</Label></Grid>
          <Grid item xs={12} md={4}><FormField value={form.companyName} onChange={(v) => setForm((p) => ({ ...p, companyName: v }))} /></Grid>
          <Grid item xs={12} md={6} />
          <Grid item xs={12} md={2}><Label required>{cfg.nameLabel}</Label></Grid>
          <Grid item xs={12} md={4}><FormField placeholder="Select or type to add" value={form[cfg.nameKey] || form.displayName || ""} onChange={(v) => setForm((p) => ({ ...p, [cfg.nameKey]: v, displayName: v }))} /></Grid>
          <Grid item xs={12} md={6} />
          <Grid item xs={12} md={2}><Label>Email Address</Label></Grid>
          <Grid item xs={12} md={4}><FormField value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} /></Grid>
          <Grid item xs={12} md={6} />
          <Grid item xs={12} md={2}><Label>Phone</Label></Grid>
          <Grid item xs={12} md={2}><FormField placeholder="Work Phone" value={form.workPhone} onChange={(v) => setForm((p) => ({ ...p, workPhone: v }))} /></Grid>
          <Grid item xs={12} md={2}><FormField placeholder="Mobile" value={form.mobile} onChange={(v) => setForm((p) => ({ ...p, mobile: v }))} /></Grid>
          <Grid item xs={12} md={6} />
          <Grid item xs={12} md={2}><Label>{cfg.singular} Language</Label></Grid>
          <Grid item xs={12} md={4}><Select fullWidth size="small" value={form.language || "English"} onChange={(e) => setForm((p) => ({ ...p, language: e.target.value }))}><MenuItem value="English">English</MenuItem><MenuItem value="Hindi">Hindi</MenuItem><MenuItem value="Marathi">Marathi</MenuItem></Select></Grid>
        </Grid>

        <Tabs value={formTab} onChange={(_, v) => setFormTab(v)} sx={{ borderBottom: "1px solid #d9dee9", mt: 2 }}>
          <Tab label="Other Details" sx={{ fontSize: 13, textTransform: "none" }} />
          <Tab label="Address" sx={{ fontSize: 13, textTransform: "none" }} />
          <Tab label="Contact Persons" sx={{ fontSize: 13, textTransform: "none" }} />
          <Tab label="Remarks" sx={{ fontSize: 13, textTransform: "none" }} />
        </Tabs>
        {formTab === 0 ? <Grid container spacing={1.8} alignItems="center"><Grid item xs={12} md={2}><Label>PAN</Label></Grid><Grid item xs={12} md={4}><FormField value={form.pan} onChange={(v) => setForm((p) => ({ ...p, pan: v }))} /></Grid><Grid item xs={12} md={6}/><Grid item xs={12} md={2}><Label>Currency</Label></Grid><Grid item xs={12} md={4}><Select fullWidth size="small" value={form.currency || "INR"} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}><MenuItem value="INR">INR - Indian Rupee</MenuItem></Select></Grid><Grid item xs={12} md={6}/><Grid item xs={12} md={2}><Label>{cfg.accountLabel}</Label></Grid><Grid item xs={12} md={4}><FormField placeholder="Select an account" value={type === "customer" ? form.accountsReceivable : form.accountsPayable} onChange={(v) => setForm((p) => ({ ...p, [type === "customer" ? "accountsReceivable" : "accountsPayable"]: v }))} /></Grid><Grid item xs={12} md={6}/><Grid item xs={12} md={2}><Label>Payment Terms</Label></Grid><Grid item xs={12} md={4}><Select fullWidth size="small" value={form.paymentTerms || "Due on Receipt"} onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}><MenuItem value="Due on Receipt">Due on Receipt</MenuItem><MenuItem value="Net 15">Net 15</MenuItem><MenuItem value="Net 30">Net 30</MenuItem></Select></Grid>{type === "customer" ? <><Grid item xs={12} md={6}/><Grid item xs={12} md={2}><Label>Enable Portal?</Label></Grid><Grid item xs={12} md={4}><FormControlLabel control={<Checkbox checked={Boolean(form.enablePortal)} onChange={(e) => setForm((p) => ({ ...p, enablePortal: e.target.checked }))} />} label={<Typography sx={{ fontSize: 13 }}>Allow portal access for this customer</Typography>} /></Grid></> : null}</Grid> : null}
        {formTab === 1 ? <Grid container spacing={2}><Grid item xs={12} md={6}><FormField label="Billing Address" multiline rows={5} value={form.billingAddress || form.address || ""} onChange={(v) => setForm((p) => ({ ...p, billingAddress: v, address: v }))} /></Grid><Grid item xs={12} md={6}><FormField label="Shipping Address" multiline rows={5} value={form.shippingAddress || ""} onChange={(v) => setForm((p) => ({ ...p, shippingAddress: v }))} /></Grid></Grid> : null}
        {formTab === 2 ? <Box sx={{ p: 2, border: "1px dashed #cbd5e1", borderRadius: 1, color: "#667085", fontSize: 13 }}>Contact person entries can be added in the next update. Primary contact fields above are saved now.</Box> : null}
        {formTab === 3 ? <FormField label="Remarks" multiline rows={5} value={form.remarks} onChange={(v) => setForm((p) => ({ ...p, remarks: v }))} /> : null}
      </Stack>
    </Modal>
    <ConfirmationDialog open={Boolean(confirm)} title={`Delete ${cfg.singular}?`} message={`This will delete ${confirm?.[cfg.nameKey] || confirm?.displayName || "this record"}.`} confirmText="Delete" onClose={() => setConfirm(null)} onConfirm={deleteItem} loading={saving} />
  </Box></AppShell>;
}
