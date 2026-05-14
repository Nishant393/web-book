import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import Button from "./Button";
import Modal from "./Modal";

const CUSTOMER_EMPTY = {
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
  customerLanguage: "English",
  pan: "",
  currency: "INR - Indian Rupee",
  accountsReceivable: "",
  paymentTerms: "Due on Receipt",
  enablePortal: false,
  address: "",
  billingAddress: "",
  shippingAddress: "",
  contactPerson: "",
  remarks: "",
  gstNumber: "",
  city: "",
  state: "",
};

const VENDOR_EMPTY = {
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
  vendorLanguage: "English",
  pan: "",
  currency: "INR - Indian Rupee",
  accountsPayable: "",
  paymentTerms: "Due on Receipt",
  enablePortal: false,
  address: "",
  billingAddress: "",
  shippingAddress: "",
  contactPerson: "",
  remarks: "",
  gstNumber: "",
  city: "",
  state: "",
};

function mergeInitial(type, value) {
  const base = type === "vendor" ? VENDOR_EMPTY : CUSTOMER_EMPTY;
  const nameKey = type === "vendor" ? "vendorName" : "customerName";
  const typeKey = type === "vendor" ? "vendorType" : "customerType";
  const languageKey = type === "vendor" ? "vendorLanguage" : "customerLanguage";

  const name = value?.[nameKey] || value?.displayName || value?.name || "";

  return {
    ...base,
    ...value,
    [typeKey]: value?.[typeKey] || "Business",
    [nameKey]: name,
    displayName: value?.displayName || name,
    contactPerson:
      value?.contactPerson ||
      [value?.firstName, value?.lastName].filter(Boolean).join(" "),
    mobile: value?.mobile || "",
    email: value?.email || "",
    address: value?.address || "",
    city: value?.city || "",
    state: value?.state || "",
    gstNumber: value?.gstNumber || "",
    [languageKey]: value?.[languageKey] || "English",
  };
}

function FieldLabel({ children, required = false }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography
        sx={{
          fontSize: 13,
          color: required ? "#e11d48" : "#111827",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {children}
        {required ? "*" : ""}
      </Typography>
      <InfoOutlinedIcon sx={{ fontSize: 14, color: "#64748b" }} />
    </Stack>
  );
}

function ZohoInput({
  value,
  onChange,
  placeholder,
  select = false,
  children,
  type = "text",
  multiline = false,
  minRows = 1,
  startIcon = null,
}) {
  return (
    <TextField
      fullWidth
      size="small"
      type={type}
      select={select}
      value={value || ""}
      placeholder={placeholder}
      multiline={multiline}
      minRows={minRows}
      onChange={(e) => onChange(e.target.value)}
      InputProps={
        startIcon
          ? {
              startAdornment: (
                <Box sx={{ mr: 0.75, display: "flex", color: "#6b7280" }}>
                  {startIcon}
                </Box>
              ),
            }
          : undefined
      }
      sx={{
        "& .MuiOutlinedInput-root": {
          height: multiline ? "auto" : 34,
          borderRadius: "5px",
          bgcolor: "#fff",
          fontSize: 13,
        },
        "& .MuiInputBase-input": {
          fontSize: "13px !important",
          py: multiline ? "8px !important" : "7px !important",
        },
      }}
    >
      {children}
    </TextField>
  );
}

function FormRow({ label, required = false, children }) {
  return (
    <Grid container spacing={1.5} alignItems="center">
      <Grid item xs={12} md={2.1}>
        <FieldLabel required={required}>{label}</FieldLabel>
      </Grid>
      <Grid item xs={12} md={9.9}>
        {children}
      </Grid>
    </Grid>
  );
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function ZohoPartyFormModal({
  open,
  type = "customer",
  mode = "create",
  value = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const isVendor = type === "vendor";

  const config = useMemo(
    () => ({
      title:
        mode === "edit"
          ? isVendor
            ? "Edit Vendor"
            : "Edit Customer"
          : isVendor
            ? "New Vendor"
            : "New Customer",
      nameKey: isVendor ? "vendorName" : "customerName",
      typeKey: isVendor ? "vendorType" : "customerType",
      languageKey: isVendor ? "vendorLanguage" : "customerLanguage",
      payableField: isVendor ? "accountsPayable" : "accountsReceivable",
      payableLabel: isVendor ? "Accounts Payable" : "Accounts Receivable",
      portalText: isVendor
        ? "Allow portal access for this vendor"
        : "Allow portal access for this customer",
      gstText: isVendor
        ? "Prefill vendor details from the GST portal using the Vendor's GSTIN."
        : "Prefill customer details from the GST portal using the Customer's GSTIN.",
    }),
    [isVendor, mode],
  );

  const [form, setForm] = useState(() => mergeInitial(type, value));
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!open) return;
    setForm(mergeInitial(type, value));
    setTab(0);
  }, [open, type, value]);

  const patch = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };

      if (key === "firstName" || key === "lastName") {
        const contact = [key === "firstName" ? val : next.firstName, key === "lastName" ? val : next.lastName]
          .filter(Boolean)
          .join(" ");
        next.contactPerson = contact;
      }

      if (key === "displayName") {
        next[config.nameKey] = val;
      }

      if (key === "companyName" && !next.displayName) {
        next.displayName = val;
        next[config.nameKey] = val;
      }

      return next;
    });
  };

  const handleSave = () => {
    const displayName = String(form.displayName || form[config.nameKey] || "").trim();

    if (!displayName) {
      return;
    }

    const payload = {
      ...form,
      [config.nameKey]: displayName,
      displayName,
      contactPerson:
        form.contactPerson ||
        [form.firstName, form.lastName].filter(Boolean).join(" "),
      mobile: form.mobile || form.workPhone || "",
      email: form.email || "",
      address: form.address || form.billingAddress || "",
    };

    onSubmit?.(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.title}
      size="xl"
      maxBodyHeight="72vh"
      footer={
        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ width: "100%" }}
        >
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !String(form.displayName || form[config.nameKey] || "").trim()}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      }
    >
      <Box
        sx={{
          px: { xs: 0, sm: 0.25 },
          pb: 0.5,
        }}
      >
        <Stack spacing={2.4}>
          {/* GST Prefill strip */}
          <Box
            sx={{
              bgcolor: "#eaf4ff",
              color: "#0f172a",
              px: 1.5,
              py: 1,
              borderRadius: "6px",
              fontSize: 13,
            }}
          >
            {config.gstText}{" "}
            <Box component="span" sx={{ color: "#1f6ff2", cursor: "pointer" }}>
              Prefill &gt;
            </Box>
          </Box>

          {/* Main fields */}
          <Stack spacing={1.6}>
            <FormRow label={`${isVendor ? "Vendor" : "Customer"} Type`}>
              <RadioGroup
                row
                value={form[config.typeKey]}
                onChange={(e) => patch(config.typeKey, e.target.value)}
                sx={{
                  "& .MuiFormControlLabel-label": { fontSize: 13 },
                  "& .MuiRadio-root": { p: 0.5 },
                }}
              >
                <FormControlLabel
                  value="Business"
                  control={<Radio size="small" />}
                  label="Business"
                />
                <FormControlLabel
                  value="Individual"
                  control={<Radio size="small" />}
                  label="Individual"
                />
              </RadioGroup>
            </FormRow>

            <FormRow label="Primary Contact">
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={2.1}>
                  <ZohoInput
                    select
                    value={form.salutation}
                    onChange={(v) => patch("salutation", v)}
                    placeholder="Salutation"
                  >
                    <MenuItem value="">Salutation</MenuItem>
                    <MenuItem value="Mr.">Mr.</MenuItem>
                    <MenuItem value="Mrs.">Mrs.</MenuItem>
                    <MenuItem value="Ms.">Ms.</MenuItem>
                    <MenuItem value="Dr.">Dr.</MenuItem>
                  </ZohoInput>
                </Grid>
                <Grid item xs={12} md={3}>
                  <ZohoInput
                    value={form.firstName}
                    onChange={(v) => patch("firstName", v)}
                    placeholder="First Name"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <ZohoInput
                    value={form.lastName}
                    onChange={(v) => patch("lastName", v)}
                    placeholder="Last Name"
                  />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label="Company Name">
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={4.9}>
                  <ZohoInput
                    value={form.companyName}
                    onChange={(v) => patch("companyName", v)}
                  />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label="Display Name" required>
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={4.9}>
                  <ZohoInput
                    value={form.displayName}
                    onChange={(v) => patch("displayName", v)}
                    placeholder="Select or type to add"
                    select={false}
                  />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label="Email Address">
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={4.9}>
                  <ZohoInput
                    value={form.email}
                    onChange={(v) => patch("email", v)}
                    startIcon={<MailOutlineRoundedIcon sx={{ fontSize: 15 }} />}
                  />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label="Phone">
              <Grid container spacing={1.25}>
                <Grid item xs={4} md={1.05}>
                  <ZohoInput select value="+91" onChange={() => {}}>
                    <MenuItem value="+91">+91</MenuItem>
                  </ZohoInput>
                </Grid>
                <Grid item xs={8} md={2.35}>
                  <ZohoInput
                    value={form.workPhone}
                    onChange={(v) => patch("workPhone", v)}
                    placeholder="Work Phone"
                  />
                </Grid>
                <Grid item xs={4} md={1.05}>
                  <ZohoInput select value="+91" onChange={() => {}}>
                    <MenuItem value="+91">+91</MenuItem>
                  </ZohoInput>
                </Grid>
                <Grid item xs={8} md={2.35}>
                  <ZohoInput
                    value={form.mobile}
                    onChange={(v) => patch("mobile", v)}
                    placeholder="Mobile"
                  />
                </Grid>
              </Grid>
            </FormRow>

            <FormRow label={`${isVendor ? "Vendor" : "Customer"} Language`}>
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={4.9}>
                  <ZohoInput
                    select
                    value={form[config.languageKey]}
                    onChange={(v) => patch(config.languageKey, v)}
                  >
                    <MenuItem value="English">English</MenuItem>
                    <MenuItem value="Hindi">Hindi</MenuItem>
                    <MenuItem value="Marathi">Marathi</MenuItem>
                  </ZohoInput>
                </Grid>
              </Grid>
            </FormRow>
          </Stack>

          {/* Tabs */}
          <Box>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #dbe2ea",
                minHeight: 38,
                "& .MuiTab-root": {
                  minHeight: "38px !important",
                  px: 2,
                  fontSize: "13px !important",
                },
              }}
            >
              <Tab label="Other Details" />
              <Tab label="Address" />
              <Tab label="Contact Persons" />
              <Tab label="Remarks" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Stack spacing={1.6}>
                <FormRow label="PAN">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        value={form.pan}
                        onChange={(v) => patch("pan", v)}
                      />
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="Currency">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        select
                        value={form.currency}
                        onChange={(v) => patch("currency", v)}
                      >
                        <MenuItem value="INR - Indian Rupee">
                          INR - Indian Rupee
                        </MenuItem>
                      </ZohoInput>
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label={config.payableLabel}>
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        value={form[config.payableField]}
                        onChange={(v) => patch(config.payableField, v)}
                        placeholder="Select an account"
                      />
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="Payment Terms">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        select
                        value={form.paymentTerms}
                        onChange={(v) => patch("paymentTerms", v)}
                      >
                        <MenuItem value="Due on Receipt">Due on Receipt</MenuItem>
                        <MenuItem value="Net 15">Net 15</MenuItem>
                        <MenuItem value="Net 30">Net 30</MenuItem>
                        <MenuItem value="Net 45">Net 45</MenuItem>
                      </ZohoInput>
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="Enable Portal?">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(form.enablePortal)}
                        onChange={(e) => patch("enablePortal", e.target.checked)}
                        size="small"
                      />
                    }
                    label={config.portalText}
                    sx={{
                      "& .MuiFormControlLabel-label": {
                        fontSize: 13,
                        color: "#111827",
                      },
                    }}
                  />
                </FormRow>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Stack spacing={1.6}>
                <FormRow label="Billing Address">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={6}>
                      <ZohoInput
                        multiline
                        minRows={3}
                        value={form.billingAddress || form.address}
                        onChange={(v) => {
                          patch("billingAddress", v);
                          patch("address", v);
                        }}
                        placeholder="Billing Address"
                      />
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="Shipping Address">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={6}>
                      <ZohoInput
                        multiline
                        minRows={3}
                        value={form.shippingAddress}
                        onChange={(v) => patch("shippingAddress", v)}
                        placeholder="Shipping Address"
                      />
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="City / State">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={3}>
                      <ZohoInput
                        value={form.city}
                        onChange={(v) => patch("city", v)}
                        placeholder="City"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <ZohoInput
                        value={form.state}
                        onChange={(v) => patch("state", v)}
                        placeholder="State"
                      />
                    </Grid>
                  </Grid>
                </FormRow>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <Stack spacing={1.6}>
                <FormRow label="Contact Person">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        value={form.contactPerson}
                        onChange={(v) => patch("contactPerson", v)}
                        placeholder="Contact person name"
                      />
                    </Grid>
                  </Grid>
                </FormRow>

                <FormRow label="GST Number">
                  <Grid container spacing={1.25}>
                    <Grid item xs={12} md={4.9}>
                      <ZohoInput
                        value={form.gstNumber}
                        onChange={(v) => patch("gstNumber", v)}
                        placeholder="GST Number"
                      />
                    </Grid>
                  </Grid>
                </FormRow>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={3}>
              <FormRow label="Remarks">
                <Grid container spacing={1.25}>
                  <Grid item xs={12} md={7}>
                    <ZohoInput
                      multiline
                      minRows={4}
                      value={form.remarks}
                      onChange={(v) => patch("remarks", v)}
                      placeholder="Add remarks"
                    />
                  </Grid>
                </Grid>
              </FormRow>
            </TabPanel>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}