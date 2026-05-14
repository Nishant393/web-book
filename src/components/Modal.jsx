import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";

export default function Modal({ open, isOpen, onClose, title, children, footer, size = "md", maxBodyHeight = "74vh" }) {
  const shown = typeof isOpen === "boolean" ? isOpen : open;
  const maxWidth = useMemo(() => (["xs", "sm", "md", "lg", "xl"].includes(size) ? size : "md"), [size]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Dialog open={Boolean(shown)} onClose={(_, reason) => { if (reason !== "backdropClick") onClose?.(); }} fullWidth maxWidth={maxWidth} PaperProps={{ sx: { borderRadius: "6px", overflow: "hidden", border: "1px solid #e3e7ef", boxShadow: "0 18px 46px rgba(16,24,40,0.18)" } }} BackdropProps={{ sx: { bgcolor: "rgba(16,24,40,0.35)" } }}>
      <DialogTitle sx={{ py: 1.6, px: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e3e7ef" }}>
        <Typography sx={{ fontSize: 18, fontWeight: 500, color: "#111827" }} noWrap>{title}</Typography>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ borderRadius: 1 }}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, py: 2.25, maxHeight: maxBodyHeight, overflowY: "auto", bgcolor: "#fff" }}>
        <Box>{children}</Box>
      </DialogContent>
      {footer ? <DialogActions sx={{ px: 2.5, py: 1.6, borderTop: "1px solid #e3e7ef", bgcolor: "#fbfcff" }}>{footer}</DialogActions> : null}
    </Dialog>
  );
}

Modal.propTypes = { open: PropTypes.bool, isOpen: PropTypes.bool, onClose: PropTypes.func, title: PropTypes.node, children: PropTypes.node, footer: PropTypes.node, size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]), maxBodyHeight: PropTypes.string };
