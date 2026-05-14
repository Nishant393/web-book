import React, { useMemo, useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, X, ChevronLeft } from "lucide-react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useMediaQuery,
  Button as MuiButton,
  Tooltip,
  Toolbar,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import Footer from "./Footer";
import logoSrc from "../assets/Sanyogan Logo Giff.gif";
import collapsedLogoSrc from "../assets/collapsed-menu-logo.gif";

const drawerWidth = 260;
const drawerCollapsedWidth = 84;
const SIDEBAR_COLLAPSE_KEY = "crmSidebarCollapsed";
const APPBAR_H = { xs: 56, sm: 64 };

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, end: true },
];

export default function SidebarLayout({ topbar, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const navigate = useNavigate();
  const location = useLocation();
  const mainScrollRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return String(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) || "") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const element = mainScrollRef.current;
    if (!element) return;
    element.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((previous) => !previous);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const paperBg = theme.palette.background.paper;
  const activePillBg = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.12);
  const activeBar = theme.palette.primary.main;
  const itemHoverBg = theme.palette.mode === "dark" ? alpha("#fff", 0.05) : alpha("#000", 0.04);

  const SidebarContent = ({ onClose }) => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: paperBg }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 1 : 2,
          pt: 2,
          pb: 1,
          gap: 1,
        }}
      >
        <Box
          component="img"
          src={collapsed ? collapsedLogoSrc : logoSrc}
          alt="Logo"
          onClick={() => navigate("/dashboard")}
          sx={{
            height: collapsed ? 50 : 84,
            width: "auto",
            maxWidth: collapsed ? 54 : 210,
            objectFit: "contain",
            cursor: "pointer",
          }}
        />

        <IconButton onClick={onClose} sx={{ display: { lg: "none" } }} aria-label="Close sidebar">
          <X size={20} />
        </IconButton>
      </Box>

      <Box sx={{ px: collapsed ? 1 : 2, pb: 1 }}>
        <MuiButton
          fullWidth
          variant="outlined"
          onClick={() => {
            if (isDesktop) toggleCollapsed();
            else onClose?.();
          }}
          startIcon={<ChevronLeft size={18} />}
          sx={{
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
            color: "text.primary",
            borderColor: "divider",
            bgcolor: "transparent",
          }}
        >
          {!collapsed ? "Collapse Menu" : ""}
        </MuiButton>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: "auto", px: collapsed ? 1 : 1.5, py: 1.5 }}>
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const button = (
              <ListItemButton
                key={item.name}
                component={NavLink}
                to={item.path}
                end={!!item.end}
                onClick={onClose}
                sx={{
                  position: "relative",
                  borderRadius: 2,
                  px: collapsed ? 1.25 : 1.5,
                  py: 1.2,
                  gap: 1.25,
                  color: "text.primary",
                  "&:hover": { bgcolor: itemHoverBg },
                  "&.active": {
                    bgcolor: activePillBg,
                    color: "primary.main",
                    fontWeight: 900,
                  },
                  "&.active::before": {
                    content: '\"\"',
                    position: "absolute",
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: activeBar,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 36 : 38,
                    color: "inherit",
                    opacity: 0.95,
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} />
                </ListItemIcon>

                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.2 }}>
                        {item.name}
                      </Typography>
                    }
                  />
                )}
              </ListItemButton>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name} title={item.name} placement="right">
                  <Box>{button}</Box>
                </Tooltip>
              );
            }

            return button;
          })}
        </List>
      </Box>

      <Divider />

      <Box sx={{ px: collapsed ? 1 : 2, py: 1.5 }}>
        {!collapsed ? (
          <Typography
            variant="body2"
            component="a"
            href={import.meta.env.VITE_APP_VERSION_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: "none",
              color: "text.primary",
              fontWeight: 600,
              "&:hover": { color: "primary.main" },
            }}
          >
            {import.meta.env.VITE_APP_VERSION || "v0.1.1"}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );

  SidebarContent.propTypes = {
    onClose: PropTypes.func,
  };

  const effectiveDrawerWidth = isDesktop ? (collapsed ? drawerCollapsedWidth : drawerWidth) : drawerWidth;

  const topbarEl = React.isValidElement(topbar)
    ? React.cloneElement(topbar, { onMenuClick: toggleMobile })
    : topbar;

  return (
    <Box sx={{ height: "100vh", display: "flex", bgcolor: "background.default" }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: effectiveDrawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: effectiveDrawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          <SidebarContent onClose={() => {}} />
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: Math.min(drawerWidth, 320), boxSizing: "border-box" } }}
        >
          <SidebarContent onClose={closeMobile} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {topbar ? (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: { xs: 0, lg: `${effectiveDrawerWidth}px` },
              width: { xs: "100%", lg: `calc(100% - ${effectiveDrawerWidth}px)` },
              zIndex: (t) => t.zIndex.appBar,
              bgcolor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Toolbar sx={{ minHeight: APPBAR_H, px: 2 }}>{topbarEl}</Toolbar>
          </Box>
        ) : null}

        <Toolbar sx={{ minHeight: APPBAR_H }} />

        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: "0 0 auto" }}>{children}</Box>
            <Box sx={{ mt: "auto" }}>
              <Footer />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

SidebarLayout.propTypes = {
  topbar: PropTypes.node,
  children: PropTypes.node,
};
