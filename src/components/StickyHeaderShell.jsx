import React from "react";
import PropTypes from "prop-types";
import { Box, Paper } from "@mui/material";

export default function StickyHeaderShell({ children, boxSx, paperSx, paddingy = 1 }) {
  return (
    <Box
      sx={(theme) => {
        const extra = typeof boxSx === "function" ? boxSx(theme) : boxSx || {};
        return {
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar - 1,
          py: paddingy,
          bgcolor: "background.default",
          backdropFilter: "blur(12px)",
          ...extra,
        };
      }}
    >
      <Paper
        variant="outlined"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderColor: "divider",
          borderRadius: "10px",
          px: 2,
          py: 2,
          gap: 2,
          ...(paperSx || {}),
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

StickyHeaderShell.propTypes = {
  children: PropTypes.node,
  boxSx: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  paperSx: PropTypes.object,
  paddingy: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
