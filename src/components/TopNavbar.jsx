import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../auth/AuthProvider";
import Button from "./Button";

const TOPBAR_H = 72;

function getInitials(name = "") {
  return String(name || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getDisplayRole(role, user) {
  const value = user?.roleName || user?.roleKey || user?.role || role || "USER";

  return String(value || "USER")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toUpperCase();
}

export default function TopNavbar({ isMobile, drawerWidth, onMenuClick }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();

  const displayName = user?.name || user?.fullName || user?.email || "User";
  const displayRole = useMemo(() => getDisplayRole(role, user), [role, user]);

  const primaryBorder = alpha(theme.palette.primary.main, 0.28);
  const primaryHoverBg = alpha(theme.palette.primary.main, 0.08);

  const avatarBg = useMemo(() => {
    const pool = [
      theme.palette.primary.main,
      theme.palette.success.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
    ];
    return pool[String(displayName || "U").charCodeAt(0) % pool.length];
  }, [displayName, theme.palette]);

  const handleLogout = () => {
    logout?.();
    navigate("/login", { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      color="default"
      sx={{
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        left: isMobile ? 0 : drawerWidth,
        width: isMobile ? "100%" : `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["left", "width"], {
          duration: theme.transitions.duration.shorter,
        }),
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ minHeight: `${TOPBAR_H}px !important`, px: { xs: 1.25, sm: 2 } }}>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            minWidth: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            {isMobile && (
              <IconButton
                onClick={onMenuClick}
                aria-label="Open menu"
                sx={{
                  width: 38,
                  height: 32,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: primaryBorder,
                  color: "primary.main",
                  "&:hover": { bgcolor: primaryHoverBg },
                }}
              >
                <MenuRoundedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            )}

            {!isMobile && (
              <Chip
                label="Dashboard"
                sx={{
                  height: 32,
                  borderRadius: 2,
                  px: 0.75,
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                }}
              />
            )}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 1.25 }} sx={{ minWidth: 0 }}>
            {!isMobile && (
              <Chip
                label={displayRole}
                size="small"
                sx={{
                  height: 32,
                  borderRadius: 2,
                  px: 0.75,
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              />
            )}

            <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.2 }} noWrap>
                {displayRole}
              </Typography>
            </Box>

            <Avatar
              alt={displayName}
              src={user?.avatar || undefined}
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                border: "1px solid",
                borderColor: primaryBorder,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`,
                bgcolor: user?.avatar ? alpha(theme.palette.text.primary, 0.08) : avatarBg,
                color: "common.white",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {!user?.avatar ? getInitials(displayName) || "U" : null}
            </Avatar>

            <Tooltip title="Logout">
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  aria-label="Logout"
                  startIcon={<LogoutRoundedIcon fontSize="small" />}
                  sx={{
                    minWidth: { xs: 36, sm: 88 },
                    height: 34,
                    px: { xs: 1, sm: 1.5 },
                    color: "error.main",
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                    borderColor: alpha(theme.palette.error.main, 0.18),
                    "& .MuiButton-startIcon": {
                      m: { xs: 0, sm: "0 8px 0 -4px" },
                    },
                    "&:hover": {
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                      borderColor: alpha(theme.palette.error.main, 0.34),
                    },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    Logout
                  </Box>
                </Button>
              </Box>
            </Tooltip>
          </Stack>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
