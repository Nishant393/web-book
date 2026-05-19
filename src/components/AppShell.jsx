import React, { useMemo, useState } from "react";
import sanyojanLogo from "../assets/sanyojan_Motion.gif";
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Home,
  Landmark,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { HistoricalUiStyles } from "../styles/powerUi";
import Button from "./Button";

const SIDEBAR_W = 220;
const TOPBAR_H = 48;

const CRM_WEBSITE_URL = "https://dev.esmbackend.click/crm" || "";

const navSections = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Banking", path: "/banks", icon: Landmark },
  { label: "Items", path: "/items", icon: Package, addPath: "/items?create=1" },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      {
        label: "Customers",
        path: "/customers",
        addPath: "/customers?create=1",
        icon: Users,
      },
      {
        label: "Sales Orders",
        path: "/sales-orders",
        addPath: "/sales-orders/new",
        icon: FileText,
      },
      {
        label: "Invoices",
        path: "/invoices",
        addPath: "/invoices/new",
        icon: ReceiptText,
      },
      { label: "Download Receipt", path: "/download-receipt", icon: Download },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingBag,
    children: [
      {
        label: "Vendors",
        path: "/vendors",
        addPath: "/vendors?create=1",
        icon: Store,
      },
      {
        label: "Purchase Orders",
        path: "/purchase-orders",
        addPath: "/purchase-orders/new",
        icon: FileText,
      },
      {
        label: "Bills",
        path: "/bills",
        addPath: "/bills/new",
        icon: ReceiptText,
      },
      {
        label: "Expenses",
        path: "/expenses",
        addPath: "/expenses/new",
        icon: WalletCards,
      },
    ],
  },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Documents", path: "/documents", icon: FileText },
];

function getInitials(name = "") {
  return String(name || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MoneyIqLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Box
        component="img"
        src={sanyojanLogo}
        alt="Sanyojan Logo"
        sx={{ height: 38, maxWidth: 160, objectFit: "contain" }}
      />
    </Box>
  );
}

function isActive(pathname, path) {
  if (!path) return false;
  if (path === "/dashboard") return pathname === "/" || pathname === "/dashboard";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavRow({ item, nested = false, onNavigate }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = isActive(pathname, item.path);
  const Icon = item.icon || ChevronRight;

  const go = (path) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <ListItemButton
      onClick={() => item.path && go(item.path)}
      sx={{
        minHeight: nested ? 34 : 36,
        px: nested ? 1.4 : 1.25,
        pl: nested ? 5.6 : 1.25,
        borderRadius: "5px",
        color: active ? "#fff" : "#243047",
        bgcolor: active ? "#4088ff" : "transparent",
        "&:hover": { bgcolor: active ? "#3070e0" : "#e9edf8" },
        transition: "background-color 0.15s",
      }}
    >
      <Box
        sx={{
          width: 22,
          display: "grid",
          placeItems: "center",
          mr: 1,
          color: active ? "#fff" : "#5c6780",
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </Box>

      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          noWrap: true,
          color: active ? "#fff" : "inherit",
        }}
      />

      {item.addPath ? (
        <Tooltip title={`Add ${item.label.replace(/s$/, "")}`}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              go(item.addPath);
            }}
            sx={{
              width: 22,
              height: 22,
              color: active ? "rgba(255,255,255,0.85)" : "#4088ff",
              "&:hover": {
                bgcolor: active ? "rgba(255,255,255,0.18)" : "#dceaff",
              },
            }}
          >
            <Plus size={14} />
          </IconButton>
        </Tooltip>
      ) : null}
    </ListItemButton>
  );
}

function NavGroup({ section, onNavigate }) {
  const { pathname } = useLocation();
  const activeChild = section.children?.some((child) =>
    isActive(pathname, child.path)
  );
  const Icon = section.icon;

  if (!section.children) {
    return <NavRow item={section} onNavigate={onNavigate} />;
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minHeight: 34,
          px: 1.25,
          color: activeChild ? "#1a56db" : "#4b5872",
          bgcolor: activeChild ? "#eaf2ff" : "transparent",
          borderRadius: "5px",
        }}
      >
        <Icon size={16} strokeWidth={1.8} />

        <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
          {section.label}
        </Typography>

        <ChevronRight
          size={14}
          style={{
            transform: activeChild ? "rotate(90deg)" : "rotate(0deg)",
            transition: "120ms",
          }}
        />
      </Stack>

      <List sx={{ p: 0.3, display: "grid", gap: 0.25 }}>
        {section.children.map((child) => (
          <NavRow
            key={child.path}
            item={child}
            nested
            onNavigate={onNavigate}
          />
        ))}
      </List>
    </Box>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <List sx={{ p: 1, display: "grid", gap: 0.5 }}>
      {navSections.map((section) => (
        <NavGroup
          key={section.label}
          section={section}
          onNavigate={onNavigate}
        />
      ))}
    </List>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  const profileOpen = Boolean(profileAnchorEl);

  const orgName = useMemo(
    () =>
      user?.companyName ||
      user?.company?.name ||
      user?.name ||
      user?.email ||
      "Nishant Pawar",
    [user]
  );

  const displayName = useMemo(
    () => user?.name || user?.email || "User",
    [user]
  );

  const roleName = useMemo(
    () => user?.role || user?.roleName || user?.userRole || "Admin",
    [user]
  );

  const handleLogout = async () => {
    try {
      await logout?.();
    } catch {
      // intentionally ignored
    }

    [
      "crm_token",
      "crm_token",
      "token",
      "accessToken",
      "access_token",
      "loginData",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/login", { replace: true });
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleProfileOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleAccountSettings = () => {
    handleProfileClose();
    navigate("/account-settings");
  };

  const handleOpenCrm = () => {
    if (!CRM_WEBSITE_URL) return;

    window.open(CRM_WEBSITE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "#f7f8fb",
        overflow: "hidden",
      }}
    >
      <HistoricalUiStyles />

      {/* Top bar */}
      <Box
        sx={{
          height: TOPBAR_H,
          bgcolor: "#fff",
          color: "#000",
          display: "flex",
          alignItems: "center",
          borderBottom: "3px solid #4088ff",
          flexShrink: 0,
          position: "relative",
          zIndex: theme.zIndex.appBar,
        }}
      >
        {/* Logo section */}
        <Box
          sx={{
            width: isMobile ? "auto" : SIDEBAR_W,
            height: "100%",
            display: "flex",
            alignItems: "center",
            px: isMobile ? 1 : 2,
            borderRight: isMobile ? "none" : "1px solid rgba(0,0,0,0.06)",
            flexShrink: 0,
            gap: 1,
          }}
        >
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: "#4088ff", mr: 0.5 }}
            >
              <MenuRoundedIcon />
            </IconButton>
          )}

          <MoneyIqLogo />
        </Box>

        {/* Right side */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ flex: 1, px: 1.5, minWidth: 0 }}
        >
          <Box sx={{ flex: 1 }} />

          <Tooltip
            title={
              CRM_WEBSITE_URL
                ? "Open CRM Website"
                : "Set VITE_CRM_WEBSITE_URL in .env"
            }
          >
            <Box>
              <Button
                type="button"
                onClick={handleOpenCrm}
                disabled={!CRM_WEBSITE_URL}
                style={{
                  height: 32,
                  border: "1px solid #d7e2f3",
                  background: "#f7fbff",
                  color: CRM_WEBSITE_URL ? "#1f6ff2" : "#98a2b3",
                  borderRadius: 6,
                  padding: "0 10px",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: CRM_WEBSITE_URL ? "pointer" : "not-allowed",
                }}
              >
                CRM Website
                <ExternalLink size={14} />
              </Button>
            </Box>
          </Tooltip>

          <Box
            onClick={handleProfileOpen}
            sx={{
              height: 36,
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 0.75,
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 120ms",
              "&:hover": {
                bgcolor: "#f1f5ff",
              },
            }}
          >
            <Typography
              sx={{ fontSize: 13, color: "#000", maxWidth: 200 }}
              noWrap
            >
              {orgName}
            </Typography>

            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: "#4088ff",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {getInitials(displayName)}
            </Avatar>
          </Box>

          <Menu
            anchorEl={profileAnchorEl}
            open={profileOpen}
            onClose={handleProfileClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1,
                minWidth: 280,
                borderRadius: "8px",
                border: "1px solid #e3e7ef",
                boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
                overflow: "hidden",
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.6 }}>
              <Typography sx={{ fontSize: 16, color: "#111827" }}>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  Welcome,
                </Box>{" "}
                {displayName}
              </Typography>

              <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.4 }}>
                {roleName}
              </Typography>
            </Box>

            <Divider />

            <MenuItem
              onClick={handleAccountSettings}
              sx={{
                minHeight: 48,
                px: 2,
                gap: 1.5,
                fontSize: 14,
                color: "#243047",
              }}
            >
              <Settings size={18} strokeWidth={1.8} />
              Account Settings
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleProfileClose();
                handleLogout();
              }}
              sx={{
                minHeight: 48,
                px: 2,
                gap: 1.5,
                fontSize: 14,
                color: "#243047",
              }}
            >
              <LogOut size={18} strokeWidth={1.8} />
              Logout
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Body */}
      <Box
        sx={{
          display: "flex",
          height: `calc(100vh - ${TOPBAR_H}px)`,
          minHeight: 0,
        }}
      >
        {/* Desktop sidebar */}
        {!isMobile && (
          <Box
            component="aside"
            sx={{
              width: SIDEBAR_W,
              flexShrink: 0,
              bgcolor: "#f4f5fb",
              borderRight: "1px solid #dfe4ef",
              overflowY: "auto",
              overflowX: "hidden",
              py: 1,
            }}
          >
            <SidebarContent />
          </Box>
        )}

        {/* Mobile drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: { width: SIDEBAR_W, bgcolor: "#f4f5fb", pt: 1 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 1.5,
              pb: 1,
              borderBottom: "1px solid #dfe4ef",
            }}
          >
            <MoneyIqLogo />

            <IconButton
              size="small"
              onClick={closeDrawer}
              sx={{ color: "#667085" }}
            >
              <X size={18} />
            </IconButton>
          </Stack>

          <Box sx={{ overflowY: "auto", flex: 1 }}>
            <SidebarContent onNavigate={closeDrawer} />
          </Box>
        </Drawer>

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            bgcolor: "#fff",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}