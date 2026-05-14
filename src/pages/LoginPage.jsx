import React, { useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  GlobalStyles,
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Container
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import authAxios from "../api/authAxios";
import { useAuth } from "../auth/AuthProvider";

import { HistoricalUiStyles } from "../styles/powerUi";
import Button from "../components/Button";
import BrandLogo from "../components/BrandLogo";

const RESPONSIVE_PAGE_STYLES = {
  "@media (max-width: 900px)": {
    "html, body, #root": { height: "100%", overflow: "hidden" },
    "body": { overflowX: "hidden" },
    ".MuiDialog-paper": {
      width: "calc(100% - 20px) !important",
      maxWidth: "calc(100% - 20px) !important",
      margin: "10px !important",
      borderRadius: "18px !important",
    },
    ".MuiDialogContent-root": { padding: "14px !important" },
    ".MuiDrawer-paper": {
      width: "92vw !important",
      maxWidth: "430px !important",
    },
    ".MuiTableContainer-root": {
      maxWidth: "100%",
      overflowX: "auto !important",
      WebkitOverflowScrolling: "touch",
      borderRadius: "16px !important",
    },
    ".MuiTable-root": { minWidth: "760px" },
    ".MuiTableCell-root": {
      whiteSpace: "nowrap",
      padding: "9px 10px",
      fontSize: "12px",
    },
    ".MuiTabs-root": { maxWidth: "100%" },
    ".MuiTabs-scroller": { overflowX: "auto !important" },
    ".MuiTab-root": { minWidth: "max-content !important" },
    ".MuiTextField-root, .MuiFormControl-root": { maxWidth: "100%" },
    ".MuiButton-root": { minHeight: "38px" },
    ".MuiChip-root": { maxWidth: "100%" },
    ".MuiTypography-h4": {
      fontSize: "1.35rem !important",
      lineHeight: "1.18 !important",
    },
    ".MuiTypography-h5": {
      fontSize: "1.15rem !important",
      lineHeight: "1.2 !important",
    },
    ".MuiTypography-h6": {
      fontSize: "1rem !important",
      lineHeight: "1.25 !important",
    },
  },
  "@media (max-width: 600px)": {
    ".MuiPaper-root": { borderRadius: "16px !important" },
    ".MuiCard-root": { borderRadius: "16px !important" },
    ".MuiInputBase-input": { fontSize: "14px !important" },
    ".MuiButton-root": { width: "auto", maxWidth: "100%" },
    ".MuiTable-root": { minWidth: "680px" },
  },
};


export default function LoginPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();

  // view: "login" | "forgot" | "reset"
  const [view, setView] = useState("login");

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Forgot / Reset Password State
  const [fpEmail, setFpEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // App State
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setError("");
    setInfo("");
  };

  const goToLogin = () => {
    setView("login");
    clearMessages();
  };

  const goToForgot = () => {
    setView("forgot");
    clearMessages();
    setFpEmail(email || ""); // helpful auto-fill
  };

  // -------------------------------------------------------------------
  // ✅ Login Logic
  // -------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email || !password) {
      toast("Please fill all fields to continue.", { icon: "ℹ️" });
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const res = await authAxios.post("/auth/login", { email, password });

      const token = res?.data?.accessToken || res?.data?.token;
      if (!token) {
        setError("Server did not send an access token.");
        return;
      }

      const userData = res?.data?.userData || res?.data?.user || {};

      login({ user: userData, token });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed.";
      setError(msg);
      toast.error(`Login Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // ✅ Forgot Password Logic
  // -------------------------------------------------------------------
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (loading) return;

    clearMessages();
    setLoading(true);

    try {
      // 👇 Adjust endpoint to match your actual backend API route
      await authAxios.post("/auth/forgot-password", { email: fpEmail });
      
      setInfo("Reset code sent. Check your email / SMS.");
      setView("reset");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send reset code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // ✅ Reset Password Logic
  // -------------------------------------------------------------------
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (loading) return;

    clearMessages();

    if (!resetCode.trim()) {
      setError("Please enter reset code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      // 👇 Adjust endpoint & payload to match your actual backend API route
      await authAxios.post("/auth/reset-password", { 
        code: resetCode.trim(), 
        newPassword 
      });

      setInfo("Password reset successful. Please login with your new password.");
      
      // Clear reset fields
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setFpEmail("");
      
      // Go back to login
      setView("login");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reset password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // UI Setup Helpers
  const renderHeader = () => {
    let title = "CRM Login";
    let subtitle = "Sign in to manage your workspace";

    if (view === "forgot") {
      title = "Forgot Password";
      subtitle = "Enter your email to receive a reset code";
    } else if (view === "reset") {
      title = "Reset Password";
      subtitle = "Enter reset code and set a new password";
    }

    return (
      <Box textAlign="center">
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <BrandLogo />
        </Box>

        <Typography
          variant="h5"
          fontWeight={900}
          sx={{ color: theme.palette.primary.main }}
        >
          {title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        px: { xs: 1.25, sm: 2 },
        py: { xs: 1.25, sm: 2 },
        bgcolor: "#EEF3F8"
      }}
    >
      <HistoricalUiStyles />
      <GlobalStyles styles={RESPONSIVE_PAGE_STYLES} />
      <Container maxWidth="xs" sx={{ maxHeight: "100%", overflowY: "auto", py: { xs: 0.75, sm: 1 } }}>
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            bgcolor: "#FFFFFF",
            border: `1px solid ${
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.10)"
            }`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 18px 60px rgba(0,0,0,0.55)"
                : "0 12px 40px rgba(0,0,0,0.12)"
          }}
        >
          {renderHeader()}

          {/* Messages */}
          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="info" icon={<KeyRound size={20} />} sx={{ mt: 2, borderRadius: 2 }}>
              {info}
            </Alert>
          )}

          {/* -------- LOGIN VIEW -------- */}
          {view === "login" && (
            <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                margin="normal"
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                label="Password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                margin="normal"
                disabled={loading}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPass((s) => !s)}
                        edge="end"
                        disabled={loading}
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Typography 
                  variant="body2" 
                  color="primary" 
                  sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                  onClick={goToForgot}
                >
                  Forgot password?
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="primary"
                disabled={loading}
                sx={{
                  mt: 3,
                  borderRadius: 2,
                  fontWeight: 800,
                  py: 1.25,
                  textTransform: "none"
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
              </Button>
            </Box>
          )}

          {/* -------- FORGOT VIEW -------- */}
          {view === "forgot" && (
            <Box component="form" onSubmit={handleForgotPassword} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                autoComplete="email"
                margin="normal"
                disabled={loading}
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="primary"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 1.5,
                  borderRadius: 2,
                  fontWeight: 800,
                  py: 1.25,
                  textTransform: "none"
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Send Reset Code"}
              </Button>

              <Button
                type="button"
                fullWidth
                variant="outline"
                disabled={loading}
                onClick={goToLogin}
                startIcon={<ArrowLeft size={18} />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  py: 1.25,
                  textTransform: "none",
                  borderColor: 'divider',
                }}
              >
                Back to Login
              </Button>
            </Box>
          )}

          {/* -------- RESET VIEW -------- */}
          {view === "reset" && (
            <Box component="form" onSubmit={handleResetPassword} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Reset Code"
                type="text"
                inputMode="numeric"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="e.g. 4730"
                margin="normal"
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                margin="normal"
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                margin="normal"
                disabled={loading}
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="primary"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  borderRadius: 2,
                  fontWeight: 800,
                  py: 1.25,
                  textTransform: "none"
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
              </Button>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    setView("forgot");
                    clearMessages();
                  }}
                  sx={{ borderRadius: 2, fontWeight: 700, py: 1, textTransform: "none" }}
                >
                  Resend Code
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={goToLogin}
                  sx={{ borderRadius: 2, fontWeight: 700, py: 1, textTransform: "none" }}
                >
                  Login
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        <Typography
          variant="caption"
          display="block"
          align="center"
          sx={{ mt: 3 }}
          color="text.disabled"
        >
          &copy; CRM System {new Date().getFullYear()}
        </Typography>
      </Container>
    </Box>
  );
}