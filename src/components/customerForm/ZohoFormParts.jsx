import React from "react";
import {
  Box,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { FORM_LAYOUT } from "./constants";

export function FieldLabel({ children, required = false, showInfo = true }) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        width: FORM_LAYOUT.labelWidth,
        minWidth: FORM_LAYOUT.labelWidth,
        pt: "8px",
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: required ? "#e11d48" : "#111827",
          fontWeight: 400,
          whiteSpace: "nowrap",
          lineHeight: "18px",
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

export function ZohoInput({
  value,
  onChange,
  placeholder,
  select = false,
  children,
  type = "text",
  multiline = false,
  minRows = 1,
  startAdornment,
  disabled = false,
  width = FORM_LAYOUT.fieldWidth,
}) {
  return (
    <TextField
      size="small"
      type={type}
      select={select}
      value={value ?? ""}
      placeholder={placeholder}
      multiline={multiline}
      minRows={multiline ? minRows : undefined}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      InputProps={
        startAdornment
          ? {
              startAdornment: (
                <InputAdornment position="start">
                  {startAdornment}
                </InputAdornment>
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
          minHeight: multiline ? "auto" : FORM_LAYOUT.inputHeight,
          height: multiline ? "auto" : FORM_LAYOUT.inputHeight,
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

export function FormRow({
  label,
  required = false,
  children,
  showInfo = true,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent:"space-between",
        width: "50%",
        minHeight: 40,
        gap: `${FORM_LAYOUT.labelInputGap}px`,

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

export function InlineFields({ children, width = 690 }) {
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

export function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}