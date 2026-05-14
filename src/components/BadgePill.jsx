import React from "react";
import { Box } from "@mui/material";

const toneMap = {
  blue: { bg: "#eaf2ff", fg: "#1f6ff2" },
  green: { bg: "#e7f8f0", fg: "#0f9f6e" },
  red: { bg: "#fff0f0", fg: "#ef4444" },
  amber: { bg: "#fff7df", fg: "#b7791f" },
  gray: { bg: "#f1f3f7", fg: "#667085" },
};

export default function BadgePill({ children, tone = "gray", sx }) {
  const c = toneMap[tone] || toneMap.gray;
  return <Box component="span" sx={{ display: "inline-flex", alignItems: "center", px: 1, height: 24, borderRadius: 999, fontSize: 12, color: c.fg, bgcolor: c.bg, ...sx }}>{children}</Box>;
}
