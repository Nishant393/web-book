import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import sanyojanLogo from "../assets/sanyojan_Motion.gif";

export default function BrandLogo({ collapsed = false, onClick, sx }) {
  return (
    <Box
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick(e);
      }}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...sx,
      }}
    >
      <Box
        component="img"
        src={sanyojanLogo}
        alt="Sanyojan Logo"
        sx={{
          height: collapsed ? 44 : 64,
          maxWidth: collapsed ? 44 : 200,
          objectFit: "contain",
        }}
      />
    </Box>
  );
}

BrandLogo.propTypes = {
  collapsed: PropTypes.bool,
  onClick: PropTypes.func,
  sx: PropTypes.object,
};
