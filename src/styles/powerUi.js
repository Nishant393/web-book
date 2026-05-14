import React from "react";
import { GlobalStyles } from "@mui/material";

export const powerTokens = {
  colors: {
    pageBg: "#f7f8fb",
    cardBg: "#ffffff",
    sidebarBg: "#f4f5fb",
    topbar: "#20243a",
    border: "#e3e7ef",
    borderSoft: "#eef1f6",
    heading: "#111827",
    text: "#1f2937",
    muted: "#667085",
    label: "#68738a",
    primary: "#4088ff",
    primaryDark: "#1f6ff2",
    primarySoft: "#eaf2ff",
    success: "#18b779",
    successSoft: "#e7f8f0",
    danger: "#ef4444",
    dangerSoft: "#fff0f0",
    warning: "#f59e0b",
    warningSoft: "#fff7df",
    purple: "#7267f0",
  },

  radius: {
    card: 6,
    control: 5,
    pill: 999,
  },

  shadow: {
    card: "0 1px 2px rgba(16,24,40,0.04)",
    popover: "0 12px 36px rgba(16,24,40,0.16)",
    dialog: "0 18px 46px rgba(16,24,40,0.18)",
  },

  fontFamily: "Inter, Roboto, Arial, sans-serif",

  font: {
    pageTitle: {
      fontSize: 20,
      fontWeight: 500,
      lineHeight: 1.35,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 500,
      lineHeight: 1.35,
    },
    body: {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.45,
    },
    label: {
      fontSize: 12,
      fontWeight: 500,
      color: "#68738a",
    },
  },
};

export const powerSx = {
  page: {
    minHeight: "100%",
    width: "100%",
    minWidth: 0,
    bgcolor: powerTokens.colors.pageBg,
    color: powerTokens.colors.text,
    fontFamily: powerTokens.fontFamily,
  },

  card: {
    bgcolor: powerTokens.colors.cardBg,
    border: `1px solid ${powerTokens.colors.border}`,
    borderRadius: `${powerTokens.radius.card}px`,
    boxShadow: powerTokens.shadow.card,
  },

  cardTitle: {
    ...powerTokens.font.cardTitle,
    color: powerTokens.colors.heading,
  },

  label: {
    ...powerTokens.font.label,
  },
};

export function HistoricalUiStyles() {
  const c = powerTokens.colors;

  return React.createElement(GlobalStyles, {
    styles: {
      "*": {
        boxSizing: "border-box",
      },

      "html, body, #root": {
        margin: 0,
        width: "100%",
        minWidth: 0,
        minHeight: "100vh",
        fontFamily: `${powerTokens.fontFamily} !important`,
        backgroundColor: c.pageBg,
        color: c.text,
        WebkitFontSmoothing: "antialiased",
      },

      "#root": {
        width: "100%",
        minWidth: 0,
        minHeight: "100vh",
      },

      ".MuiTypography-root, .MuiButton-root, .MuiInputBase-root, .MuiInputBase-input, .MuiFormLabel-root, .MuiMenuItem-root, .MuiChip-root, .MuiTableCell-root, .MuiTab-root, .MuiTooltip-tooltip, .MuiDialogTitle-root, .MuiListItemText-root": {
        fontFamily: `${powerTokens.fontFamily} !important`,
      },

      body: {
        fontSize: 14,
        fontWeight: 400,
        overflowY: "auto",
        overflowX: "hidden",
      },

      "::-webkit-scrollbar": {
        width: 8,
        height: 8,
      },

      "::-webkit-scrollbar-track": {
        background: "#f4f5fb",
      },

      "::-webkit-scrollbar-thumb": {
        background: "#c5ccdb",
        borderRadius: 999,
      },

      "::-webkit-scrollbar-thumb:hover": {
        background: "#9aa4b8",
      },

      ".MuiButton-root": {
        textTransform: "none !important",
        fontSize: "13px !important",
        fontWeight: "400 !important",
        borderRadius: "5px !important",
        boxShadow: "none !important",
        minHeight: "32px !important",
      },

      ".MuiButton-containedPrimary": {
        backgroundColor: `${c.primary} !important`,
      },

      ".MuiButton-containedPrimary:hover": {
        backgroundColor: `${c.primaryDark} !important`,
      },

      ".MuiOutlinedInput-root": {
        borderRadius: "5px !important",
        backgroundColor: "#fff",
      },

      ".MuiInputBase-input": {
        fontSize: "13px !important",
        paddingTop: "8px !important",
        paddingBottom: "8px !important",
      },

      ".MuiInputLabel-root": {
        fontSize: "13px !important",
      },

      ".MuiTab-root": {
        minHeight: "42px !important",
        fontSize: "13px !important",
        fontWeight: "400 !important",
        textTransform: "none !important",
        color: "#31384a !important",
      },

      ".MuiTab-root.Mui-selected": {
        color: `${c.primary} !important`,
        fontWeight: "500 !important",
      },

      ".MuiTabs-indicator": {
        height: "3px !important",
        backgroundColor: `${c.primary} !important`,
        borderRadius: "3px 3px 0 0",
      },

      ".MuiTableCell-root": {
        borderBottom: `1px solid ${c.borderSoft} !important`,
        fontSize: "13px !important",
        padding: "10px 14px !important",
      },

      ".MuiTableHead-root .MuiTableCell-root": {
        color: "#697386 !important",
        fontSize: "11px !important",
        fontWeight: "600 !important",
        textTransform: "uppercase",
        background: "#f7f8fb !important",
        letterSpacing: "0.02em",
      },

      ".MuiChip-root": {
        height: "24px !important",
        fontSize: "12px !important",
        borderRadius: "999px !important",
      },

      ".MuiPaper-root": {
        backgroundImage: "none !important",
      },

      ".zoho-card": {
        backgroundColor: "#fff",
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
      },

      ".zoho-page-title": {
        fontSize: 20,
        fontWeight: 500,
        color: c.heading,
      },

      ".zoho-section-title": {
        fontSize: 18,
        fontWeight: 500,
        color: c.heading,
      },

      ".zoho-muted": {
        color: `${c.muted} !important`,
        fontSize: 13,
      },

      ".zoho-link": {
        color: `${c.primary} !important`,
        cursor: "pointer",
        textDecoration: "none",
      },
    },
  });
}