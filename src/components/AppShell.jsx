import React, { useMemo } from "react";
import sanyojanLogo from "../assets/sanyojan_Motion.gif";
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  Download,
  FileText,
  Home,
  Landmark,
  LogOut,
  Plus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { HistoricalUiStyles } from "../styles/powerUi";

const SIDEBAR_W = 220;
const TOPBAR_H = 48;

const navSections = [
  { label: "Home", path: "/dashboard", icon: Home },
  { label: "Banking", path: "/banks", icon: Landmark },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { label: "Customers", path: "/customers", addPath: "/customers?create=1", icon: Users },
      { label: "Sales Orders", path: "/sales-orders", addPath: "/sales-orders/new", icon: FileText },
      { label: "Invoices", path: "/invoices", addPath: "/invoices/new", icon: ReceiptText },
      { label: "Download Receipt", path: "/download-receipt", icon: Download },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingBag,
    children: [
      { label: "Vendors", path: "/vendors", addPath: "/vendors?create=1", icon: Store },
      { label: "Purchase Orders", path: "/purchase-orders", addPath: "/purchase-orders/new", icon: FileText },
      { label: "Bills", path: "/bills", addPath: "/bills/new", icon: ReceiptText },
      { label: "Expenses", path: "/expenses", addPath: "/expenses/new", icon: WalletCards },
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

function NavRow({ item, nested = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = isActive(pathname, item.path);
  const Icon = item.icon || ChevronRight;

  return (
    <ListItemButton
      onClick={() => item.path && navigate(item.path)}
      sx={{
        minHeight: nested ? 34 : 36,
        px: nested ? 1.4 : 1.25,
        pl: nested ? 5.6 : 1.25,
        borderRadius: "5px",
        color: active ? "#000" : "#243047",
        bgcolor: active ? "#4088ff" : "transparent",
        "&:hover": { bgcolor: active ? "#4088ff" : "#e9edf8" },
      }}
    >
      <Box
        sx={{
          width: 22,
          display: "grid",
          placeItems: "center",
          mr: 1,
          color: active ? "#000" : "#5c6780",
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </Box>

      <ListItemText
        primary={item.label}
        primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 500 : 400, noWrap: true }}
      />

      {item.addPath ? (
        <Tooltip title={`Add ${item.label.replace(/s$/, "")}`}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(item.addPath);
            }}
            sx={{
              width: 22,
              height: 22,
              color: active ? "#000" : "#4088ff",
              "&:hover": { bgcolor: active ? "rgba(255,255,255,0.14)" : "#dceaff" },
            }}
          >
            <Plus size={14} />
          </IconButton>
        </Tooltip>
      ) : null}
    </ListItemButton>
  );
}

function NavGroup({ section }) {
  const { pathname } = useLocation();
  const activeChild = section.children?.some((child) => isActive(pathname, child.path));
  const Icon = section.icon;

  if (!section.children) return <NavRow item={section} />;

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          minHeight: 34,
          px: 1.25,
          color: activeChild ? "#243047" : "#4b5872",
          bgcolor: activeChild ? "#e9edf8" : "transparent",
          borderRadius: "5px",
        }}
      >
        <Icon size={16} strokeWidth={1.8} />
        <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1, }}>{section.label}</Typography>
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
          <NavRow key={child.path} item={child} nested />
        ))}
      </List>
    </Box>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const orgName = useMemo(
    () => user?.companyName || user?.company?.name || user?.name || user?.email || "Nishant Pawar",
    [user]
  );

  const displayName = useMemo(() => user?.name || user?.email || "User", [user]);

  const handleLogout = async () => {
    try {
      await logout?.();
    } catch {
      // Fallback cleanup below.
    }

    ["book_token", "token", "accessToken", "access_token", "loginData"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    navigate("/login", { replace: true });
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

      <Box
        sx={{
          height: TOPBAR_H,
          bgcolor: "#fff",
          color: "#000",
          display: "flex",
          alignItems: "center",
          borderBottom: "3px solid #4088ff",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: SIDEBAR_W,
            height: "100%",
            display: "flex",
            alignItems: "center",
            px: 2,
            borderRight: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <MoneyIqLogo />
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1, px: 1.5, minWidth: 0 }}>
          <Box sx={{ flex: 1 }} />

          <Typography sx={{ fontSize: 13, color: "#000", maxWidth: 220 }} noWrap>
            {orgName}
          </Typography>

          <Avatar sx={{ width: 30, height: 30, bgcolor: "#4088ff", fontSize: 12, fontWeight: 600 }}>
            {getInitials(displayName)}
          </Avatar>

          <Tooltip title="Logout">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{
                color: "#ff7777",
                "&:hover": { bgcolor: "rgba(255,119,119,0.12)" },
              }}
            >
              <LogOut size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          height: `calc(100vh - ${TOPBAR_H}px)`,
          minHeight: 0,
        }}
      >
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
          <List sx={{ p: 1, display: "grid", gap: 0.5 }}>
            {navSections.map((section) => (
              <NavGroup key={section.label} section={section} />
            ))}
          </List>

        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            bgcolor: "#000",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
