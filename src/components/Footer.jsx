import React from "react";
import { Box, Stack, Typography } from "@mui/material";

export default function Footer() {
  const year = new Date().getFullYear();
  const version = import.meta.env.VITE_APP_VERSION || "v0.1.1";

  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Box sx={{ width: "100%", px: { xs: 2, sm: 3 }, py: 2 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
              MoneyIQ-AI
            </Box>
            <Box component="span" sx={{ color: "text.disabled" }}>
              {" "}by Elixgen
            </Box>
          </Typography>

          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            Future Update • {version} • © {year} Elixgen System Management Pvt. Ltd. All rights reserved.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
