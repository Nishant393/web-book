import React from "react";
import { Box, MenuItem, Stack, Typography } from "@mui/material";
import { STATES } from "./constants";
import { FormRow, InlineFields, ZohoInput } from "./ZohoFormParts";

export default function AddressForm({ value, onChange, title, onCopyFrom }) {
  const patch = (key, val) => onChange({ ...value, [key]: val });

  return (
    <Stack spacing={1.55}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 0.5 }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
          {title}
        </Typography>

        {onCopyFrom ? (
          <Box
            component="span"
            onClick={onCopyFrom}
            sx={{
              fontSize: 12,
              color: "#1f6ff2",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            ↓ Copy billing address
          </Box>
        ) : null}
      </Stack>

      <FormRow label="Attention" showInfo={false}>
        <ZohoInput
          value={value.attention}
          onChange={(v) => patch("attention", v)}
        />
      </FormRow>

      <FormRow label="Country/Region" showInfo={false}>
        <ZohoInput
          select
          value={value.country || "India"}
          onChange={(v) => patch("country", v)}
        >
          {["India", "USA", "UK", "UAE", "Singapore"].map((country) => (
            <MenuItem key={country} value={country}>
              {country}
            </MenuItem>
          ))}
        </ZohoInput>
      </FormRow>

      <FormRow label="Address" showInfo={false}>
        <Stack spacing={1}>
          <ZohoInput
            value={value.street1}
            onChange={(v) => patch("street1", v)}
            placeholder="Street 1"
            multiline
            minRows={2}
            width={500}
          />

          <ZohoInput
            value={value.street2}
            onChange={(v) => patch("street2", v)}
            placeholder="Street 2"
            multiline
            minRows={2}
            width={500}
          />
        </Stack>
      </FormRow>

      <FormRow label="City" showInfo={false}>
        <ZohoInput value={value.city} onChange={(v) => patch("city", v)} />
      </FormRow>

      <FormRow label="State" showInfo={false}>
        <ZohoInput select value={value.state} onChange={(v) => patch("state", v)}>
          <MenuItem value="">
            <em>Select state</em>
          </MenuItem>

          {STATES.map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </ZohoInput>
      </FormRow>

      <FormRow label="Pin Code" showInfo={false}>
        <ZohoInput
          value={value.pinCode}
          onChange={(v) => patch("pinCode", v)}
        />
      </FormRow>

      <FormRow label="Phone" showInfo={false}>
        <InlineFields width={420}>
          <ZohoInput select width={70} value="+91" onChange={() => {}}>
            <MenuItem value="+91">+91</MenuItem>
          </ZohoInput>

          <ZohoInput
            width={180}
            value={value.phone}
            onChange={(v) => patch("phone", v)}
          />
        </InlineFields>
      </FormRow>

      <FormRow label="Fax Number" showInfo={false}>
        <ZohoInput value={value.fax} onChange={(v) => patch("fax", v)} />
      </FormRow>
    </Stack>
  );
}   