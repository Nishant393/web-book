import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import Button from "../Button";
import Modal from "../Modal";
import AddressForm from "./AddressForm";
import ContactPersonsTab from "./ContactPersonsTab";
import { buildSubmitPayload, getConfig, mergeForm } from "./formUtils";
import {
  FormRow,
  InlineFields,
  TabPanel,
  ZohoInput,
} from "./ZohoFormParts";
import { FORM_LAYOUT } from "./constants";

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
  const [tab, setTab] = useState(0);
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

      if (key === "displayName") {
        next[cfg.nameKey] = val;
      }

      if (key === "companyName" && !next.displayName) {
        next.displayName = val;
        next[cfg.nameKey] = val;
      }

      if (key === "firstName" || key === "lastName") {
        next.contactPerson = [
          key === "firstName" ? val : next.firstName,
          key === "lastName" ? val : next.lastName,
        ]
          .filter(Boolean)
          .join(" ");
      }

      return next;
    });

  const patchBilling = (val) =>
    setForm((prev) => ({
      ...prev,
      billing: val,
    }));

  const patchShipping = (val) =>
    setForm((prev) => ({
      ...prev,
      shipping: val,
    }));

  const copyBillingToShipping = () =>
    setForm((prev) => ({
      ...prev,
      shipping: { ...prev.billing },
    }));

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    const used = (value?.documents?.length || 0) + pendingFiles.length;
    const slots = Math.max(0, 10 - used);

    setPendingFiles((prev) => [
      ...prev,
      ...files.slice(0, slots).map((file) => ({
        file,
        title: file.name,
      })),
    ]);

    event.target.value = "";
  };

  const removePending = (index) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== index));

  const handleSave = () => {
    const displayName = String(
      form.displayName || form[cfg.nameKey] || ""
    ).trim();

    if (!displayName) return;

    const payload = buildSubmitPayload(form, cfg);
    onSubmit?.(payload, pendingFiles);
  };

  const existingDocs = Array.isArray(value?.documents) ? value.documents : [];
  const totalFiles = existingDocs.length + pendingFiles.length;

  const displayName = String(form.displayName || form[cfg.nameKey] || "").trim();
  const titleLabel = mode === "edit" ? `Edit ${cfg.label}` : `New ${cfg.label}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleLabel}
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
            disabled={saving || !displayName}
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
       <Stack
  spacing={1.55}
  sx={{
    px: `${FORM_LAYOUT.formPaddingX}px`,
  }}
>
          <Box
            sx={{
              bgcolor: "#eaf4ff",
              color: "#0f172a",
              px: 1.5,
              py: 1,
              borderRadius: "0px",
              fontSize: 13,
              minHeight: 40,
              display: "flex",
              alignItems: "center",
            }}
          >
            {cfg.gstText}{" "}
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

          <Stack spacing={1.55}>
            <FormRow label={`${cfg.label} Type`}>
              <RadioGroup
                row
                value={form[cfg.typeKey]}
                onChange={(e) => patch(cfg.typeKey, e.target.value)}
                sx={{
                  minHeight: 34,
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
                >
                  {["", "Mr.", "Mrs.", "Ms.", "Dr."].map((item) => (
                    <MenuItem key={item} value={item}>
                      {item || "Salutation"}
                    </MenuItem>
                  ))}
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
                startAdornment={
                  <MailOutlineRoundedIcon
                    sx={{ fontSize: 15, color: "#6b7280" }}
                  />
                }
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

            <FormRow label={`${cfg.label} Language`}>
              <ZohoInput
                select
                value={form[cfg.langKey]}
                onChange={(v) => patch(cfg.langKey, v)}
              >
                {["English", "Hindi", "Marathi"].map((language) => (
                  <MenuItem key={language} value={language}>
                    {language}
                  </MenuItem>
                ))}
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
                "& .MuiTab-root.Mui-selected": {
                  color: "#1f6ff2 !important",
                  fontWeight: 600,
                },
                "& .MuiTabs-indicator": {
                  bgcolor: "#1f6ff2",
                  height: 2,
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
  <Box sx={{ px: `${FORM_LAYOUT.formPaddingX}px` }}>
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

                <FormRow label={cfg.payableLabel}>
                  <ZohoInput
                    value={form[cfg.payableKey]}
                    onChange={(v) => patch(cfg.payableKey, v)}
                    placeholder="Select an account"
                  />
                </FormRow>

                <FormRow label="Opening Balance" showInfo={false}>
                  <ZohoInput
                    type="number"
                    value={form.openingBalance}
                    onChange={(v) => patch("openingBalance", v)}
                    startAdornment={
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        INR
                      </Typography>
                    }
                  />
                </FormRow>

                <FormRow label="Payment Terms" showInfo={false}>
                  <ZohoInput
                    select
                    value={form.paymentTerms}
                    onChange={(v) => patch("paymentTerms", v)}
                  >
                    {["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"].map(
                      (term) => (
                        <MenuItem key={term} value={term}>
                          {term}
                        </MenuItem>
                      )
                    )}
                  </ZohoInput>
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
                    label={cfg.portalText}
                    sx={{
                      m: 0,
                      minHeight: 34,
                      "& .MuiFormControlLabel-label": {
                        fontSize: 13,
                        color: "#111827",
                      },
                    }}
                  />
                </FormRow>

                <FormRow label="Documents" showInfo={false}>
                  <Stack spacing={1.25}>
                    {existingDocs.map((doc) => (
                      <Stack
                        key={doc._id || doc.fileUrl}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <InsertDriveFileOutlinedIcon
                          sx={{ fontSize: 18, color: "#6b7280" }}
                        />

                        <Typography sx={{ fontSize: 13, flex: 1 }}>
                          {doc.title}
                        </Typography>

                        {doc.fileUrl ? (
                          <Box
                            component="span"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            sx={{
                              fontSize: 12,
                              color: "#1f6ff2",
                              cursor: "pointer",
                            }}
                          >
                            View
                          </Box>
                        ) : null}
                      </Stack>
                    ))}

                    {pendingFiles.map((pf, index) => (
                      <Stack
                        key={index}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <InsertDriveFileOutlinedIcon
                          sx={{ fontSize: 18, color: "#4088ff" }}
                        />

                        <Typography
                          sx={{
                            fontSize: 13,
                            flex: 1,
                            color: "#374151",
                          }}
                        >
                          {pf.file.name}
                        </Typography>

                        <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>
                          pending upload
                        </Typography>

                        <IconButton size="small" onClick={() => removePending(index)}>
                          <DeleteOutlineRoundedIcon
                            sx={{ fontSize: 16, color: "#ef4444" }}
                          />
                        </IconButton>
                      </Stack>
                    ))}

                    {totalFiles < 10 ? (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          hidden
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          onChange={handleFileSelect}
                        />

                        <Box>
                          <Button
                            variant="outline"
                            startIcon={<InsertDriveFileOutlinedIcon />}
                            onClick={() => fileRef.current?.click()}
                          >
                            Upload File
                          </Button>
                        </Box>

                        <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
                          You can upload a maximum of 10 files, 10MB each
                        </Typography>
                      </>
                    ) : null}
                  </Stack>
                </FormRow>
              </Stack>
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "1fr 1fr",
                  },
                  gap: 4,
                }}
              >
                <AddressForm
                  title="Billing Address"
                  value={form.billing}
                  onChange={patchBilling}
                />

                <AddressForm
                  title="Shipping Address"
                  value={form.shipping}
                  onChange={patchShipping}
                  onCopyFrom={copyBillingToShipping}
                />
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={2}>
              <ContactPersonsTab
                rows={form.contactPersons}
                onChange={(v) => patch("contactPersons", v)}
              />
            </TabPanel>

            <TabPanel value={tab} index={3}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>
                No custom fields added.
              </Typography>
            </TabPanel>

            <TabPanel value={tab} index={4}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>
                No reporting tags added.
              </Typography>
            </TabPanel>

            <TabPanel value={tab} index={5}>
              <FormRow label="Remarks" showInfo={false}>
                <ZohoInput
                  multiline
                  minRows={5}
                  width={500}
                  value={form.remarks}
                  onChange={(v) => patch("remarks", v)}
                  placeholder="Remarks (For Internal Use)"
                />
              </FormRow>
            </TabPanel>
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
}