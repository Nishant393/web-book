import React from "react";
import { AlertTriangle } from "lucide-react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import Button from "./Button";

export default function ConfirmationDialog({
  open,
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  const isDanger = tone === "danger";
  return (
    <Dialog open={Boolean(open)} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2, boxShadow: "0 18px 46px rgba(16,24,40,0.22)" } }}>
      <DialogTitle sx={{ px: 2.5, py: 2, borderBottom: "1px solid #e5e7ef" }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: isDanger ? "#fff0f0" : "#eaf2ff", color: isDanger ? "#ef4444" : "#4088ff" }}>
            <AlertTriangle size={18} />
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 500 }}>{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Typography sx={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.55 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: "1px solid #e5e7ef" }}>
        <Button variant="outline" onClick={onClose} disabled={loading}>{cancelText}</Button>
        <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm} disabled={loading}>{loading ? "Please wait..." : confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
