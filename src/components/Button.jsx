import React from "react";
import PropTypes from "prop-types";
import { Button as MuiButton } from "@mui/material";

const variantMap = {
  primary: "contained",
  secondary: "outlined",
  outline: "outlined",
  danger: "contained",
  success: "contained",
  warning: "contained",
  ghost: "text",
  text: "text",
};

const colorMap = {
  primary: "primary",
  secondary: "inherit",
  outline: "inherit",
  danger: "error",
  success: "success",
  warning: "warning",
  ghost: "inherit",
  text: "primary",
};

export default function Button({ children, variant = "primary", icon: Icon, startIcon, endIcon, sx, ...props }) {
  const mappedVariant = variantMap[variant] || variant;
  const mappedColor = colorMap[variant] || "primary";
  const resolvedStartIcon = startIcon || (Icon ? <Icon size={15} /> : undefined);

  return (
    <MuiButton
      variant={mappedVariant}
      color={mappedColor}
      startIcon={resolvedStartIcon}
      endIcon={endIcon}
      disableElevation
      sx={{
        minHeight: 32,
        px: 1.5,
        borderRadius: "5px",
        textTransform: "none",
        fontSize: 13,
        fontWeight: 400,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        boxShadow: "none",
        ...(variant === "outline" || variant === "secondary"
          ? { borderColor: "#d7dce8", color: "#111827", bgcolor: "#fff", "&:hover": { borderColor: "#b9c2d5", bgcolor: "#f8fafc" } }
          : null),
        ...(sx || {}),
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.string,
  icon: PropTypes.elementType,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  sx: PropTypes.object,
};
