import React from "react";
import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";

export default function BrandLogo({ collapsed = false, onClick, sx }) {
  const theme = useTheme();

  const moneyColor = theme.palette.text.primary;
  const iqColor = "#00A9E8";
  const aiColor = "#00A88F";

  if (collapsed) {
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
          width: 56,
          height: 56,
          borderRadius: "18px",
          display: "grid",
          placeItems: "center",
          cursor: onClick ? "pointer" : "default",
          color: "common.white",
          background: `linear-gradient(135deg, ${iqColor}, ${aiColor})`,
          boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.22)}`,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 6,
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.40)",
          },
          ...sx,
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: 24, lineHeight: 1, color: "common.white" }}>
          M
        </Typography>
      </Box>
    );
  }

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
        gap: 1.15,
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          position: "relative",
          flexShrink: 0,
          border: `2px solid ${alpha(iqColor, 0.45)}`,
          bgcolor: alpha(iqColor, 0.06),
          color: iqColor,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 5,
            borderRadius: "50%",
            border: `1px dashed ${alpha(aiColor, 0.65)}`,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 9,
            height: 9,
            borderRadius: "50%",
            right: -1,
            top: 8,
            bgcolor: aiColor,
            boxShadow: `-28px 25px 0 ${iqColor}, -10px -12px 0 ${alpha(moneyColor, 0.38)}`,
          },
        }}
      >
        <AccountBalanceWalletRoundedIcon sx={{ fontSize: 22, position: "relative", zIndex: 1 }} />
        <AutoGraphRoundedIcon
          sx={{
            fontSize: 15,
            position: "absolute",
            zIndex: 2,
            right: 7,
            bottom: 7,
            color: aiColor,
            bgcolor: "background.paper",
            borderRadius: "50%",
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0, lineHeight: 1 }}>
        <Typography
          component="div"
          sx={{
            fontSize: { xs: 22, sm: 25 },
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.055em",
            whiteSpace: "nowrap",
          }}
        >
          <Box component="span" sx={{ color: moneyColor }}>
            Money
          </Box>
          <Box component="span" sx={{ color: iqColor }}>
            IQ
          </Box>
          <Box component="span" sx={{ color: aiColor }}>
            -AI
          </Box>
        </Typography>
        <Typography
          component="div"
          sx={{
            mt: 0.3,
            pl: 0.35,
            color: "text.secondary",
            fontWeight: 800,
            fontSize: 11,
            lineHeight: 1,
            letterSpacing: "0.05em",
            textAlign: "right",
          }}
        >
          By ESM
        </Typography>
      </Box>
    </Box>
  );
}

BrandLogo.propTypes = {
  collapsed: PropTypes.bool,
  onClick: PropTypes.func,
  sx: PropTypes.object,
};
