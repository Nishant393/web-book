import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
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

const ZOHO_LABEL_W = 180;
const ZOHO_FIELD_W = 330;
const ZOHO_INPUT_H = 34;

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

function FieldLabel({ children, required = false, showInfo = true }) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        width: ZOHO_LABEL_W,
        minWidth: ZOHO_LABEL_W,
        pt: 0.65,
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: required ? "#e11d48" : "#111827",
          fontWeight: 400,
          lineHeight: "18px",
          whiteSpace: "nowrap",
        }}
      >
        {children}
        {required ? "*" : ""}
      </Typography>

      {showInfo ? (
        <InfoOutlinedIcon sx={{ fontSize: 14, color: "#64748b" }} />
      ) : null}
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
  width = ZOHO_FIELD_W,
  disabled = false,
}) {
  return (
    <TextField
      size="small"
      type={type}
      select={select}
      value={value || ""}
      placeholder={placeholder}
      multiline={multiline}
      minRows={minRows}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      InputProps={
        startIcon
          ? {
              startAdornment: (
                <Box
                  sx={{
                    mr: 0.75,
                    display: "flex",
                    color: "#6b7280",
                    alignItems: "center",
                  }}
                >
                  {startIcon}
                </Box>
              ),
            }
          : undefined
      }
      sx={{
        width: {
          xs: "100%",
          sm: width,
        },
        maxWidth: "100%",
        "& .MuiOutlinedInput-root": {
          minHeight: multiline ? "auto" : ZOHO_INPUT_H,
          height: multiline ? "auto" : ZOHO_INPUT_H,
          borderRadius: "5px",
          bgcolor: disabled ? "#f8fafc" : "#fff",
          fontSize: 13,
        },
        "& .MuiInputBase-input": {
          fontSize: "13px !important",
          py: multiline ? "8px !important" : "7px !important",
        },
        "& .MuiSelect-select": {
          py: "7px !important",
          fontSize: "13px !important",
        },
      }}
    >
      {children}
    </TextField>
  );
}

function FormRow({ label, required = false, children, showInfo = true }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        minHeight: 40,
        width: "100%",
        "@media (max-width: 700px)": {
          display: "block",
        },
      }}
    >
      <FieldLabel required={required} showInfo={showInfo}>
        {label}
      </FieldLabel>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          "@media (max-width: 700px)": {
            mt: 0.75,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function InlineFields({ children, width = 690 }) {
  return (
    <Box
      sx={{
        width: {
          xs: "100%",
          md: width,
        },
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        flexWrap: "wrap",
      }}
    >
      {children}
    </Box>
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
    [isVendor, mode]
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
        const contact = [
          key === "firstName" ? val : next.firstName,
          key === "lastName" ? val : next.lastName,
        ]
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
    const displayName = String(
      form.displayName || form[config.nameKey] || ""
    ).trim();

    if (!displayName) return;

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
          justifyContent="flex-start"
          sx={{ width: "100%" }}
        >
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={
              saving ||
              !String(form.displayName || form[config.nameKey] || "").trim()
            }
          >
            {saving ? "Saving..." : "Save"}
          </Button>

          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </Stack>
      }
    >
      <Box sx={{ px: 0, pb: 0.5 }}>
        <Stack spacing={2.4}>
          <Box
            sx={{
              bgcolor: "#eaf4ff",
              color: "#0f172a",
              px: 1.5,
              py: 1,
              borderRadius: "0px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              minHeight: 40,
            }}
          >
            {config.gstText}{" "}
            <Box
              component="span"
              sx={{
                color: "#1f6ff2",
                cursor: "pointer",
                ml: 0.5,
                fontWeight: 500,
              }}
            >
              Prefill &gt;
            </Box>
          </Box>

          <Stack spacing={1.55} sx={{ width: "100%" }}>
            <FormRow label={`${isVendor ? "Vendor" : "Customer"} Type`}>
              <RadioGroup
                row
                value={form[config.typeKey]}
                onChange={(e) => patch(config.typeKey, e.target.value)}
                sx={{
                  minHeight: ZOHO_INPUT_H,
                  alignItems: "center",
                  "& .MuiFormControlLabel-root": {
                    mr: 1.4,
                  },
                  "& .MuiFormControlLabel-label": {
                    fontSize: 13,
                    color: "#111827",
                  },
                  "& .MuiRadio-root": {
                    p: 0.45,
                  },
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
              <InlineFields>
                <ZohoInput
                  select
                  width={140}
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

                <ZohoInput
                  width={150}
                  value={form.firstName}
                  onChange={(v) => patch("firstName", v)}
                  placeholder="First Name"
                />

                <ZohoInput
                  width={150}
                  value={form.lastName}
                  onChange={(v) => patch("lastName", v)}
                  placeholder="Last Name"
                />
              </InlineFields>
            </FormRow>

            <FormRow label="Company Name" showInfo={false}>
              <ZohoInput
                value={form.companyName}
                onChange={(v) => patch("companyName", v)}
              />
            </FormRow>

            <FormRow label="Display Name" required>
              <ZohoInput
                value={form.displayName}
                onChange={(v) => patch("displayName", v)}
                placeholder="Select or type to add"
              />
            </FormRow>

            <FormRow label="Email Address">
              <ZohoInput
                value={form.email}
                onChange={(v) => patch("email", v)}
                startIcon={<MailOutlineRoundedIcon sx={{ fontSize: 15 }} />}
              />
            </FormRow>

            <FormRow label="Phone">
              <InlineFields>
                <ZohoInput select width={70} value="+91" onChange={() => {}}>
                  <MenuItem value="+91">+91</MenuItem>
                </ZohoInput>

                <ZohoInput
                  width={140}
                  value={form.workPhone}
                  onChange={(v) => patch("workPhone", v)}
                  placeholder="Work Phone"
                />

                <ZohoInput select width={70} value="+91" onChange={() => {}}>
                  <MenuItem value="+91">+91</MenuItem>
                </ZohoInput>

                <ZohoInput
                  width={140}
                  value={form.mobile}
                  onChange={(v) => patch("mobile", v)}
                  placeholder="Mobile"
                />
              </InlineFields>
            </FormRow>

            <FormRow label={`${isVendor ? "Vendor" : "Customer"} Language`}>
              <ZohoInput
                select
                value={form[config.languageKey]}
                onChange={(v) => patch(config.languageKey, v)}
              >
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Hindi">Hindi</MenuItem>
                <MenuItem value="Marathi">Marathi</MenuItem>
              </ZohoInput>
            </FormRow>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #dbe2ea",
                minHeight: 38,
                pl: 0,
                "& .MuiTabs-flexContainer": {
                  gap: 1.5,
                },
                "& .MuiTab-root": {
                  minHeight: "38px !important",
                  px: 1.4,
                  fontSize: "13px !important",
                  textTransform: "none",
                  color: "#111827",
                },
                "& .Mui-selected": {
                  color: "#111827 !important",
                  fontWeight: "600 !important",
                },
                "& .MuiTabs-indicator": {
                  height: 2,
                  bgcolor: "#4088ff",
                },
              }}
            >
              <Tab label="Other Details" />
              <Tab label="Address" />
              <Tab label="Contact Persons" />
              <Tab label="Custom Fields" />
              <Tab label="Reporting Tags" />
              <Tab label="Remarks" />
            </Tabs>

            <TabPanel value={tab} index={0}>
              <Stack spacing={1.55}>
                <FormRow label="PAN">
                  <ZohoInput
                    value={form.pan}
                    onChange={(v) => patch("pan", v)}
                  />
                </FormRow>

                <FormRow label="Currency" showInfo={false}>
                  <ZohoInput
                    select
                    value={form.currency}
                    onChange={(v) => patch("currency", v)}
                  >
                    <MenuItem value="INR - Indian Rupee">
                      INR - Indian Rupee
                    </MenuItem>
                  </ZohoInput>
                </FormRow>

                <FormRow label={config.payableLabel}>
                  <ZohoInput
                    value={form[config.payableField]}
                    onChange={(v) => patch(config.payableField, v)}
                    placeholder="Select an account"
                  />
                </FormRow>

                <FormRow label="Payment Terms" showInfo={false}>
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
                </FormRow>

                <FormRow label="Enable Portal?">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(form.enablePortal)}
                        onChange={(e) =>
                          patch("enablePortal", e.target.checked)
                        }
                        size="small"
                      />
                    }
                    label={config.portalText}
                    sx={{
                      m: 0,
                      minHeight: ZOHO_INPUT_H,
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
              <Stack spacing={1.55}>
                <FormRow label="Billing Address" showInfo={false}>
                  <ZohoInput
                    multiline
                    minRows={3}
                    width={500}
                    value={form.billingAddress || form.address}
                    onChange={(v) => {
                      patch("billingAddress", v);
                      patch("address", v);
                    }}
                    placeholder="Billing Address"
                  />
                </FormRow>

                <FormRow label="Shipping Address" showInfo={false}>
                  <ZohoInput
                    multiline
                    minRows={3}
                    width={500}
                    value={form.shippingAddress}
                    onChange={(v) => patch("shippingAddress", v)}
                    placeholder="Shipping Address"
                  />
                </FormRow>

                <FormRow label="City / State" showInfo={false}>
                  <InlineFields>
                    <ZohoInput
                      width={160}
                      value={form.city}
                      onChange={(v) => patch("city", v)}
                      placeholder="City"
                    />

                    <ZohoInput
                      width={160}
                      value={form.state}
                      onChange={(v) => patch("state", v)}
                      placeholder="State"
                    />
                  </InlineFields>
                </FormRow>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <Stack spacing={1.55}>
                <FormRow label="Contact Person" showInfo={false}>
                  <ZohoInput
                    value={form.contactPerson}
                    onChange={(v) => patch("contactPerson", v)}
                    placeholder="Contact person name"
                  />
                </FormRow>

                <FormRow label="GST Number" showInfo={false}>
                  <ZohoInput
                    value={form.gstNumber}
                    onChange={(v) => patch("gstNumber", v)}
                    placeholder="GST Number"
                  />
                </FormRow>
              </Stack>
            </TabPanel>

            <TabPanel value={tab} index={3}>
              <Box
                sx={{
                  pl: `${ZOHO_LABEL_W}px`,
                  "@media (max-width: 700px)": {
                    pl: 0,
                  },
                }}
              >
                <Typography sx={{ fontSize: 13, color: "#667085" }}>
                  No custom fields added.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={4}>
              <Box
                sx={{
                  pl: `${ZOHO_LABEL_W}px`,
                  "@media (max-width: 700px)": {
                    pl: 0,
                  },
                }}
              >
                <Typography sx={{ fontSize: 13, color: "#667085" }}>
                  No reporting tags added.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={5}>
              <FormRow label="Remarks" showInfo={false}>
                <ZohoInput
                  multiline
                  minRows={4}
                  width={500}
                  value={form.remarks}
                  onChange={(v) => patch("remarks", v)}
                  placeholder="Add remarks"
                />
              </FormRow>
            </TabPanel>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}