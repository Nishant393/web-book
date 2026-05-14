import React from "react";
import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import BackButton from "./BackButton";

export default function PageHeader({ title, action, showBack = true }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      {showBack ? <BackButton /> : null}

      <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ flex: 1, minWidth: 180 }}>
        {title}
      </Typography>

      {action ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{action}</Box>
      ) : null}
    </Box>
  );
}

PageHeader.propTypes = {
  title: PropTypes.node,
  action: PropTypes.node,
  showBack: PropTypes.bool,
};
