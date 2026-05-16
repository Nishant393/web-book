import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowLeft, FileText, Mail, Paperclip, Send } from "lucide-react";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import ZohoPage from "../components/ZohoPage";
import { HistoricalUiStyles } from "../styles/powerUi";
import {
  billApi,
  invoiceApi,
  purchaseOrderApi,
  salesOrderApi,
  sendMediaApi,
} from "../api/customerVendorApi";
import { money } from "./businessUtils.jsx";

const DOC_CONFIG = {
  "sales-order": {
    title: "SALES ORDER",
    label: "Sales Order",
    api: salesOrderApi,
    recordKey: "order",
    listPath: "/sales-orders",
    partyKey: "customerId",
    filePrefix: "Sales-Order",
  },
  "purchase-order": {
    title: "PURCHASE ORDER",
    label: "Purchase Order",
    api: purchaseOrderApi,
    recordKey: "order",
    listPath: "/purchase-orders",
    partyKey: "vendorId",
    filePrefix: "Purchase-Order",
  },
  invoice: {
    title: "TAX INVOICE",
    label: "Invoice",
    api: invoiceApi,
    recordKey: "invoice",
    listPath: "/invoices",
    partyKey: "customerId",
    filePrefix: "Invoice",
  },
  bill: {
    title: "BILL",
    label: "Bill",
    api: billApi,
    recordKey: "bill",
    listPath: "/bills",
    partyKey: "vendorId",
    filePrefix: "Bill",
  },
};

const clean = (value) => String(value ?? "").trim();

const pickData = (value) => value?.data || value?.result || value || {};

const getId = (row) => row?._id || row?.id || "";

const getCacheKey = (type, id) => `moneyiq_send_${type}_${id}`;

const toNumber = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const inrText = (value) => {
  const n = Number(value || 0);

  return `INR ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const partyNameOf = (party, fallback = "") => {
  if (!party || typeof party !== "object") return fallback || "-";

  return (
    party.customerName ||
    party.vendorName ||
    party.displayName ||
    party.companyName ||
    party.name ||
    fallback ||
    "-"
  );
};

const partyEmailOf = (party) => {
  if (!party || typeof party !== "object") return "";

  return clean(party.email || party.emailId || party.mail || "");
};

const getPartyFromDocument = (doc, cfg, cacheData) => {
  if (cacheData?.selectedParty) return cacheData.selectedParty;

  const party = doc?.[cfg.partyKey];

  if (party && typeof party === "object") return party;

  return {};
};

const getDocumentDate = (doc, type, cacheData) => {
  const payload = cacheData?.formPayload || {};

  if (payload.date) return payload.date;
  if (type === "invoice") return doc?.invoiceDate;
  if (type === "bill") return doc?.billDate;

  return doc?.orderDate || doc?.date;
};

const getDueOrShipmentDate = (doc, type, cacheData) => {
  const payload = cacheData?.formPayload || {};

  if (type === "invoice" || type === "bill") {
    return payload.due || doc?.dueDate;
  }

  return payload.shipment || doc?.expectedShipmentDate;
};

const normalizeItems = (cacheData, doc) => {
  const payloadItems = cacheData?.items || cacheData?.formPayload?.items;

  if (Array.isArray(payloadItems) && payloadItems.length) {
    return payloadItems;
  }

  if (Array.isArray(doc?.items)) {
    return doc.items;
  }

  return [];
};

const buildEmailBody = ({ cfg, partyName, date, totalAmount }) => {
  return `Dear ${partyName || "Customer/Vendor"},

Please find attached the ${cfg.label} for your reference.

Document Amount: ${inrText(totalAmount)}
Document Date: ${formatDate(date)}

Regards,
MoneyIQ-AI
By ESM`;
};

const pdfEscape = (value) =>
  String(value ?? "")
    .replace(/[₹]/g, "INR")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapText = (text, maxLength = 90) => {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);

  return lines.length ? lines : [""];
};

const makePdfBlob = ({ cfg, document, cacheData, partyName, partyEmail }) => {
  const payload = cacheData?.formPayload || {};
  const items = normalizeItems(cacheData, document);

  const documentDate = getDocumentDate(document, cacheData?.mode, cacheData);
  const secondaryDate = getDueOrShipmentDate(
    document,
    cacheData?.mode,
    cacheData
  );

  const baseAmount = toNumber(
    payload.baseAmount ??
      payload.subTotal ??
      document.amount ??
      document.baseAmount ??
      0
  );

  const discountAmount = toNumber(
    payload.discountAmount ?? document.discountAmount ?? 0
  );

  const gstAmount = toNumber(payload.gstAmount ?? document.gstAmount ?? 0);
  const tdsAmount = toNumber(payload.tdsAmount ?? document.tdsAmount ?? 0);
  const tcsAmount = toNumber(payload.tcsAmount ?? document.tcsAmount ?? 0);

  const adjustmentAmount = toNumber(
    payload.adjustmentAmount ?? document.adjustmentAmount ?? 0
  );

  const totalAmount = toNumber(
    payload.totalAmount ?? document.totalAmount ?? document.amount ?? 0
  );

  const lines = [];

  lines.push({ text: "MoneyIQ-AI", size: 18 });
  lines.push({ text: "BY ESM", size: 8 });
  lines.push({ text: "", size: 10 });
  lines.push({ text: cfg.title, size: 22 });
  lines.push({ text: "", size: 10 });

  lines.push({ text: `Document ID: ${getId(document) || "-"}`, size: 10 });
  lines.push({
    text: `Reference: ${
      clean(document.referenceNumber || payload.reference) || "-"
    }`,
    size: 10,
  });
  lines.push({ text: `Date: ${formatDate(documentDate)}`, size: 10 });

  if (secondaryDate) {
    lines.push({
      text:
        cfg.title === "TAX INVOICE" || cfg.title === "BILL"
          ? `Due Date: ${formatDate(secondaryDate)}`
          : `Expected Shipment Date: ${formatDate(secondaryDate)}`,
      size: 10,
    });
  }

  lines.push({ text: "", size: 10 });
  lines.push({ text: `Bill To: ${partyName || "-"}`, size: 12 });

  if (partyEmail) {
    lines.push({ text: `Email: ${partyEmail}`, size: 10 });
  }

  lines.push({ text: "", size: 10 });
  lines.push({ text: "Items", size: 13 });
  lines.push({
    text: "------------------------------------------------------------",
    size: 10,
  });

  if (items.length) {
    items.slice(0, 14).forEach((item, index) => {
      const itemName = clean(
        item.itemDetails || item.description || item.name || "-"
      );
      const qty = toNumber(item.quantity || item.qty || 0);
      const rate = toNumber(item.rate || 0);
      const amount = toNumber(item.amount || qty * rate || 0);

      wrapText(`${index + 1}. ${itemName}`, 70).forEach((line) => {
        lines.push({ text: line, size: 10 });
      });

      lines.push({
        text: `   Qty: ${qty}    Rate: ${inrText(rate)}    Amount: ${inrText(
          amount
        )}`,
        size: 10,
      });
    });

    if (items.length > 14) {
      lines.push({
        text: `...and ${items.length - 14} more item(s)`,
        size: 10,
      });
    }
  } else {
    lines.push({
      text: clean(document.description || payload.notes || "Document amount details"),
      size: 10,
    });
  }

  lines.push({
    text: "------------------------------------------------------------",
    size: 10,
  });
  lines.push({ text: `Sub Total: ${inrText(baseAmount)}`, size: 11 });
  lines.push({ text: `Discount: ${inrText(discountAmount)}`, size: 11 });
  lines.push({ text: `GST: ${inrText(gstAmount)}`, size: 11 });
  lines.push({ text: `TDS: - ${inrText(tdsAmount)}`, size: 11 });
  lines.push({ text: `TCS: ${inrText(tcsAmount)}`, size: 11 });
  lines.push({ text: `Adjustment: ${inrText(adjustmentAmount)}`, size: 11 });
  lines.push({ text: "", size: 10 });
  lines.push({ text: `Total: ${inrText(totalAmount)}`, size: 14 });

  if (payload.notes || document.remarks || document.description) {
    lines.push({ text: "", size: 10 });
    lines.push({ text: "Notes", size: 12 });

    wrapText(payload.notes || document.remarks || document.description, 90).forEach(
      (line) => {
        lines.push({ text: line, size: 10 });
      }
    );
  }

  lines.push({ text: "", size: 10 });
  lines.push({ text: "Thank you for your business.", size: 10 });

  const pageWidth = 595;
  const pageHeight = 842;
  let y = 790;

  const contentParts = [];

  lines.forEach((line) => {
    const size = line.size || 10;

    if (y < 50) return;

    contentParts.push(
      `BT /F1 ${size} Tf 40 ${y} Td (${pdfEscape(line.text)}) Tj ET`
    );

    y -= size + 7;
  });

  const stream = contentParts.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

export default function SendEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const type = clean(searchParams.get("type"));
  const id = clean(searchParams.get("id"));

  const cfg = DOC_CONFIG[type];

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [cacheData, setCacheData] = useState(null);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const loadDocument = useCallback(async () => {
    if (!cfg || !id) return;

    setLoading(true);

    try {
      let stored = null;

      try {
        stored = JSON.parse(
          sessionStorage.getItem(getCacheKey(type, id)) || "null"
        );
      } catch {
        stored = null;
      }

      const res = await cfg.api.getById(id);
      const data = pickData(res);
      const apiDoc =
        data[cfg.recordKey] || data.order || data.invoice || data.bill || data;

      const mergedDoc = {
        ...(stored?.apiDocument || {}),
        ...(apiDoc || {}),
      };

      setCacheData(stored);
      setDocumentData(mergedDoc);

      const party = getPartyFromDocument(mergedDoc, cfg, stored);
      const partyName =
        stored?.partyName || partyNameOf(party, stored?.formPayload?.partyName);
      const partyEmail = stored?.partyEmail || partyEmailOf(party);

      const documentDate = getDocumentDate(mergedDoc, type, stored);
      const totalAmount = toNumber(
        stored?.formPayload?.totalAmount ??
          mergedDoc.totalAmount ??
          mergedDoc.amount ??
          0
      );

      setTo(partyEmail || "");
      setSubject(`${cfg.label} from MoneyIQ-AI / ESM`);
      setMessage(
        buildEmailBody({
          cfg,
          partyName,
          date: documentDate,
          totalAmount,
        })
      );
    } catch (error) {
      console.error("LOAD_SEND_EMAIL_DOCUMENT_ERROR:", error);
      toast.error(error?.response?.data?.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [cfg, id, type]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const party = useMemo(() => {
    if (!cfg || !documentData) return {};
    return getPartyFromDocument(documentData, cfg, cacheData);
  }, [cacheData, cfg, documentData]);

  const partyName = useMemo(() => {
    return (
      cacheData?.partyName ||
      partyNameOf(party, cacheData?.formPayload?.partyName)
    );
  }, [cacheData, party]);

  const partyEmail = useMemo(() => {
    return cacheData?.partyEmail || partyEmailOf(party);
  }, [cacheData, party]);

  const emailOptions = useMemo(() => {
    return Array.from(
      new Set(
        [partyEmail, documentData?.email, cacheData?.formPayload?.email]
          .map(clean)
          .filter(Boolean)
      )
    );
  }, [cacheData, documentData, partyEmail]);

  const totalAmount = useMemo(() => {
    return toNumber(
      cacheData?.formPayload?.totalAmount ??
        documentData?.totalAmount ??
        documentData?.amount ??
        0
    );
  }, [cacheData, documentData]);

  const documentDate = useMemo(() => {
    return getDocumentDate(documentData, type, cacheData);
  }, [cacheData, documentData, type]);

  const fileName = useMemo(() => {
    const ref = clean(
      documentData?.referenceNumber || cacheData?.formPayload?.reference || id
    );

    return `${cfg?.filePrefix || "Document"}-${ref || id}.pdf`;
  }, [cacheData, cfg, documentData, id]);

  const handleSend = async () => {
    if (!cfg || !documentData) {
      toast.error("Document not loaded");
      return;
    }

    if (!to) {
      toast.error("Send to email is required");
      return;
    }

    if (!subject) {
      toast.error("Subject is required");
      return;
    }

    if (!message) {
      toast.error("Message is required");
      return;
    }

    setSending(true);

    try {
      const pdfBlob = makePdfBlob({
        cfg,
        document: documentData,
        cacheData,
        partyName,
        partyEmail: to,
      });

      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("to", to);
      formData.append("subject", subject);
      formData.append("message", message);
      formData.append("files", pdfFile);

      await sendMediaApi.send(formData);

      toast.success("Email sent successfully");

      navigate(cfg.listPath);
    } catch (error) {
      console.error("SEND_DOCUMENT_EMAIL_ERROR:", error);
      toast.error(error?.response?.data?.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (!cfg) {
    return (
      <AppShell>
        <HistoricalUiStyles />
        <ZohoPage>
          <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
            Invalid document type
          </Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </ZohoPage>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <HistoricalUiStyles />

      <ZohoPage sx={{ p: 0, bgcolor: "#fff", minHeight: "100%" }}>
        <Box
          sx={{
            height: 66,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e3e7ef",
            bgcolor: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 4,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Button
              variant="outline"
              startIcon={<ArrowLeft size={15} />}
              onClick={() => navigate(cfg.listPath)}
              disabled={sending}
            >
              Back
            </Button>

            <Box>
              <Typography
                sx={{ fontSize: 22, fontWeight: 500, color: "#111827" }}
              >
                Send Email
              </Typography>

              <Typography sx={{ fontSize: 12.5, color: "#667085" }}>
                {cfg.label} email with generated PDF attachment
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="primary"
            startIcon={sending ? undefined : <Send size={15} />}
            onClick={handleSend}
            disabled={loading || sending}
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </Box>

        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
          {loading ? (
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #e3e7ef",
                borderRadius: "8px",
                p: 4,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress size={26} />
              <Typography sx={{ mt: 1.5, fontSize: 13, color: "#667085" }}>
                Loading document...
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #e3e7ef",
                  borderRadius: "8px",
                  p: { xs: 2, md: 2.5 },
                  bgcolor: "#fff",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "10px",
                        bgcolor: "#eaf2ff",
                        color: "#1f6ff2",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Mail size={20} />
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
                        Fixed sender: MoneyIQ-AI / ESM
                      </Typography>

                      <Typography sx={{ fontSize: 13, color: "#667085" }}>
                        API fields sent: to, subject, message, files
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    icon={<FileText size={14} />}
                    label={cfg.title}
                    variant="outlined"
                    sx={{ width: "fit-content" }}
                  />
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #e3e7ef",
                  borderRadius: "8px",
                  p: { xs: 2, md: 2.5 },
                  bgcolor: "#fff",
                }}
              >
                <Stack spacing={2}>
                  <Autocomplete
                    freeSolo
                    options={emailOptions}
                    value={to}
                    onChange={(_, value) => setTo(value || "")}
                    onInputChange={(_, value) => setTo(value || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Send To"
                        placeholder="Enter customer/vendor email"
                        size="small"
                        required
                      />
                    )}
                  />

                  <TextField
                    label="Subject"
                    size="small"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    required
                  />
                </Stack>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  border: "1px solid #e3e7ef",
                  borderRadius: "8px",
                  p: { xs: 2, md: 2.5 },
                  bgcolor: "#fff",
                }}
              >
                <Stack spacing={1.5}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                    Attachment Preview
                  </Typography>

                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: "8px",
                          bgcolor: "#f7f8fb",
                          border: "1px solid #e3e7ef",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Paperclip size={17} />
                      </Box>

                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                          {fileName}
                        </Typography>

                        <Typography sx={{ fontSize: 12.5, color: "#667085" }}>
                          Generated PDF with MoneyIQ-AI text logo
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={`Party: ${partyName || "-"}`}
                        variant="outlined"
                        sx={{ maxWidth: 260 }}
                      />

                      <Chip
                        label={`Amount: ${money(totalAmount)}`}
                        color="success"
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>

                  <Divider />

                  <Box
                    sx={{
                      border: "1px solid #e3e7ef",
                      borderRadius: "8px",
                      p: 2,
                      bgcolor: "#fbfcff",
                    }}
                  >
                    <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                      MoneyIQ-AI
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 10,
                        letterSpacing: 1,
                        color: "#667085",
                      }}
                    >
                      BY ESM
                    </Typography>

                    <Typography sx={{ fontSize: 22, fontWeight: 700, mt: 2 }}>
                      {cfg.title}
                    </Typography>

                    <Typography sx={{ fontSize: 13, color: "#667085", mt: 1 }}>
                      Document ID: {id}
                    </Typography>

                    <Typography sx={{ fontSize: 13, color: "#667085" }}>
                      Date: {formatDate(documentDate)}
                    </Typography>

                    <Typography sx={{ fontSize: 13, color: "#667085" }}>
                      Bill To: {partyName || "-"}
                    </Typography>

                    <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 2 }}>
                      Total: {money(totalAmount)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </Box>
      </ZohoPage>
    </AppShell>
  );
}