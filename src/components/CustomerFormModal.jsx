
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import Button from "./Button";
import Modal from "./Modal";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry",
  "Chandigarh","Dadra and Nagar Haveli","Daman and Diu",
];

const EMPTY_ADDR = { attention:"", country:"India", street1:"", street2:"", city:"", state:"", pinCode:"", phone:"", fax:"" };
const EMPTY_CP   = { salutation:"", firstName:"", lastName:"", email:"", workPhone:"", mobile:"" };

function getConfig(type) {
  const isVendor = type === "vendor";
  return {
    isVendor,
    nameKey:     isVendor ? "vendorName"     : "customerName",
    typeKey:     isVendor ? "vendorType"     : "customerType",
    langKey:     isVendor ? "vendorLanguage" : "customerLanguage",
    payableKey:  isVendor ? "accountsPayable": "accountsReceivable",
    payableLabel:isVendor ? "Accounts Payable":"Accounts Receivable",
    label:       isVendor ? "Vendor"          : "Customer",
    gstText:     isVendor
      ? "Prefill Vendor details from the GST portal using the Vendor's GSTIN."
      : "Prefill Customer details from the GST portal using the Customer's GSTIN.",
    portalText:  isVendor
      ? "Allow portal access for this vendor"
      : "Allow portal access for this customer",
    empty: {
      [isVendor ? "vendorType" : "customerType"]: "Business",
      salutation:"", firstName:"", lastName:"",
      companyName:"",
      [isVendor ? "vendorName" : "customerName"]:"",
      displayName:"",
      email:"", workPhone:"", mobile:"",
      [isVendor ? "vendorLanguage" : "customerLanguage"]:"English",
      gstNumber:"", pan:"",
      currency:"INR - Indian Rupee",
      [isVendor ? "accountsPayable" : "accountsReceivable"]:"",
      openingBalance:"",
      paymentTerms:"Due on Receipt",
      enablePortal: false,
      billing:{ ...EMPTY_ADDR },
      shipping:{ ...EMPTY_ADDR },
      contactPersons:[],
      remarks:"",
    },
  };
}

function mergeForm(type, value) {
  const cfg = getConfig(type);
  const base = { ...cfg.empty, billing:{ ...EMPTY_ADDR }, shipping:{ ...EMPTY_ADDR }, contactPersons:[] };
  if (!value) return base;

  const name = value[cfg.nameKey] || value.vendorName || value.customerName || value.displayName || "";

  let billing = { ...EMPTY_ADDR };
  if (value.billing && typeof value.billing === "object") {
    billing = { ...EMPTY_ADDR, ...value.billing };
  } else if (value.billingAddress || value.address) {
    billing = { ...EMPTY_ADDR, street1: value.billingAddress || value.address || "", city: value.city || "", state: value.state || "" };
  }

  let shipping = { ...EMPTY_ADDR };
  if (value.shipping && typeof value.shipping === "object") {
    shipping = { ...EMPTY_ADDR, ...value.shipping };
  } else if (value.shippingAddress) {
    shipping = { ...EMPTY_ADDR, street1: value.shippingAddress || "" };
  }

  return {
    ...base,
    ...value,
    [cfg.nameKey]: name,
    displayName: value.displayName || name,
    [cfg.langKey]: value[cfg.langKey] || value.language || "English",
    currency: value.currency
      ? (value.currency.includes(" ") ? value.currency : `${value.currency} - Indian Rupee`)
      : "INR - Indian Rupee",
    billing,
    shipping,
    contactPersons: Array.isArray(value.contactPersons)
      ? value.contactPersons.map((cp) => ({ ...EMPTY_CP, ...cp, workPhone: cp.workPhone || cp.phone || "" }))
      : [],
    openingBalance: value.openingBalance ?? "",
  };
}

// --- UI helpers ---

function FieldLabel({ children, required = false }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography sx={{ fontSize: 13, color: required ? "#e11d48" : "#111827", fontWeight: 400, whiteSpace: "nowrap" }}>
        {children}{required ? "*" : ""}
      </Typography>
      <InfoOutlinedIcon sx={{ fontSize: 14, color: "#64748b" }} />
    </Stack>
  );
}

function ZohoInput({ value, onChange, placeholder, select, children, type="text", multiline, minRows=1, startAdornment, disabled }) {
  return (
    <TextField
      fullWidth size="small" type={type} select={select}
      value={value ?? ""} placeholder={placeholder}
      multiline={multiline} minRows={multiline ? minRows : undefined}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      InputProps={startAdornment ? { startAdornment: <InputAdornment position="start">{startAdornment}</InputAdornment> } : undefined}
      sx={{
        "& .MuiOutlinedInput-root": { height: multiline ? "auto" : 34, borderRadius: "5px", bgcolor: "#fff", fontSize: 13 },
        "& .MuiInputBase-input": { fontSize: "13px !important", py: multiline ? "8px !important" : "7px !important" },
      }}
    >
      {children}
    </TextField>
  );
}

function FormRow({ label, required = false, children }) {
  return (
    <Grid container spacing={1.5} alignItems="flex-start">
      <Grid item xs={12} md={2.5} sx={{ pt: "10px !important" }}>
        <FieldLabel required={required}>{label}</FieldLabel>
      </Grid>
      <Grid item xs={12} md={9.5}>{children}</Grid>
    </Grid>
  );
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// --- Address sub-component ---

function AddressForm({ value, onChange, title, onCopyFrom }) {
  const p = (key, val) => onChange({ ...value, [key]: val });

  return (
    <Stack spacing={1.6}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</Typography>
        {onCopyFrom && (
          <Box component="span" onClick={onCopyFrom}
            sx={{ fontSize: 12, color: "#1f6ff2", cursor: "pointer", userSelect: "none" }}>
            ↓ Copy billing address
          </Box>
        )}
      </Stack>

      <FormRow label="Attention">
        <ZohoInput value={value.attention} onChange={(v) => p("attention", v)} />
      </FormRow>
      <FormRow label="Country/Region">
        <Grid container><Grid item xs={12} md={7}>
          <ZohoInput select value={value.country || "India"} onChange={(v) => p("country", v)}>
            {["India","USA","UK","UAE","Singapore"].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </ZohoInput>
        </Grid></Grid>
      </FormRow>
      <FormRow label="Address">
        <Stack spacing={1}>
          <ZohoInput value={value.street1} onChange={(v) => p("street1", v)} placeholder="Street 1" multiline minRows={2} />
          <ZohoInput value={value.street2} onChange={(v) => p("street2", v)} placeholder="Street 2" multiline minRows={2} />
        </Stack>
      </FormRow>
      <FormRow label="City">
        <Grid container><Grid item xs={12} md={7}>
          <ZohoInput value={value.city} onChange={(v) => p("city", v)} />
        </Grid></Grid>
      </FormRow>
      <FormRow label="State">
        <Grid container><Grid item xs={12} md={7}>
          <ZohoInput select value={value.state} onChange={(v) => p("state", v)}>
            <MenuItem value=""><em>Select state</em></MenuItem>
            {STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </ZohoInput>
        </Grid></Grid>
      </FormRow>
      <FormRow label="Pin Code">
        <Grid container><Grid item xs={12} md={7}>
          <ZohoInput value={value.pinCode} onChange={(v) => p("pinCode", v)} />
        </Grid></Grid>
      </FormRow>
      <FormRow label="Phone">
        <Grid container spacing={1}>
          <Grid item xs={3} md={1.5}><ZohoInput select value="+91" onChange={() => {}}><MenuItem value="+91">+91</MenuItem></ZohoInput></Grid>
          <Grid item xs={9} md={5.5}><ZohoInput value={value.phone} onChange={(v) => p("phone", v)} /></Grid>
        </Grid>
      </FormRow>
      <FormRow label="Fax Number">
        <Grid container><Grid item xs={12} md={7}>
          <ZohoInput value={value.fax} onChange={(v) => p("fax", v)} />
        </Grid></Grid>
      </FormRow>
    </Stack>
  );
}

// --- Contact Persons tab ---

function ContactPersonsTab({ rows, onChange }) {
  const addRow    = () => onChange([...rows, { ...EMPTY_CP }]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const patchRow  = (i, key, val) => onChange(rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const TH = ({ children }) => (
    <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </Typography>
  );

  return (
    <Stack spacing={1.5}>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 680 }}>
          <Grid container spacing={1} sx={{ px: 1, pb: 1, borderBottom: "1px solid #e3e7ef" }}>
            <Grid item xs={1.5}><TH>Salutation</TH></Grid>
            <Grid item xs={2}><TH>First Name</TH></Grid>
            <Grid item xs={2}><TH>Last Name</TH></Grid>
            <Grid item xs={2.5}><TH>Email Address</TH></Grid>
            <Grid item xs={2}><TH>Work Phone</TH></Grid>
            <Grid item xs={1.5}><TH>Mobile</TH></Grid>
            <Grid item xs={0.5} />
          </Grid>

          {rows.map((row, i) => (
            <Grid container spacing={1} alignItems="center" sx={{ px: 1, py: 0.75 }} key={i}>
              <Grid item xs={1.5}>
                <ZohoInput select value={row.salutation} onChange={(v) => patchRow(i, "salutation", v)}>
                  {["", "Mr.", "Mrs.", "Ms.", "Dr."].map((s) => <MenuItem key={s} value={s}>{s || "-"}</MenuItem>)}
                </ZohoInput>
              </Grid>
              <Grid item xs={2}><ZohoInput value={row.firstName}  onChange={(v) => patchRow(i, "firstName",  v)} /></Grid>
              <Grid item xs={2}><ZohoInput value={row.lastName}   onChange={(v) => patchRow(i, "lastName",   v)} /></Grid>
              <Grid item xs={2.5}><ZohoInput value={row.email}    onChange={(v) => patchRow(i, "email",      v)} /></Grid>
              <Grid item xs={2}><ZohoInput value={row.workPhone}  onChange={(v) => patchRow(i, "workPhone",  v)} /></Grid>
              <Grid item xs={1.5}><ZohoInput value={row.mobile}   onChange={(v) => patchRow(i, "mobile",     v)} /></Grid>
              <Grid item xs={0.5}>
                <IconButton size="small" onClick={() => removeRow(i)}>
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          {rows.length === 0 && (
            <Box sx={{ px: 1, py: 2 }}>
              <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>No contact persons added.</Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box>
        <Button variant="outline" startIcon={<AddRoundedIcon />} onClick={addRow} sx={{ fontSize: 13 }}>
          Add Contact Person
        </Button>
      </Box>
    </Stack>
  );
}

// --- Main component ---

export default function CustomerFormModal({
  open,
  type = "customer",
  mode = "create",
  value = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const cfg = getConfig(type);
  const [form, setForm] = useState(() => mergeForm(type, value));
  const [tab, setTab]   = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(mergeForm(type, value));
    setTab(0);
    setPendingFiles([]);
  }, [open, type, value]);

  const patch = (key, val) =>
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "displayName")        next[cfg.nameKey] = val;
      if (key === "companyName" && !next.displayName) {
        next.displayName = val;
        next[cfg.nameKey] = val;
      }
      return next;
    });

  const patchBilling  = (val) => setForm((prev) => ({ ...prev, billing: val }));
  const patchShipping = (val) => setForm((prev) => ({ ...prev, shipping: val }));
  const copyBillingToShipping = () => setForm((prev) => ({ ...prev, shipping: { ...prev.billing } }));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const used  = (value?.documents?.length || 0) + pendingFiles.length;
    const slots = Math.max(0, 10 - used);
    setPendingFiles((prev) => [...prev, ...files.slice(0, slots).map((file) => ({ file, title: file.name }))]);
    e.target.value = "";
  };

  const removePending = (i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const displayName = String(form.displayName || form[cfg.nameKey] || "").trim();
    if (!displayName) return;

    const billingStr  = [form.billing.street1, form.billing.street2].filter(Boolean).join(", ");
    const shippingStr = [form.shipping.street1, form.shipping.street2].filter(Boolean).join(", ");

    const payload = {
      ...form,
      [cfg.nameKey]: displayName,
      displayName,
      language: form[cfg.langKey],
      address:         billingStr,
      billingAddress:  billingStr,
      shippingAddress: shippingStr,
      city:  form.billing.city,
      state: form.billing.state,
      openingBalance: form.openingBalance === "" ? 0 : Number(form.openingBalance),
    };

    onSubmit?.(payload, pendingFiles);
  };

  const existingDocs = Array.isArray(value?.documents) ? value.documents : [];
  const totalFiles   = existingDocs.length + pendingFiles.length;
  const displayName  = String(form.displayName || form[cfg.nameKey] || "").trim();
  const titleLabel   = mode === "edit" ? `Edit ${cfg.label}` : `New ${cfg.label}`;

  return (
    <Modal
      open={open} onClose={onClose} title={titleLabel} size="xl" maxBodyHeight="72vh"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !displayName}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      }
    >
      <Box sx={{ px: { xs: 0, sm: 0.25 }, pb: 0.5 }}>
        <Stack spacing={2.4}>
          {/* GST strip */}
          <Box sx={{ bgcolor: "#eaf4ff", color: "#0f172a", px: 1.5, py: 1, borderRadius: "6px", fontSize: 13 }}>
            {cfg.gstText}{" "}
            <Box component="span" sx={{ color: "#1f6ff2", cursor: "pointer" }}>Prefill &gt;</Box>
          </Box>

          {/* Top fields */}
          <Stack spacing={1.6}>
            <FormRow label={`${cfg.label} Type`}>
              <RadioGroup row value={form[cfg.typeKey]} onChange={(e) => patch(cfg.typeKey, e.target.value)}
                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 }, "& .MuiRadio-root": { p: 0.5 } }}>
                <FormControlLabel value="Business"   control={<Radio size="small" />} label="Business" />
                <FormControlLabel value="Individual" control={<Radio size="small" />} label="Individual" />
              </RadioGroup>
            </FormRow>

            <FormRow label="Primary Contact">
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={2.2}>
                  <ZohoInput select value={form.salutation} onChange={(v) => patch("salutation", v)}>
                    {["", "Mr.", "Mrs.", "Ms.", "Dr."].map((s) => <MenuItem key={s} value={s}>{s || "Salutation"}</MenuItem>)}
                  </ZohoInput>
                </Grid>
                <Grid item xs={12} md={3}>
                  <ZohoInput value={form.firstName} onChange={(v) => patch("firstName", v)} placeholder="First Name" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <ZohoInput value={form.lastName} onChange={(v) => patch("lastName", v)} placeholder="Last Name" />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label="Company Name">
              <Grid container><Grid item xs={12} md={5.5}>
                <ZohoInput value={form.companyName} onChange={(v) => patch("companyName", v)} />
              </Grid></Grid>
            </FormRow>

            <FormRow label="Display Name" required>
              <Grid container><Grid item xs={12} md={5.5}>
                <ZohoInput value={form.displayName} onChange={(v) => patch("displayName", v)} placeholder="Select or type to add" />
              </Grid></Grid>
            </FormRow>

            <FormRow label="Email Address">
              <Grid container><Grid item xs={12} md={5.5}>
                <ZohoInput value={form.email} onChange={(v) => patch("email", v)}
                  startAdornment={<MailOutlineRoundedIcon sx={{ fontSize: 15, color: "#6b7280" }} />} />
              </Grid></Grid>
            </FormRow>

            <FormRow label="Phone">
              <Grid container spacing={1.25}>
                <Grid item xs={3} md={1.1}><ZohoInput select value="+91" onChange={() => {}}><MenuItem value="+91">+91</MenuItem></ZohoInput></Grid>
                <Grid item xs={9} md={2.5}><ZohoInput value={form.workPhone} onChange={(v) => patch("workPhone", v)} placeholder="Work Phone" /></Grid>
                <Grid item xs={3} md={1.1}><ZohoInput select value="+91" onChange={() => {}}><MenuItem value="+91">+91</MenuItem></ZohoInput></Grid>
                <Grid item xs={9} md={2.5}><ZohoInput value={form.mobile} onChange={(v) => patch("mobile", v)} placeholder="Mobile" /></Grid>
              </Grid>
            </FormRow>

            <FormRow label={`${cfg.label} Language`}>
              <Grid container><Grid item xs={12} md={5.5}>
                <ZohoInput select value={form[cfg.langKey]} onChange={(v) => patch(cfg.langKey, v)}>
                  {["English", "Hindi", "Marathi"].map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </ZohoInput>
              </Grid></Grid>
            </FormRow>
          </Stack>

          {/* Tabs */}
          <Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #dbe2ea", minHeight: 38,
                "& .MuiTab-root": { minHeight: "38px !important", px: 2, fontSize: "13px !important", textTransform: "none" },
                "& .MuiTab-root.Mui-selected": { color: "#1f6ff2", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "#1f6ff2" },
              }}
            >
              <Tab label="Other Details" />
              <Tab label="Address" />
              <Tab label="Contact Persons" />
              <Tab label="Remarks" />
            </Tabs>

            {/* Tab 0: Other Details */}
            <TabPanel value={tab} index={0}>
              <Stack spacing={1.6}>
                <FormRow label="PAN">
                  <Grid container><Grid item xs={12} md={5.5}>
                    <ZohoInput value={form.pan} onChange={(v) => patch("pan", v)} />
                  </Grid></Grid>
                </FormRow>
                <FormRow label="Currency">
                  <Grid container><Grid item xs={12} md={5.5}>
                    <ZohoInput select value={form.currency} onChange={(v) => patch("currency", v)}>
                      <MenuItem value="INR - Indian Rupee">INR - Indian Rupee</MenuItem>
                    </ZohoInput>
                  </Grid></Grid>
                </FormRow>
                <FormRow label={cfg.payableLabel}>
                  <Grid container><Grid item xs={12} md={5.5}>
                    <ZohoInput value={form[cfg.payableKey]} onChange={(v) => patch(cfg.payableKey, v)} placeholder="Select an account" />
                  </Grid></Grid>
                </FormRow>
                <FormRow label="Opening Balance">
                  <Grid container><Grid item xs={12} md={5.5}>
                    <ZohoInput type="number" value={form.openingBalance} onChange={(v) => patch("openingBalance", v)}
                      startAdornment={<Typography sx={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>INR</Typography>} />
                  </Grid></Grid>
                </FormRow>
                <FormRow label="Payment Terms">
                  <Grid container><Grid item xs={12} md={5.5}>
                    <ZohoInput select value={form.paymentTerms} onChange={(v) => patch("paymentTerms", v)}>
                      {["Due on Receipt","Net 15","Net 30","Net 45","Net 60"].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </ZohoInput>
                  </Grid></Grid>
                </FormRow>
                <FormRow label="Enable Portal?">
                  <FormControlLabel
                    control={<Checkbox checked={Boolean(form.enablePortal)} onChange={(e) => patch("enablePortal", e.target.checked)} size="small" />}
                    label={cfg.portalText}
                    sx={{ "& .MuiFormControlLabel-label": { fontSize: 13, color: "#111827" } }}
                  />
                </FormRow>
                <FormRow label="Documents">
                  <Stack spacing={1.25}>
                    {existingDocs.map((doc) => (
                      <Stack key={doc._id || doc.fileUrl} direction="row" spacing={1} alignItems="center">
                        <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                        <Typography sx={{ fontSize: 13, flex: 1 }}>{doc.title}</Typography>
                        {doc.fileUrl && (
                          <Box component="span" onClick={() => window.open(doc.fileUrl, "_blank")}
                            sx={{ fontSize: 12, color: "#1f6ff2", cursor: "pointer" }}>View</Box>
                        )}
                      </Stack>
                    ))}
                    {pendingFiles.map((pf, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: "#4088ff" }} />
                        <Typography sx={{ fontSize: 13, flex: 1, color: "#374151" }}>{pf.file.name}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>pending upload</Typography>
                        <IconButton size="small" onClick={() => removePending(i)}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                        </IconButton>
                      </Stack>
                    ))}
                    {totalFiles < 10 && (
                      <>
                        <input ref={fileRef} type="file" hidden multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          onChange={handleFileSelect} />
                        <Box>
                          <Button variant="outline" startIcon={<InsertDriveFileOutlinedIcon />}
                            onClick={() => fileRef.current?.click()}>
                            Upload File
                          </Button>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                          You can upload a maximum of 10 files, 10MB each
                        </Typography>
                      </>
                    )}
                  </Stack>
                </FormRow>
              </Stack>
            </TabPanel>

            {/* Tab 1: Address */}
            <TabPanel value={tab} index={1}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <AddressForm title="Billing Address" value={form.billing} onChange={patchBilling} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <AddressForm title="Shipping Address" value={form.shipping} onChange={patchShipping} onCopyFrom={copyBillingToShipping} />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 2: Contact Persons */}
            <TabPanel value={tab} index={2}>
              <ContactPersonsTab rows={form.contactPersons} onChange={(v) => patch("contactPersons", v)} />
            </TabPanel>

            {/* Tab 3: Remarks */}
            <TabPanel value={tab} index={3}>
              <FormRow label="Remarks">
                <Grid container><Grid item xs={12} md={8}>
                  <ZohoInput multiline minRows={5} value={form.remarks} onChange={(v) => patch("remarks", v)}
                    placeholder="Remarks (For Internal Use)" />
                </Grid></Grid>
              </FormRow>
            </TabPanel>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}
