import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarDays,
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import ConfirmationDialog from "../components/ConfirmationDialog";
import ZohoPage from "../components/ZohoPage";
import {
  customerApi,
  purchaseOrderApi,
  salesOrderApi,
  vendorApi,
} from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";
import { money } from "./businessUtils.jsx";
import { saveDocument } from "../utils/documentStore";

const CONFIG = {
  "sales-order": {
    title: "New Sales Order",
    party: "Customer Name",
    partyPlaceholder: "Select or add a customer",
    no: "Sales Order#",
    noValue: "SO-00001",
    date: "Sales Order Date",
    shipment: "Expected Shipment Date",
    primary: "Save and Send",
    draft: "Save as Draft",
    module: "Sales Orders",
    listPath: "/sales-orders",
    notesLabel: "Customer Notes",
    notesPlaceholder: "Enter any notes to be displayed in your transaction",
    rightLabel: "Customer Details",
    subjectPlaceholder: "Let your customer know what this sales order is for",
  },
  invoice: {
    title: "New Invoice",
    party: "Customer Name",
    partyPlaceholder: "Select or add a customer",
    no: "Invoice#",
    noValue: "INV-00001",
    date: "Invoice Date",
    due: "Due Date",
    primary: "Save and Send",
    draft: "Save as Draft",
    module: "Invoices",
    listPath: "/invoices",
    notesLabel: "Customer Notes",
    notesPlaceholder: "Enter any notes to be displayed in your transaction",
    rightLabel: "Customer Details",
    subjectPlaceholder: "Let your customer know what this invoice is for",
  },
  "purchase-order": {
    title: "New Purchase Order",
    party: "Vendor Name",
    partyPlaceholder: "Select or add a vendor",
    no: "Purchase Order#",
    noValue: "PO-00001",
    date: "Purchase Order Date",
    shipment: "Expected Shipment Date",
    primary: "Save and Send",
    draft: "Save as Draft",
    module: "Purchase Orders",
    listPath: "/purchase-orders",
    notesLabel: "Vendor Notes",
    notesPlaceholder: "Enter any notes to be displayed in your transaction",
    rightLabel: "Vendor Details",
    subjectPlaceholder: "Let your vendor know what this purchase order is for",
  },
  bill: {
    title: "New Bill",
    party: "Vendor Name",
    partyPlaceholder: "Select or add a vendor",
    no: "Bill#",
    noValue: "BILL-00001",
    date: "Bill Date",
    due: "Due Date",
    primary: "Save",
    draft: "Save as Draft",
    module: "Bills",
    listPath: "/bills",
    notesLabel: "Vendor Notes",
    notesPlaceholder: "Enter any notes to be displayed in your transaction",
    rightLabel: "Vendor Details",
    subjectPlaceholder: "Let your vendor know what this bill is for",
  },
  expense: {
    title: "New Expense",
    party: "Paid Through",
    partyPlaceholder: "Select account",
    no: "Reference#",
    noValue: "",
    date: "Expense Date",
    primary: "Save",
    draft: "Save as Draft",
    module: "Expenses",
    listPath: "/expenses",
    notesLabel: "Notes",
    notesPlaceholder: "Enter notes",
    rightLabel: "Expense Details",
    subjectPlaceholder: "What is this expense for?",
  },
};

const FIELD_H = 34;

const today = () => new Date().toISOString().slice(0, 10);

const newItem = () => ({
  id:
    typeof crypto !== "undefined" && crypto?.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
  itemDetails: "",
  quantity: "1.00",
  rate: "0.00",
  discount: "0",
});

const num = (value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const itemAmount = (row) =>
  Math.max(0, num(row.quantity) * num(row.rate) - num(row.discount));

const getId = (row) =>
  row?._id ||
  row?.id ||
  row?.customerId ||
  row?.vendorId ||
  row?.customer_id ||
  row?.vendor_id ||
  "";

const pickData = (value) => value?.data || value?.result || value || {};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.rows)) return value.rows;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.docs)) return value.docs;
  if (Array.isArray(value.customers)) return value.customers;
  if (Array.isArray(value.vendors)) return value.vendors;
  if (Array.isArray(value.data)) return value.data;

  if (value.data && value.data !== value) return safeArray(value.data);
  if (value.result && value.result !== value) return safeArray(value.result);

  return [];
};

const extractPagination = (value) => {
  const data = pickData(value);

  const page = Number(data?.pagination?.page || data?.page || 1);
  const pages = Number(data?.pagination?.pages || data?.pages || 1);
  const total = Number(data?.pagination?.total || data?.total || 0);

  return {
    page,
    pages,
    total,
    hasNext:
      Boolean(data?.pagination?.hasNext) ||
      Boolean(data?.hasNext) ||
      page < pages,
  };
};

async function listAllFromApi(api, params = {}) {
  if (typeof api?.listAll === "function") {
    const rows = await api.listAll(params);
    return safeArray(rows);
  }

  if (typeof api?.list !== "function") {
    return [];
  }

  const first = await api.list({
    limit: 1000,
    page: 1,
    ...params,
  });

  let rows = safeArray(pickData(first));
  const pagination = extractPagination(first);

  if (!pagination.hasNext || pagination.pages <= 1) {
    return rows;
  }

  for (let page = 2; page <= pagination.pages; page += 1) {
    const next = await api.list({
      limit: 1000,
      page,
      ...params,
    });

    rows = [...rows, ...safeArray(pickData(next))];
  }

  return rows;
}

function partyNameOf(row, isPurchase) {
  if (!row) return "";

  return String(
    (isPurchase
      ? row.vendorName ||
        row.displayName ||
        row.companyName ||
        row.name ||
        row.contactPerson
      : row.customerName ||
        row.displayName ||
        row.companyName ||
        row.name ||
        row.contactPerson) || ""
  ).trim();
}

function partySubTextOf(row) {
  if (!row) return "";

  return String(
    row.mobile ||
      row.workPhone ||
      row.phone ||
      row.email ||
      row.contactPerson ||
      row.gstNumber ||
      ""
  ).trim();
}

function partyAddressOf(row) {
  if (!row) return "";

  return (
    row.billingAddress ||
    row.address ||
    [row.city, row.state].filter(Boolean).join(", ") ||
    ""
  );
}

function ZohoLabel({ children, required = false }) {
  return (
    <Typography
      sx={{
        fontSize: 13,
        color: required ? "#ef4444" : "#111827",
        lineHeight: 1.3,
        pt: 0.3,
      }}
    >
      {children}
      {required ? "*" : ""}
    </Typography>
  );
}

function ZohoTextField({
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
  minRows = 1,
  disabled = false,
}) {
  return (
    <TextField
      fullWidth
      size="small"
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      multiline={multiline}
      minRows={minRows}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      InputLabelProps={type === "date" ? { shrink: true } : undefined}
      sx={{
        "& .MuiOutlinedInput-root": {
          minHeight: multiline ? "auto" : FIELD_H,
          borderRadius: "5px",
          bgcolor: disabled ? "#f8fafc" : "#fff",
        },
        "& .MuiInputBase-input": {
          fontSize: "13px !important",
          py: multiline ? "8px !important" : "7px !important",
        },
      }}
    />
  );
}

function ZohoSelect({
  value,
  onChange,
  children,
  placeholder,
  disabled = false,
}) {
  return (
    <Select
      fullWidth
      size="small"
      displayEmpty
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      IconComponent={ChevronDown}
      sx={{
        height: FIELD_H,
        borderRadius: "5px",
        bgcolor: disabled ? "#f8fafc" : "#fff",
        fontSize: 13,
        "& .MuiSelect-select": { py: "7px" },
      }}
    >
      {placeholder ? <MenuItem value="">{placeholder}</MenuItem> : null}
      {children}
    </Select>
  );
}

function FormLine({ label, required = false, children, rightChildren }) {
  return (
    <Grid
      container
      spacing={1.6}
      alignItems="center"
      sx={{ width: "100%", m: 0 }}
    >
      <Grid item xs={12} md={2.1}>
        <ZohoLabel required={required}>{label}</ZohoLabel>
      </Grid>

      <Grid item xs={12} md={4.5}>
        {children}
      </Grid>

      {rightChildren ? (
        <Grid item xs={12} md={5.4}>
          {rightChildren}
        </Grid>
      ) : (
        <Grid item xs={12} md={5.4} />
      )}
    </Grid>
  );
}

function DateInput({ value, onChange }) {
  return (
    <Box sx={{ position: "relative" }}>
      <ZohoTextField type="date" value={value} onChange={onChange} />
      <CalendarDays
        size={15}
        style={{
          position: "absolute",
          right: 9,
          top: 9,
          pointerEvents: "none",
          color: "#6b7280",
        }}
      />
    </Box>
  );
}

function PartySelect({
  value,
  onChange,
  placeholder,
  options,
  loading,
  isPurchase,
  mode,
}) {
  return (
    <ZohoSelect
      value={value}
      onChange={onChange}
      placeholder={
        loading
          ? `Loading ${isPurchase ? "vendors" : "customers"}...`
          : placeholder
      }
      disabled={loading}
    >
      {loading ? (
        <MenuItem value="" disabled>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: 13 }}>
              Loading {isPurchase ? "vendors" : "customers"}...
            </Typography>
          </Stack>
        </MenuItem>
      ) : null}

      {!loading && options.length === 0 ? (
        <MenuItem value="" disabled>
          No {isPurchase ? "vendors" : "customers"} found
        </MenuItem>
      ) : null}

      {options.map((party, index) => {
        const rawId = getId(party);
        const id = rawId || `${isPurchase ? "vendor" : "customer"}-${index}`;
        const name = partyNameOf(party, isPurchase);
        const subText = partySubTextOf(party);

        return (
          <MenuItem key={id} value={id}>
            <Stack spacing={0.1} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>
                {name || "Unnamed"}
              </Typography>

              {subText ? (
                <Typography sx={{ fontSize: 11.5, color: "#667085" }} noWrap>
                  {subText}
                </Typography>
              ) : null}
            </Stack>
          </MenuItem>
        );
      })}

      {mode === "expense" ? <MenuItem value="cash">Cash</MenuItem> : null}
      {mode === "expense" ? <MenuItem value="bank">Bank Account</MenuItem> : null}
    </ZohoSelect>
  );
}

export default function ZohoFormPage({ mode = "sales-order" }) {
  const cfg = CONFIG[mode] || CONFIG["sales-order"];
  const navigate = useNavigate();
const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [form, setForm] = useState({
    party: "",
    partyName: "",
    currency: "INR",
    number: cfg.noValue,
    reference: "",
    date: today(),
    expectedShipmentDate: "",
    dueDate: today(),
    paymentTerms: "Due on Receipt",
    deliveryMethod: "",
    salesperson: "",
    subject: "",
    reportingTags: "",
    notes: "",
    adjustment: "0",
  });

  const [items, setItems] = useState([newItem()]);

  const isPurchase = mode === "purchase-order" || mode === "bill";
  const isInvoiceLike = mode === "invoice" || mode === "bill";
  const needsPartyList = ["sales-order", "invoice", "purchase-order", "bill"].includes(mode);

  const patch = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (id, key, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((item) => item.id !== id) : prev
    );
  };

  const loadParties = useCallback(async () => {
    if (!needsPartyList) return;

    setPartyLoading(true);

    try {
      if (isPurchase) {
        const list = await listAllFromApi(vendorApi, { isActive: true });
        setVendors(list);
      } else {
        const list = await listAllFromApi(customerApi, { isActive: true });
        setCustomers(list);
      }
    } catch (error) {
      console.error("LOAD_PARTY_OPTIONS_ERROR:", error);
      toast.error(`Failed to load ${isPurchase ? "vendors" : "customers"}`);

      if (isPurchase) {
        setVendors([]);
      } else {
        setCustomers([]);
      }
    } finally {
      setPartyLoading(false);
    }
  }, [isPurchase, needsPartyList]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      number: cfg.noValue,
      party: "",
      partyName: "",
    }));
  }, [cfg.noValue, mode]);

  const partyOptions = useMemo(() => {
    if (!needsPartyList) return [];
    return isPurchase ? vendors : customers;
  }, [customers, isPurchase, needsPartyList, vendors]);

  const selectedParty = useMemo(() => {
    if (!form.party) return null;

    return (
      partyOptions.find((party, index) => {
        const rawId = getId(party);
        const optionId =
          rawId || `${isPurchase ? "vendor" : "customer"}-${index}`;
        return String(optionId) === String(form.party);
      }) || null
    );
  }, [form.party, isPurchase, partyOptions]);

  const subtotal = useMemo(
    () => items.reduce((sum, row) => sum + itemAmount(row), 0),
    [items]
  );

  const totalQty = useMemo(
    () => items.reduce((sum, row) => sum + num(row.quantity), 0),
    [items]
  );

  const totalAmount = subtotal + num(form.adjustment);
  const totalDiscount = useMemo(
  () => items.reduce((sum, row) => sum + num(row.discount), 0),
  [items]
);

const apiStatusFromUiStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();

  if (value === "draft") return "DRAFT";
  if (value === "cancelled" || value === "canceled") return "CANCELLED";

  return "CONFIRMED";
};

const buildOrderApiPayload = (payload) => ({
  referenceNumber: payload.reference,
  orderDate: payload.date,
  expectedShipmentDate: payload.shipment || null,
  paymentTerms: payload.paymentTerms,
  salesperson: payload.salesperson,
  subject: payload.subject,
  description: payload.notes,
  amount: payload.baseAmount,
  gstAmount: payload.gstAmount,
  totalAmount: payload.totalAmount,
  status: apiStatusFromUiStatus(payload.status),
  remarks: payload.notes,
});

const persistDocument = async (payload) => {
  if (mode === "sales-order") {
    return salesOrderApi.create({
      ...buildOrderApiPayload(payload),
      customerId: payload.partyId,
    });
  }

  if (mode === "purchase-order") {
    return purchaseOrderApi.create({
      ...buildOrderApiPayload(payload),
      vendorId: payload.partyId,
    });
  }

  return saveDocument(payload);
};

const buildSavePayload = (status) => {
  return {
    module: cfg.module,
    mode,

    number: mode === "sales-order" || mode === "purchase-order" ? "" : form.number,
    reference: form.reference,

    partyId: form.party,
    party: form.partyName,
    partyName: form.partyName,

    date: form.date,
    due: form.dueDate,
    shipment: form.expectedShipmentDate,

    paymentTerms: form.paymentTerms,
    deliveryMethod: form.deliveryMethod,
    salesperson: form.salesperson,
    subject: form.subject,
    reportingTags: form.reportingTags,
    notes: form.notes,

    baseAmount: subtotal,
    subTotal: subtotal,
    discountAmount: totalDiscount,
    gstAmount: num(form.gstAmount),
    tdsAmount: num(form.tdsAmount),
    adjustment: num(form.adjustment),
    amount: totalAmount,
    totalAmount,

    totalQty,

    items: items.map((item) => ({
      itemDetails: item.itemDetails,
      quantity: num(item.quantity),
      rate: num(item.rate),
      discount: num(item.discount),
      amount: itemAmount(item),
    })),

    status,
  };
};

const handleSave = async (status = "Saved") => {
  if (needsPartyList && !form.party) {
    toast.error(`${cfg.party} is required`);
    return;
  }

  if (!form.date) {
    toast.error(`${cfg.date} is required`);
    return;
  }

  const hasValidItem = items.some(
    (item) => item.itemDetails || num(item.quantity) > 0 || num(item.rate) > 0
  );

  if (!hasValidItem) {
    toast.error("At least one item is required");
    return;
  }

  setSaving(true);

  try {
    const payload = buildSavePayload(status);

    await persistDocument(payload);

    toast.success(`${cfg.module.slice(0, -1)} saved successfully`);

    navigate(cfg.listPath);
  } catch (error) {
    console.error("SAVE_DOCUMENT_ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to save document");
  } finally {
    setSaving(false);
  }
};

  const onPartyChange = (value) => {
    const match =
      partyOptions.find((party, index) => {
        const rawId = getId(party);
        const optionId =
          rawId || `${isPurchase ? "vendor" : "customer"}-${index}`;
        return String(optionId) === String(value);
      }) || null;

    setForm((prev) => ({
      ...prev,
      party: value,
      partyName: partyNameOf(match, isPurchase),
    }));
  };

  const billingAddress = partyAddressOf(selectedParty);
  const shippingAddress =
    selectedParty?.shippingAddress ||
    selectedParty?.deliveryAddress ||
    selectedParty?.shipping_address ||
    billingAddress;

  return (
    <AppShell>
      <HistoricalUiStyles />

      <ZohoPage sx={{ p: 0, pb: 8, bgcolor: "#fff" }}>
        <Box
          sx={{
            height: 66,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e3e7ef",
            bgcolor: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 4,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Typography sx={{ fontSize: 24, fontWeight: 400, color: "#111827" }}>
              {cfg.title}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              sx={{ border: "1px solid #e3e7ef", borderRadius: "5px" }}
            >
              <Settings size={17} />
            </IconButton>

            <IconButton
              size="small"
              onClick={() => setDiscard(true)}
              sx={{ borderRadius: "5px" }}
            >
              <X size={19} />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ width: "100%", minWidth: 0, bgcolor: "#fff" }}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              bgcolor: "#f7f8fb",
              borderBottom: "1px solid #eef1f6",
              width: "100%",
            }}
          >
            <Grid container spacing={1.6} alignItems="start" sx={{ width: "100%", m: 0 }}>
              <Grid item xs={12} md={2.1}>
                <ZohoLabel required>{cfg.party}</ZohoLabel>
              </Grid>

              <Grid item xs={12} md={4.8}>
                <Stack direction="row" sx={{ width: "100%" }}>
                  <PartySelect
                    value={form.party}
                    onChange={onPartyChange}
                    placeholder={cfg.partyPlaceholder}
                    options={partyOptions}
                    loading={partyLoading}
                    isPurchase={isPurchase}
                    mode={mode}
                  />

                  <Button
                    variant="primary"
                    sx={{
                      minWidth: 42,
                      borderRadius: "0 5px 5px 0 !important",
                      ml: "-1px",
                    }}
                    onClick={loadParties}
                  >
                    {partyLoading ? <CircularProgress size={15} /> : <Search size={16} />}
                  </Button>
                </Stack>

                {selectedParty ? (
                  <Grid container spacing={1.2} sx={{ mt: 1.2 }}>
                    <Grid item xs={12} md={6}>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.3 }}>
                        Billing Address
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: "#2563eb" }}>
                        {billingAddress || "No billing address"}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.3 }}>
                        {isPurchase ? "Delivery Address" : "Shipping Address"}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: "#2563eb" }}>
                        {shippingAddress || "No shipping address"}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : null}
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ px: 2.5, py: 2.4, width: "100%" }}>
            <Stack spacing={1.8} sx={{ width: "100%" }}>
              <FormLine
                label={cfg.date}
                required
                rightChildren={
                  <Grid container spacing={1.6} alignItems="center" sx={{ width: "100%", m: 0 }}>
                    <Grid item xs={12} md={3.2}>
                      <ZohoLabel>{isInvoiceLike ? cfg.due : cfg.shipment}</ZohoLabel>
                    </Grid>

                    <Grid item xs={12} md={5.4}>
                      <DateInput
                        value={isInvoiceLike ? form.dueDate : form.expectedShipmentDate}
                        onChange={(v) =>
                          patch(
                            isInvoiceLike ? "dueDate" : "expectedShipmentDate",
                            v
                          )
                        }
                      />
                    </Grid>
                  </Grid>
                }
              >
                <DateInput value={form.date} onChange={(v) => patch("date", v)} />
              </FormLine>

         

              <Divider sx={{ my: 0.6 }} />

              <FormLine label="Subject">
                <ZohoTextField
                  multiline
                  minRows={2}
                  value={form.subject}
                  onChange={(v) => patch("subject", v)}
                  placeholder={cfg.subjectPlaceholder}
                />
              </FormLine>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                mt: 3.2,
                border: "1px solid #e3e7ef",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1.1,
                  bgcolor: "#fbfcff",
                  borderBottom: "1px solid #e3e7ef",
                }}
              >
                <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>
                  Item Table
                </Typography>
              </Stack>

              <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1120 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 56 }}>Drag</TableCell>
                      <TableCell>Item Details</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>
                        Quantity
                      </TableCell>
                      <TableCell align="right" sx={{ width: 130 }}>
                        Rate
                      </TableCell>
                      <TableCell align="right" sx={{ width: 130 }}>
                        Discount
                      </TableCell>
                      <TableCell align="right" sx={{ width: 150 }}>
                        Amount
                      </TableCell>
                      <TableCell align="center" sx={{ width: 58 }} />
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <GripVertical size={16} color="#7b8497" />
                        </TableCell>

                        <TableCell>
                          <ZohoTextField
                            value={item.itemDetails}
                            onChange={(v) => updateItem(item.id, "itemDetails", v)}
                            placeholder="Type or click to select an item"
                          />
                        </TableCell>

                        <TableCell align="right">
                          <ZohoTextField
                            value={item.quantity}
                            onChange={(v) => updateItem(item.id, "quantity", v)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <ZohoTextField
                            value={item.rate}
                            onChange={(v) => updateItem(item.id, "rate", v)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <ZohoTextField
                            value={item.discount}
                            onChange={(v) => updateItem(item.id, "discount", v)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>
                            {money(itemAmount(item))}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <IconButton size="small" onClick={() => removeItem(item.id)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ px: 2, py: 1.4, borderTop: "1px solid #e3e7ef" }}>
                <Button
                  variant="outline"
                  startIcon={<Plus size={15} />}
                  onClick={() => setItems((prev) => [...prev, newItem()])}
                >
                  Add New Row
                </Button>
              </Box>
            </Paper>

            <Grid container spacing={2.5} sx={{ mt: 1.5, width: "100%", m: 0 }} alignItems="flex-start">
              <Grid item xs={12} md={7}>
                <Stack spacing={1.6}>
               

                  <FormLine label={cfg.notesLabel}>
                    <ZohoTextField
                      multiline
                      minRows={3}
                      value={form.notes}
                      onChange={(v) => patch("notes", v)}
                      placeholder={cfg.notesPlaceholder}
                    />
                  </FormLine>

                  <FormControlLabel
                    control={<Checkbox size="small" />}
                    label="Email this transaction to the party after saving"
                    sx={{
                      ml: { md: "calc(17.5% - 11px)" },
                      "& .MuiFormControlLabel-label": { fontSize: 13 },
                    }}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper
                  elevation={0}
                  sx={{
                    border: "1px solid #e3e7ef",
                    borderRadius: "6px",
                    bgcolor: "#fbfcff",
                    p: 2,
                  }}
                >
                  <Stack spacing={1.2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ fontSize: 13, color: "#667085" }}>
                        Sub Total
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>
                        {money(subtotal)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Typography sx={{ fontSize: 13, color: "#667085" }}>
                        Adjustment
                      </Typography>

                      <Box sx={{ width: 170 }}>
                        <ZohoTextField
                          value={form.adjustment}
                          onChange={(v) => patch("adjustment", v)}
                        />
                      </Box>
                    </Stack>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography sx={{ fontSize: 15, color: "#111827", fontWeight: 600 }}>
                        Total
                      </Typography>

                      <Typography sx={{ fontSize: 15, color: "#111827", fontWeight: 700 }}>
                        {money(totalAmount)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            height: 64,
            bgcolor: "#fff",
            borderTop: "1px solid #e3e7ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            zIndex: 6,
            boxShadow: "0 -2px 10px rgba(15,23,42,0.05)",
          }}
        >
         <Stack direction="row" spacing={1}>
  <Button
    disabled={saving}
    onClick={() => handleSave(cfg.primary === "Save and Send" ? "Sent" : "Saved")}
  >
    {saving ? "Saving..." : cfg.primary}
  </Button>

  <Button
    variant="outline"
    disabled={saving}
    onClick={() => handleSave("Draft")}
  >
    {cfg.draft}
  </Button>

  <Button
    variant="outline"
    disabled={saving}
    onClick={() => setDiscard(true)}
  >
    Cancel
  </Button>
</Stack>

          <Typography sx={{ fontSize: 13, textAlign: "right" }}>
            Total Amount: <b>{money(totalAmount)}</b>
            <br />
            <Box component="span" sx={{ color: "#667085" }}>
              Total Quantity: {totalQty.toFixed(2)}
            </Box>
          </Typography>
        </Box>

        <ConfirmationDialog
          open={discard}
          title="Discard changes?"
          message={`Unsaved ${cfg.module.toLowerCase()} changes will be lost.`}
          confirmText="Discard"
          onClose={() => setDiscard(false)}
          onConfirm={() => {
            setDiscard(false);
            navigate(cfg.listPath);
          }}
        />
      </ZohoPage>
    </AppShell>
  );
}