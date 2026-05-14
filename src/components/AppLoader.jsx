import React from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function AppLoader({ text = "Loading...", fullHeight = 220 }) {
  return (
    <Box
      sx={{
        minHeight: fullHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
      }}
    >
      <CircularProgress size={28} thickness={4} />
      {text ? (
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      ) : null}
    </Box>
  );
}

AppLoader.propTypes = {
  text: PropTypes.string,
  fullHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
