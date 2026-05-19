import React, { useState } from "react";
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

/**
 * IFSC input with Razorpay verification.
 * - Validates on 11-char entry via https://ifsc.razorpay.com/:ifsc
 * - Calls onVerified(data) when valid, onVerified(null) when invalid/cleared
 * - Fires onChange(value) on every keystroke (uppercased, max 11 chars)
 */
export default function IFSCField({ value = "", onChange, onVerified, label = "IFSC", size = "small" }) {
  const [loading, setLoading]   = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError]       = useState("");
  const [detail, setDetail]     = useState(null);

  const reset = () => { setVerified(false); setError(""); setDetail(null); onVerified?.(null); };

  const lookup = async (code) => {
    setLoading(true);
    setError("");
    setDetail(null);
    setVerified(false);
    onVerified?.(null);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${code}`);
      if (!res.ok) {
        setError("Invalid IFSC code. Please check and try again.");
        return;
      }
      const data = await res.json();
      setDetail(data);
      setVerified(true);
      onVerified?.(data);
    } catch {
      setError("Failed to verify IFSC. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (raw) => {
    const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    onChange(upper);
    if (upper.length === 11) {
      lookup(upper);
    } else {
      reset();
    }
  };

  let endAdornment = null;
  if (loading) endAdornment = <CircularProgress size={16} sx={{ color: "#9ca3af" }} />;
  else if (verified) endAdornment = <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, color: "#16a34a" }} />;
  else if (error)    endAdornment = <ErrorOutlineRoundedIcon sx={{ fontSize: 18, color: "#dc2626" }} />;

  return (
    <Stack spacing={0.75}>
      <TextField
        fullWidth
        size={size}
        label={label}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. HDFC0002136"
        error={Boolean(error)}
        InputProps={{
          endAdornment,
          sx: { fontFamily: "monospace", letterSpacing: 1 },
        }}
        sx={{
          "& .MuiOutlinedInput-root": { height: 34, borderRadius: "5px", fontSize: 13 },
          "& .MuiInputLabel-root": { fontSize: 13 },
        }}
        inputProps={{ maxLength: 11, style: { textTransform: "uppercase" } }}
      />

      {error && (
        <Typography sx={{ fontSize: 12, color: "#dc2626" }}>{error}</Typography>
      )}

      {verified && detail && (
        <Paper
          variant="outlined"
          sx={{ p: 1.5, borderRadius: "8px", borderColor: "#86efac", bgcolor: "#f0fdf4" }}
        >
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: 10, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Bank</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{detail.BANK || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: 10, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Branch</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{detail.BRANCH || "-"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography sx={{ fontSize: 10, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>Address</Typography>
              <Typography sx={{ fontSize: 12, color: "#374151" }}>{detail.ADDRESS || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: 10, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>City / District</Typography>
              <Typography sx={{ fontSize: 12, color: "#374151" }}>{detail.CITY || detail.DISTRICT || "-"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: 10, color: "#667085", textTransform: "uppercase", fontWeight: 600 }}>State</Typography>
              <Typography sx={{ fontSize: 12, color: "#374151" }}>{detail.STATE || "-"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1.5} sx={{ mt: 0.25 }}>
                {["NEFT","RTGS","IMPS","UPI"].map((m) => (
                  <Box key={m} sx={{
                    fontSize: 10, fontWeight: 600, px: 0.75, py: 0.25, borderRadius: "4px",
                    bgcolor: detail[m] ? "#dcfce7" : "#f3f4f6",
                    color: detail[m] ? "#15803d" : "#9ca3af",
                  }}>
                    {m}
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Stack>
  );
}
