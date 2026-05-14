import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Box, Checkbox, Grid, IconButton, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { ArrowLeft, Building2, ChevronDown, Edit, FileText, MoreHorizontal, Plus, Settings, Trash2, Upload } from "lucide-react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { customerApi, vendorApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";
import { Card, FormField, InfoRow, Label, MiniMonthBars, ProgressMoney, SectionTitle, dateText, getId, makeLastMonths, money, pickData, safeArray } from "./businessUtils.jsx";

const CONFIGS = {
  customer: {
    listPath: "/customers",
    title: "Customer Detail",
    entityKey: "customer",
    entityLabel: "Customer",
    listTitle: "Active Customers",
    nameKey: "customerName",
    typeKey: "customerType",
    api: customerApi,
    orderLabel: "Sales Order",
    orderPlural: "Sales Orders",
    orderListKey: "salesOrders",
    addOrderApi: "addSalesOrder",
    totalOrderKey: "totalSalesOrderAmount",
    totalPaidKey: "totalPaymentReceived",
    paidLabel: "Received",
    remainingLabel: "Receivables",
    transactionAmountKey: "deposit",
    orderNoHeader: "SO No",
    newTransactionLabel: "New Transaction",
    paymentTableTitle: "Customer Payments",
    emptyForm: { customerName: "", contactPerson: "", mobile: "", email: "", gstNumber: "", address: "", billingAddress: "", shippingAddress: "", city: "", state: "", remarks: "" },
  },
  vendor: {
    listPath: "/vendors",
    title: "Vendor Detail",
    entityKey: "vendor",
    entityLabel: "Vendor",
    listTitle: "Active Vendors",
    nameKey: "vendorName",
    typeKey: "vendorType",
    api: vendorApi,
    orderLabel: "Purchase Order",
    orderPlural: "Purchase Orders",
    orderListKey: "purchaseOrders",
    addOrderApi: "addPurchaseOrder",
    totalOrderKey: "totalPurchaseOrderAmount",
    totalPaidKey: "totalPaymentMade",
    paidLabel: "Paid",
    remainingLabel: "Payables",
    transactionAmountKey: "withdrawal",
    orderNoHeader: "PO No",
    newTransactionLabel: "New Transaction",
    paymentTableTitle: "Bill Payments",
    emptyForm: { vendorName: "", contactPerson: "", mobile: "", email: "", gstNumber: "", address: "", billingAddress: "", shippingAddress: "", city: "", state: "", remarks: "" },
  },
};

const emptyOrder = { orderDate: new Date().toISOString().slice(0, 10), referenceNumber: "", description: "", amount: "", gstPercent: "", gstAmount: "", totalAmount: "", remarks: "" };
const emptyDoc = { title: "", description: "", file: null };
const emptyBank = { accountHolderName: "", bankName: "", accountNumber: "", reAccountNumber: "", ifsc: "" };
const n = (v) => Number(v || 0) || 0;
const calc = (f) => { const base = n(f.amount); const pct = n(f.gstPercent); const gst = pct > 0 ? base * pct / 100 : n(f.gstAmount); return { amount: base, gstPercent: pct, gstAmount: Number(gst.toFixed(2)), totalAmount: Number((base + gst).toFixed(2)) }; };

const monthKeyFromDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function makeAmountByMonth(rows, dateKey, amountKey) {
  return safeArray(rows).reduce((acc, row) => {
    const key = monthKeyFromDate(row?.[dateKey] || row?.month);
    if (!key) return acc;
    acc[key] = Number(acc[key] || 0) + Number(row?.[amountKey] || row?.totalAmount || row?.amount || 0);
    return acc;
  }, {});
}

export default function BusinessDetailPage({ type }) {
  const cfg = CONFIGS[type];
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [orderModal, setOrderModal] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [entityForm, setEntityForm] = useState(cfg.emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, list] = await Promise.all([cfg.api.getById(id), cfg.api.listAll ? cfg.api.listAll() : cfg.api.list({ limit: 1000 })]);
      setDetail(pickData(res));
      setItems(safeArray(pickData(list).items || pickData(list)));
    } catch (e) { toast.error(e?.response?.data?.message || `Failed to load ${cfg.entityLabel}`); }
    finally { setLoading(false); }
  }, [cfg, id]);

  useEffect(() => { load(); }, [load]);

  const entity = detail?.[cfg.entityKey] || {};
  const summary = detail?.summary || {};
  const orders = safeArray(detail?.[cfg.orderListKey]);
  const txns = safeArray(detail?.paymentTransactions);
  const documents = safeArray(entity?.documents);
  const bankAccounts = safeArray(entity?.bankAccounts);

  const trend = useMemo(() => {
    const analytics = detail?.analytics || {};
    const orderByMonth = makeAmountByMonth(
      safeArray(analytics.orderMonthly).length ? analytics.orderMonthly : orders,
      safeArray(analytics.orderMonthly).length ? "month" : "orderDate",
      safeArray(analytics.orderMonthly).length ? "totalAmount" : "totalAmount"
    );
    const paymentByMonth = makeAmountByMonth(
      safeArray(analytics.paymentMonthly).length ? analytics.paymentMonthly : txns,
      safeArray(analytics.paymentMonthly).length ? "month" : "transactionDate",
      safeArray(analytics.paymentMonthly).length ? "amount" : cfg.transactionAmountKey
    );

    return makeLastMonths(11).map((m) => ({
      ...m,
      orders: Number(orderByMonth[m.key] || 0),
      payments: Number(paymentByMonth[m.key] || 0),
    }));
  }, [detail?.analytics, orders, txns, cfg.transactionAmountKey]);

  const selectedName = entity?.displayName || entity?.[cfg.nameKey] || cfg.entityLabel;

  const openEdit = () => { setEntityForm({ ...cfg.emptyForm, ...entity }); setEditModal(true); };

  const saveEntity = async () => {
    const name = entityForm[cfg.nameKey] || entityForm.displayName || entityForm.companyName;
    if (!String(name || "").trim()) return toast.error(`${cfg.entityLabel} name is required`);
    setSaving(true);
    try {
      await cfg.api.update(id, { ...entityForm, [cfg.nameKey]: name, displayName: name });
      toast.success(`${cfg.entityLabel} updated`);
      setEditModal(false);
      await load();
    } catch (e) { toast.error(e?.response?.data?.message || `Failed to update ${cfg.entityLabel}`); }
    finally { setSaving(false); }
  };

  const deleteEntity = async () => {
    setSaving(true);
    try { await cfg.api.delete(id); toast.success(`${cfg.entityLabel} deleted`); navigate(cfg.listPath); }
    catch (e) { toast.error(e?.response?.data?.message || `Failed to delete ${cfg.entityLabel}`); }
    finally { setSaving(false); }
  };

  const addOrder = async () => {
    const computed = calc(orderForm);
    if (computed.totalAmount <= 0) return toast.error("Total amount must be greater than 0");
    setSaving(true);
    try {
      await cfg.api[cfg.addOrderApi](id, { ...orderForm, ...computed });
      toast.success(`${cfg.orderLabel} added`);
      setOrderModal(false);
      setOrderForm(emptyOrder);
      await load();
    } catch (e) { toast.error(e?.response?.data?.message || `Failed to add ${cfg.orderLabel.toLowerCase()}`); }
    finally { setSaving(false); }
  };

  const uploadDocument = async () => {
    if (!docForm.title.trim()) return toast.error("Document title is required");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", docForm.title);
      formData.append("description", docForm.description);
      if (docForm.file) formData.append("file", docForm.file);
      await cfg.api.uploadDocument(id, formData);
      toast.success("Document uploaded");
      setDocModal(false);
      setDocForm(emptyDoc);
      await load();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to upload document"); }
    finally { setSaving(false); }
  };

  const addBankAccount = async () => {
    if (!bankForm.accountHolderName.trim()) return toast.error("Account holder name is required");
    if (!bankForm.accountNumber.trim()) return toast.error("Account number is required");
    if (bankForm.accountNumber !== bankForm.reAccountNumber) return toast.error("Account number and re-enter account number must match");
    setSaving(true);
    try {
      await cfg.api.addBankAccount(id, bankForm);
      toast.success("Bank account added");
      setBankModal(false);
      setBankForm(emptyBank);
      await load();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to add bank account"); }
    finally { setSaving(false); }
  };

  const orderColumns = [
    { key: "orderDate", header: "Date", render: (r) => dateText(r.orderDate) },
    { key: "description", header: "Description", render: (r) => r.description || "-" },
    { key: "amount", header: "Amount", align: "right", render: (r) => money(r.amount) },
    { key: "gstAmount", header: "GST", align: "right", render: (r) => money(r.gstAmount) },
    { key: "totalAmount", header: "Total", align: "right", render: (r) => money(r.totalAmount) },
    { key: "status", header: "Status", render: (r) => r.status || "CONFIRMED" },
  ];
  const txnColumns = [
    { key: "transactionDate", header: "Date", render: (r) => dateText(r.transactionDate) },
    { key: "name", header: "Name", render: () => selectedName },
    { key: "description", header: "Bank Txn", render: (r) => r.description || "-" },
    { key: "deposit", header: "Credit", align: "right", render: (r) => money(r.deposit) },
    { key: "withdrawal", header: "Debit", align: "right", render: (r) => money(r.withdrawal) },
    { key: "balance", header: "Balance", align: "right", render: (r) => money(r.balance) },
  ];

  const total = Number(summary[cfg.totalOrderKey] || 0);
  const paid = Number(summary[cfg.totalPaidKey] || 0);

  return <AppShell><HistoricalUiStyles /><Box sx={{ width: "100%", height: "100%", bgcolor: "#fff", overflow: "hidden", display: "flex" }}>
    <Box sx={{ width: 360, flexShrink: 0, borderRight: "1px solid #dfe4ef", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, height: 58, borderBottom: "1px solid #e3e7ef" }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{cfg.listTitle} <ChevronDown size={14} /></Typography>
        <Stack direction="row" spacing={1}><Button icon={Plus} onClick={() => navigate(`${cfg.listPath}?create=1`)} /><Button variant="outline" icon={MoreHorizontal} /></Stack>
      </Stack>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {items.map((item) => {
          const active = String(getId(item)) === String(id);
          return <Stack key={getId(item)} direction="row" spacing={1} alignItems="flex-start" onClick={() => navigate(`${cfg.listPath}/${getId(item)}`)} sx={{ px: 2, py: 1.4, cursor: "pointer", borderBottom: "1px solid #eef1f6", bgcolor: active ? "#f0f2ff" : "#fff", "&:hover": { bgcolor: "#f7f9ff" } }}>
            <Checkbox size="small" checked={active} />
            <Box><Typography sx={{ fontSize: 14, color: "#111827" }}>{item.displayName || item[cfg.nameKey]}</Typography><Typography sx={{ fontSize: 12, color: "#667085" }}>{money(item?.summary?.remainingPayment || 0)}</Typography></Box>
          </Stack>;
        })}
      </Box>
    </Box>

    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ height: 58, px: 2, borderBottom: "1px solid #e3e7ef", flexShrink: 0 }}>
        <IconButton size="small" onClick={() => navigate(cfg.listPath)}><ArrowLeft size={18} /></IconButton>
        <Typography sx={{ fontSize: 22, fontWeight: 400, flex: 1 }} noWrap>{selectedName}</Typography>
        <Button variant="outline" icon={Edit} onClick={openEdit}>Edit</Button>
        <Button variant="primary" onClick={() => setOrderModal(true)}>New Transaction</Button>
        <Button variant="outline" onClick={() => setConfirmDelete(true)} icon={Trash2}>Delete</Button>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1, minHeight: 42, borderBottom: "1px solid #dfe4ef", flexShrink: 0 }}>
        <Tab label="Overview" sx={{ fontSize: 13, textTransform: "none", minHeight: 42 }} />
        <Tab label="Transactions" sx={{ fontSize: 13, textTransform: "none", minHeight: 42 }} />
        <Tab label="Documents" sx={{ fontSize: 13, textTransform: "none", minHeight: 42 }} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: "auto", bgcolor: "#fff" }}>
        {loading && !detail ? <Box sx={{ p: 3 }}>Loading...</Box> : null}
        {tab === 0 ? <Grid container sx={{ minHeight: "100%" }}>
          <Grid item xs={12} md={4} sx={{ borderRight: { md: "1px solid #e3e7ef" }, p: 2 }}>
            <SectionTitle title={cfg.entityLabel} />
            <Card bodySx={{ p: 1.5 }}><Stack direction="row" spacing={1.4} alignItems="center"><Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: "#eef2f7", display: "grid", placeItems: "center", color: "#98a2b3" }}>👤</Box><Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{entity.contactPerson || selectedName}</Typography><Typography sx={{ fontSize: 13 }}>{entity.mobile || entity.workPhone || "-"}</Typography><Typography sx={{ fontSize: 13 }}>{entity.email || "-"}</Typography></Box></Stack></Card>
            <SectionTitle title="Address" />
            <InfoRow label="Billing Address" value={entity.billingAddress || entity.address || "No Billing Address"} />
            <InfoRow label="Shipping Address" value={entity.shippingAddress || "No Shipping Address"} />
            <SectionTitle title="Other Details" />
            <InfoRow label={`${cfg.entityLabel} Type`} value={entity[cfg.typeKey] || "Business"} />
            <InfoRow label="Default Currency" value={entity.currency || "INR"} />
            <InfoRow label="Portal Status" value={type === "customer" ? (entity.enablePortal ? "Enabled" : "Disabled") : "Disabled"} />
            <InfoRow label={`${cfg.entityLabel} Language`} value={entity.language || "English"} />
            {/* <SectionTitle title="Contact Persons" action={<Button variant="ghost" size="small" icon={Plus} />} /> */}
            <InfoRow label="Primary" value={entity.contactPerson || "-"} />
            <SectionTitle
  title="Bank Account Details"
  action={
    <Button
      variant="ghost"
      size="small"
      icon={Plus}
      onClick={() => setBankModal(true)}
      sx={{
        color: "#2563eb",
        "& .MuiButton-startIcon svg": {
          color: "#2563eb",
        },
        "&:hover": {
          bgcolor: "#eff6ff",
        },
      }}
    />
  }
/>
{bankAccounts.length ? (
  bankAccounts.map((acc) => (
    <Paper
      key={acc._id || acc.accountNumber}
      variant="outlined"
      sx={{
        p: 1.2,
        mb: 1,
        borderRadius: "10px",
        borderColor: "#e8ecf3",
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        {/* Left Icon */}
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            bgcolor: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Building2 size={17} />
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 500,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {acc.bankName || "Bank"}
            </Typography>

            <IconButton
              size="small"
              sx={{
                width: 24,
                height: 24,
                color: "#667085",
              }}
            >
              <Settings size={14} />
            </IconButton>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt: 0.3 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: "#111827",
              }}
            >
              {acc.accountNumberMasked || acc.accountNumber || "************"}
            </Typography>

            <Typography
              component="span"
              sx={{
                fontSize: 12,
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              View
            </Typography>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} sx={{ mb: 0.7 }}>
              <Typography sx={{ width: 118, fontSize: 12, color: "#667085" }}>
                IFSC
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#111827" }}>
                : {acc.ifsc || "-"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ mb: 0.7 }}>
              <Typography sx={{ width: 118, fontSize: 12, color: "#667085" }}>
                Account Holder Name
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#111827" }}>
                : {acc.accountHolderName || "-"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5}>
              <Typography sx={{ width: 118, fontSize: 12, color: "#667085" }}>
                Account Type
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#111827" }}>
                : {acc.accountType || "-"}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Paper>
  ))
) : (
  <Typography sx={{ fontSize: 13, color: "#667085" }}>
    No bank account added.
  </Typography>
)}
            <SectionTitle title="Record Info" />
            <InfoRow label={`${cfg.entityLabel} ID`} value={entity._id} />
            <InfoRow label="Created On" value={dateText(entity.createdAt)} />
          </Grid>
          <Grid item xs={12} md={8} sx={{ p: 2.5 }}>
            <Card title={cfg.remainingLabel} bodySx={{ p: 0 }}>
              <Box sx={{ p: 2 }}><Grid container spacing={2}><Grid item xs={12} md={4}><Typography sx={{ fontSize: 12, color: "#697386" }}>Currency</Typography><Typography sx={{ fontSize: 14 }}>INR - Indian Rupee</Typography></Grid><Grid item xs={12} md={4}><Typography sx={{ fontSize: 12, color: "#697386" }}>Outstanding {cfg.remainingLabel}</Typography><Typography sx={{ fontSize: 14 }}>{money(summary.remainingPayment)}</Typography></Grid><Grid item xs={12} md={4}><Typography sx={{ fontSize: 12, color: "#697386" }}>Unused Credits</Typography><Typography sx={{ fontSize: 14 }}>{money(0)}</Typography></Grid></Grid><Box sx={{ mt: 2 }}><ProgressMoney total={total} paid={paid} paidLabel={cfg.paidLabel} remainingLabel={cfg.remainingLabel} /></Box></Box>
            </Card>
            <Box sx={{ mt: 2 }}><Typography sx={{ fontSize: 17, fontWeight: 500 }}>{type === "customer" ? "Income" : "Expenses"} <Typography component="span" sx={{ fontSize: 12, color: "#667085", ml: 1 }}>This chart is displayed in the organization base currency.</Typography></Typography><MiniMonthBars data={trend} orderKey="orders" payKey="payments" /><Typography sx={{ fontSize: 13, mt: 1 }}>Total {type === "customer" ? "Income" : "Expenses"} - <b>{money(total)}</b></Typography></Box>
            <Box sx={{ mt: 3 }}><DataTable columns={orderColumns} rows={orders} emptyText={`No ${cfg.orderPlural.toLowerCase()} found`} minWidth={900} stickyHeader /></Box>
          </Grid>
        </Grid> : null}

        {tab === 1 ? <Box sx={{ p: 2.5 }}><Typography sx={{ fontSize: 17, fontWeight: 500, mb: 2 }}>Go to transactions</Typography><Card title={cfg.orderPlural} action={<Button variant="text" icon={Plus} onClick={() => setOrderModal(true)}>New</Button>} bodySx={{ p: 0 }}><DataTable columns={orderColumns} rows={orders} emptyText={`There are no ${cfg.orderPlural}`} minWidth={900} stickyHeader /></Card><Box sx={{ mt: 2 }}><Card title={cfg.paymentTableTitle} bodySx={{ p: 0 }}><DataTable columns={txnColumns} rows={txns} emptyText={type === "customer" ? "No payments have been received or recorded yet." : "No payments made yet."} minWidth={1000} stickyHeader /></Card></Box></Box> : null}

        {tab === 2 ? <Box sx={{ p: 2.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Typography sx={{ fontSize: 18, fontWeight: 500 }}>Documents</Typography><Button icon={Upload} onClick={() => setDocModal(true)}>Upload Document</Button></Stack>{documents.length ? <Grid container spacing={1.5}>{documents.map((doc) => <Grid item xs={12} md={6} key={doc._id || doc.fileUrl || doc.title}><Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}><Stack direction="row" spacing={1.2}><FileText size={20} /><Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 14, fontWeight: 500 }}>{doc.title}</Typography><Typography sx={{ fontSize: 12, color: "#667085" }}>{doc.description || "-"}</Typography>{doc.fileUrl ? <Button variant="text" onClick={() => window.open(doc.fileUrl, "_blank")}>View File</Button> : null}</Box></Stack></Paper></Grid>)}</Grid> : <Card><Typography sx={{ fontSize: 13, color: "#667085" }}>No documents uploaded.</Typography></Card>}</Box> : null}
      </Box>
    </Box>

    <Modal open={orderModal} onClose={() => setOrderModal(false)} title={`New ${cfg.orderLabel}`} size="lg" footer={<Stack direction="row" spacing={1}><Button variant="outline" onClick={() => setOrderModal(false)}>Cancel</Button><Button onClick={addOrder} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></Stack>}>
      <Grid container spacing={2} alignItems="center"><Grid item xs={12} md={2}><Label>Reference#</Label></Grid><Grid item xs={12} md={4}><FormField value={orderForm.referenceNumber} onChange={(v) => setOrderForm((p) => ({ ...p, referenceNumber: v }))} /></Grid><Grid item xs={12} md={6}/><Grid item xs={12} md={2}><Label required>{cfg.orderLabel} Date</Label></Grid><Grid item xs={12} md={4}><FormField type="date" value={orderForm.orderDate} onChange={(v) => setOrderForm((p) => ({ ...p, orderDate: v }))} /></Grid><Grid item xs={12}><Box sx={{ borderTop: "1px solid #eef1f6", my: 1 }} /></Grid><Grid item xs={12} md={2}><Label>Description</Label></Grid><Grid item xs={12} md={6}><FormField multiline rows={3} value={orderForm.description} onChange={(v) => setOrderForm((p) => ({ ...p, description: v }))} /></Grid><Grid item xs={12}/><Grid item xs={12} md={2}><Label>Base Amount</Label></Grid><Grid item xs={12} md={3}><FormField type="number" value={orderForm.amount} onChange={(v) => setOrderForm((p) => { const next = { ...p, amount: v }; const c = calc(next); return { ...next, gstAmount: c.gstAmount, totalAmount: c.totalAmount }; })} /></Grid><Grid item xs={12} md={2}><Label>GST %</Label></Grid><Grid item xs={12} md={2}><FormField type="number" value={orderForm.gstPercent} onChange={(v) => setOrderForm((p) => { const next = { ...p, gstPercent: v }; const c = calc(next); return { ...next, gstAmount: c.gstAmount, totalAmount: c.totalAmount }; })} /></Grid><Grid item xs={12} md={3}/><Grid item xs={12} md={2}><Label>GST Amount</Label></Grid><Grid item xs={12} md={3}><FormField type="number" disabled value={orderForm.gstAmount} onChange={() => {}} /></Grid><Grid item xs={12} md={2}><Label>Total Amount</Label></Grid><Grid item xs={12} md={3}><FormField type="number" disabled value={orderForm.totalAmount} onChange={() => {}} /></Grid></Grid>
    </Modal>

    <Modal open={docModal} onClose={() => setDocModal(false)} title={`Upload ${cfg.entityLabel} Document`} footer={<Stack direction="row" spacing={1}><Button variant="outline" onClick={() => setDocModal(false)}>Cancel</Button><Button onClick={uploadDocument} disabled={saving}>{saving ? "Uploading..." : "Upload"}</Button></Stack>}><Stack spacing={2}><FormField label="Title" value={docForm.title} onChange={(v) => setDocForm((p) => ({ ...p, title: v }))} /><FormField label="Description" multiline rows={3} value={docForm.description} onChange={(v) => setDocForm((p) => ({ ...p, description: v }))} /><Button variant="outline" component="label">{docForm.file ? docForm.file.name : "Select File"}<input hidden type="file" onChange={(e) => setDocForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} /></Button></Stack></Modal>

    <Modal open={bankModal} onClose={() => setBankModal(false)} title="Add Bank Account Details" size="sm" footer={<Stack direction="row" spacing={1}><Button onClick={addBankAccount} disabled={saving}>Save</Button><Button variant="outline" onClick={() => setBankModal(false)}>Cancel</Button></Stack>}>
      <Stack spacing={2}><FormField label="Account Holder Name" value={bankForm.accountHolderName} onChange={(v) => setBankForm((p) => ({ ...p, accountHolderName: v }))} /><Paper variant="outlined" sx={{ p: 2, bgcolor: "#fbfcff", borderRadius: 1.5 }}><Grid container spacing={2}><Grid item xs={12}><FormField label="Bank Name" value={bankForm.bankName} onChange={(v) => setBankForm((p) => ({ ...p, bankName: v }))} /></Grid><Grid item xs={12}><FormField label="Account Number" value={bankForm.accountNumber} onChange={(v) => setBankForm((p) => ({ ...p, accountNumber: v }))} /></Grid><Grid item xs={12}><FormField label="Re-enter Account Number" value={bankForm.reAccountNumber} onChange={(v) => setBankForm((p) => ({ ...p, reAccountNumber: v }))} /></Grid></Grid></Paper><FormField label="IFSC" value={bankForm.ifsc} onChange={(v) => setBankForm((p) => ({ ...p, ifsc: v }))} /></Stack>
    </Modal>

    <Modal open={editModal} onClose={() => setEditModal(false)} title={`Edit ${cfg.entityLabel}`} size="lg" footer={<Stack direction="row" spacing={1}><Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button><Button onClick={saveEntity} disabled={saving}>Save</Button></Stack>}><Grid container spacing={2}><Grid item xs={12} md={6}><FormField label={`${cfg.entityLabel} Name`} value={entityForm[cfg.nameKey] || entityForm.displayName || ""} onChange={(v) => setEntityForm((p) => ({ ...p, [cfg.nameKey]: v, displayName: v }))} /></Grid><Grid item xs={12} md={6}><FormField label="Contact Person" value={entityForm.contactPerson} onChange={(v) => setEntityForm((p) => ({ ...p, contactPerson: v }))} /></Grid><Grid item xs={12} md={6}><FormField label="Phone" value={entityForm.mobile} onChange={(v) => setEntityForm((p) => ({ ...p, mobile: v }))} /></Grid><Grid item xs={12} md={6}><FormField label="Email" value={entityForm.email} onChange={(v) => setEntityForm((p) => ({ ...p, email: v }))} /></Grid><Grid item xs={12}><FormField label="Address" multiline rows={3} value={entityForm.address || entityForm.billingAddress || ""} onChange={(v) => setEntityForm((p) => ({ ...p, address: v, billingAddress: v }))} /></Grid><Grid item xs={12}><FormField label="Remarks" multiline rows={3} value={entityForm.remarks || ""} onChange={(v) => setEntityForm((p) => ({ ...p, remarks: v }))} /></Grid></Grid></Modal>
    <ConfirmationDialog open={confirmDelete} title={`Delete ${cfg.entityLabel}?`} message={`This will delete ${selectedName}.`} confirmText="Delete" onClose={() => setConfirmDelete(false)} onConfirm={deleteEntity} loading={saving} />
  </Box></AppShell>;
}
