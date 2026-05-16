import React, { useState } from "react";
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export const PAGE_SX = {
  width: "100%",
  minHeight: "100%",
  bgcolor: "#fff",
};

export const PAGE_SCROLL_SX = {
  width: "100%",
  minHeight: "100%",
  bgcolor: "#fff",
};

export const PAGE_PAD_SX = {
  p: { xs: 1.5, md: 2 },
  bgcolor: "#fff",
};

export const CARD_SX = {
  border: "1px solid #e3e7ef",
  borderRadius: "6px",
  bgcolor: "#fff",
  boxShadow: "none",
};

export const getId = (row) =>
  row?._id || row?.id || row?.customerId || row?.vendorId || row?.orderId || "";

export const pickData = (v) => v?.data || v?.result || v || {};

export const safeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.rows)) return v.rows;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.docs)) return v.docs;
  if (v.data && v.data !== v) return safeArray(v.data);
  if (v.result && v.result !== v) return safeArray(v.result);
  return [];
};

export const money = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

export const dateText = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN");
};

export const clamp = (v, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number(v || 0)));

export function Label({ children, required = false }) {
  return (
    <Typography
      sx={{
        fontSize: 13,
        color: required ? "#ef4444" : "#111827",
        lineHeight: 1.3,
      }}
    >
      {children}
      {required ? "*" : ""}
    </Typography>
  );
}

export function PageBar({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        height: 58,
        px: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e3e7ef",
        bgcolor: "#fff",
        flexShrink: 0,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 500, color: "#111827" }} noWrap>
          {title}
        </Typography>

        {subtitle ? (
          <Typography sx={{ fontSize: 12.5, color: "#667085", mt: 0.15 }} noWrap>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
        {children}
      </Stack>
    </Box>
  );
}

export function Card({ title, action, children, sx, bodySx }) {
  return (
    <Paper elevation={0} sx={{ ...CARD_SX, overflow: "hidden", ...sx }}>
      {title || action ? (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: 2,
            py: 1.2,
            borderBottom: "1px solid #e3e7ef",
            bgcolor: "#fbfcff",
          }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>
            {title}
          </Typography>
          {action}
        </Stack>
      ) : null}

      <Box sx={{ p: 2, ...bodySx }}>{children}</Box>
    </Paper>
  );
}

export function ZohoStat({ label, value, accent = "#4088ff", hint }) {
  return (
    <Paper elevation={0} sx={{ ...CARD_SX, p: 1.75, height: "100%" }}>
      <Typography sx={{ fontSize: 12, color: "#68738a" }}>{label}</Typography>
      <Typography sx={{ fontSize: 19, fontWeight: 500, color: "#111827", mt: 0.5 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.7 }}>
        {hint || "\u00A0"}
      </Typography>
      <Box sx={{ height: 3, width: 54, borderRadius: 99, bgcolor: accent, mt: 0.9 }} />
    </Paper>
  );
}

export function InfoRow({ label, value, action }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.65 }}>
      <Typography sx={{ width: 132, fontSize: 13, color: "#667085", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography sx={{ flex: 1, fontSize: 13, color: "#111827", wordBreak: "break-word" }}>
        {value || "-"}
      </Typography>
      {action}
    </Stack>
  );
}

export function SectionTitle({ title, action }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mt: 1.4, mb: 0.6, borderBottom: "1px solid #e8ecf3", pb: 0.7 }}
    >
      <Typography sx={{ fontSize: 13.5, color: "#111827", fontWeight: 500, textTransform: "uppercase" }}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}

export function ProgressMoney({ total, paid, paidLabel = "Paid", remainingLabel = "Remaining" }) {
  const pct = total > 0 ? clamp((paid / total) * 100) : 0;
  const remaining = total - paid;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 12, color: "#667085" }}>
          {paidLabel}: <b>{money(paid)}</b>
        </Typography>

        <Typography sx={{ fontSize: 12, color: "#667085" }}>
          {remainingLabel}: <b>{money(remaining)}</b>
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: "#edf1f7",
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            bgcolor: pct >= 100 ? "#18b779" : "#4088ff",
          },
        }}
      />

      <Typography sx={{ fontSize: 12, color: "#667085", mt: 0.75 }}>
        {pct.toFixed(0)}% completed
      </Typography>
    </Box>
  );
}

export function MiniMonthBars({ data = [], orderKey = "orders", payKey = "payments" }) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [Number(d[orderKey] || 0), Number(d[payKey] || 0)])
  );

  return (
    <Stack direction="row" spacing={1.2} alignItems="flex-end" sx={{ height: 170, px: 1, pt: 1 }}>
      {data.map((d) => (
        <Stack key={d.key || d.month} spacing={0.6} alignItems="center" sx={{ flex: 1, minWidth: 34 }}>
          <Stack direction="row" spacing={0.35} alignItems="flex-end" sx={{ height: 120 }}>
            <Box
              sx={{
                width: 8,
                height: `${Math.max(2, (Number(d[orderKey] || 0) / max) * 110)}px`,
                bgcolor: "#4088ff",
                borderRadius: "4px 4px 0 0",
              }}
            />
            <Box
              sx={{
                width: 8,
                height: `${Math.max(2, (Number(d[payKey] || 0) / max) * 110)}px`,
                bgcolor: "#18b779",
                borderRadius: "4px 4px 0 0",
              }}
            />
          </Stack>

          <Typography sx={{ fontSize: 10, color: "#667085" }}>{d.month}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function ModalSection({ title, subtitle, children }) {
  return (
    <Stack spacing={1.2}>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 12.5, color: "#667085", mt: 0.2 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {children}
    </Stack>
  );
}

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  rows = 1,
  required = false,
  disabled = false,
  placeholder,
  sx,
}) {
  return (
    <TextField
      fullWidth
      size="small"
      type={type}
      label={label}
      value={value ?? ""}
      required={required}
      disabled={disabled}
      multiline={multiline}
      minRows={rows}
      placeholder={placeholder}
      InputLabelProps={type === "date" ? { shrink: true } : undefined}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        "& .MuiInputBase-input": { fontSize: 13 },
        "& .MuiInputLabel-root": { fontSize: 13 },
        ...sx,
      }}
    />
  );
}

export function makeLastMonths(count = 11) {
  const now = new Date();

  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      month: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      orders: 0,
      payments: 0,
      income: 0,
      balance: 0,
    };
  });
}

export function statusChip(label, tone = "gray") {
  const color =
    tone === "green"
      ? "success"
      : tone === "red"
        ? "error"
        : tone === "amber"
          ? "warning"
          : "default";

  return <Chip size="small" variant="outlined" color={color} label={label} />;
}
export function SimpleLineChart({
  data = [],
  greenKey = "balance",
  grayKey = "cash",
  greenLabel = "Bank Balance",
  grayLabel = "Cash In Hand",
  height = 320,
}) {
  const [hovered, setHovered] = useState(null);

  const width = 1000;
  const padding = { top: 28, right: 28, bottom: 42, left: 58 };

  const formatMoney = (value) => {
    const n = Number(value || 0);

    return n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const values = data.flatMap((d) => [
    Number(d[greenKey] || 0),
    Number(d[grayKey] || 0),
  ]);

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const x = (index) => {
    if (data.length <= 1) return padding.left;

    return (
      padding.left +
      (index * (width - padding.left - padding.right)) / (data.length - 1)
    );
  };

  const y = (value) => {
    return (
      padding.top +
      ((max - Number(value || 0)) * (height - padding.top - padding.bottom)) /
        range
    );
  };

  const buildPath = (key) =>
    data
      .map((d, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(d[key])}`)
      .join(" ");

  const ticks = 5;

  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const value = max - (i * range) / (ticks - 1);

    return {
      value,
      y: y(value),
    };
  });

  const hoveredData =
    hovered && data[hovered.index] ? data[hovered.index] : null;

  const hoverX = hoveredData ? x(hovered.index) : 0;
  const hoverGrayY = hoveredData ? y(hoveredData[grayKey]) : 0;
  const hoverGreenY = hoveredData ? y(hoveredData[greenKey]) : 0;

  const tooltipLeft = hoveredData
    ? Math.min(92, Math.max(8, (hoverX / width) * 100))
    : 0;

  const tooltipTop = hoveredData
    ? Math.min(
        82,
        Math.max(6, (Math.min(hoverGrayY, hoverGreenY) / height) * 100 - 16)
      )
    : 0;

  return (
    <Box
      sx={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
        pt: 1,
      }}
      onMouseLeave={() => setHovered(null)}
    >
      {hoveredData ? (
        <Box
          sx={{
            position: "absolute",
            left: `${tooltipLeft}%`,
            top: `${tooltipTop}%`,
            transform: "translate(-50%, -100%)",
            zIndex: 5,
            minWidth: 170,
            borderRadius: "8px",
            border: "1px solid #e3e7ef",
            bgcolor: "#fff",
            boxShadow: "0 10px 28px rgba(15,23,42,0.16)",
            px: 1.4,
            py: 1.1,
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              fontSize: 12,
              color: "#667085",
              mb: 0.8,
              fontWeight: 600,
            }}
          >
            {hoveredData.label || hoveredData.key || "-"}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                bgcolor: "#9aa1b5",
              }}
            />
            <Box sx={{ fontSize: 12, color: "#667085", flex: 1 }}>
              {grayLabel}
            </Box>
          </Box>

          <Box
            sx={{
              fontSize: 14,
              color: "#111827",
              fontWeight: 700,
              mb: 0.8,
              pl: 2,
            }}
          >
            {formatMoney(hoveredData[grayKey])}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "2px",
                bgcolor: "#18b779",
              }}
            />
            <Box sx={{ fontSize: 12, color: "#667085", flex: 1 }}>
              {greenLabel}
            </Box>
          </Box>

          <Box
            sx={{
              fontSize: 14,
              color: "#111827",
              fontWeight: 700,
              pl: 2,
            }}
          >
            {formatMoney(hoveredData[greenKey])}
          </Box>
        </Box>
      ) : null}

      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        sx={{
          width: "100%",
          minWidth: 0,
          height,
          display: "block",
          bgcolor: "#fff",
        }}
      >
        {yTicks.map((tick, index) => (
          <g key={index}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#edf0f6"
              strokeWidth="1"
            />

            <text
              x={padding.left - 12}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#667085"
            >
              {Math.round(tick.value).toLocaleString("en-IN")}
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#d7dce8"
        />

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#d7dce8"
        />

        <path
          d={buildPath(grayKey)}
          fill="none"
          stroke="#9aa1b5"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={buildPath(greenKey)}
          fill="none"
          stroke="#18b779"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hoveredData ? (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            <circle
              cx={hoverX}
              cy={hoverGrayY}
              r="4.5"
              fill="#fff"
              stroke="#9aa1b5"
              strokeWidth="2"
            />

            <circle
              cx={hoverX}
              cy={hoverGreenY}
              r="4.5"
              fill="#fff"
              stroke="#18b779"
              strokeWidth="2"
            />
          </>
        ) : null}

        {data.map((d, index) => {
          if (index % 3 !== 0 && index !== data.length - 1) return null;

          return (
            <text
              key={d.key || index}
              x={x(index)}
              y={height - 14}
              textAnchor="middle"
              fontSize="10"
              fill="#667085"
            >
              {d.label}
            </text>
          );
        })}

        <g transform={`translate(${padding.left}, ${height - 4})`}>
          <rect width="8" height="8" rx="2" fill="#9aa1b5" />
          <text x="14" y="8" fontSize="12" fill="#111827">
            {grayLabel}
          </text>

          <rect x="115" width="8" height="8" rx="2" fill="#18b779" />
          <text x="129" y="8" fontSize="12" fill="#111827">
            {greenLabel}
          </text>
        </g>

        {data.map((d, index) => {
          const currentX = x(index);

          const left =
            index === 0 ? padding.left : (x(index - 1) + currentX) / 2;

          const right =
            index === data.length - 1
              ? width - padding.right
              : (currentX + x(index + 1)) / 2;

          return (
            <rect
              key={`hover-${d.key || index}`}
              x={left}
              y={padding.top}
              width={Math.max(1, right - left)}
              height={height - padding.top - padding.bottom}
              fill="transparent"
              onMouseEnter={() => setHovered({ index })}
              onMouseMove={() => setHovered({ index })}
            />
          );
        })}
      </Box>
    </Box>
  );
}