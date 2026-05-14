import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "./Button";

export default function BackButton({
  to,
  label = "Back",
  className = "",
  variant = "outline",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const canGoBack = useMemo(() => {
    if (to) return true;

    const idx = typeof window?.history?.state?.idx === "number" ? window.history.state.idx : 0;
    if (idx > 0) return true;

    try {
      const ref = document.referrer;
      if (!ref) return false;
      return new URL(ref).origin === window.location.origin;
    } catch {
      return false;
    }
  }, [to, location.key]);

  const goBack = useCallback(() => {
    if (to) return navigate(to);
    if (!canGoBack) return;
    navigate(-1);
  }, [to, canGoBack, navigate]);

  return (
    <Button
      variant={variant}
      onClick={goBack}
      icon={ArrowLeft}
      className={className}
      disabled={!canGoBack}
    >
      {label}
    </Button>
  );
}

BackButton.propTypes = {
  to: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(["primary", "secondary", "outline", "danger", "success", "warning"]),
};
