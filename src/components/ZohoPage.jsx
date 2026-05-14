import React from "react";
import { Box } from "@mui/material";

export default function ZohoPage({ children, sx = {} }) {
  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: "100%",
        bgcolor: "#fff",
        px: { xs: 1.5, md: 2 },
        py: { xs: 1.25, md: 1.75 },
        overflow: "visible",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
