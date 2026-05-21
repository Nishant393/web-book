import React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";

export const COMPANY_NAME = "M/s Elixgen System Management Private Limited";
export const COMPANY_PAN = "AAJCE0046Q";
export const BANK_TEXT =
  "Kotak Mahindra Bank. Account number: 2050758221, Account type: Current, Branch IFSC: KKBK0001833, Branch name: Nagpur-Dharampeth";

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const safe = (v) => String(v ?? "").trim();
const number = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};

export function documentTitle(type, doc = {}) {
  if (type === "sales-order") return "SALES ORDER";
  if (type === "purchase-order") return "PURCHASE ORDER";
  if (type === "delivery-challan") return "DELIVERY CHALLAN";
  if (type === "installation-challan") return "INSTALLATION CHALLAN";
  if (type === "receipt") return "RECEIPT";
  if (type === "bill") return "BILL";
  if (type === "invoice") {
    return doc?.invoiceType === "TAX_INVOICE" || doc?.status === "PAID" ? "TAX INVOICE" : "PROFORMA INVOICE";
  }
  if (type === "proforma-invoice") return "PROFORMA INVOICE";
  return "DOCUMENT";
}

export function partyFromDocument(doc = {}) {
  const partyObj =
    doc.customerId && typeof doc.customerId === "object"
      ? doc.customerId
      : doc.vendorId && typeof doc.vendorId === "object"
        ? doc.vendorId
        : {};
  const snap = doc.customerSnapshot || doc.vendorSnapshot || {};
  const name = partyObj.displayName || partyObj.customerName || partyObj.vendorName || partyObj.companyName || partyObj.name || snap.name || doc.partyName || "—";
  const email = partyObj.email || partyObj.emailId || snap.email || "";
  const mobile = partyObj.mobile || partyObj.workPhone || snap.mobile || "";
  const gstNumber = partyObj.gstNumber || partyObj.gstin || snap.gstNumber || "";
  const addressObj = partyObj.billingAddress || partyObj.shippingAddress || partyObj.address || snap.billingAddress || snap.shippingAddress || "";
  const address = typeof addressObj === "object" ? [addressObj.address, addressObj.city, addressObj.state, addressObj.pincode].filter(Boolean).join(", ") : safe(addressObj);
  return { name, email, mobile, gstNumber, address };
}

export function documentNumber(doc = {}) {
  return doc.salesOrderNumber || doc.purchaseOrderNumber || doc.invoiceNumber || doc.billNumber || doc.challanNumber || doc.receiptNumber || doc.referenceNumber || doc._id || doc.id || "—";
}

export function documentDate(doc = {}) {
  return doc.orderDate || doc.invoiceDate || doc.billDate || doc.challanDate || doc.paymentDate || doc.date || doc.createdAt;
}

export function secondaryDateLabel(type = "invoice") {
  if (type === "invoice" || type === "proforma-invoice" || type === "bill") return "Due Date";
  if (type === "delivery-challan" || type === "installation-challan") return "Customer Order Date";
  return "Expected Shipment Date";
}

export function secondaryDate(doc = {}) {
  return doc.dueDate || doc.expectedShipmentDate || doc.orderDate || doc.invoiceDate || doc.challanDate;
}

export function normalizeItems(doc = {}) {
  const rows = Array.isArray(doc.items) ? doc.items : [];
  return rows.map((item, index) => {
    const qty = number(item.quantity || item.qty || 0);
    const rate = number(item.rate || 0);
    const discount = number(item.discount || 0);
    const amount = number(item.amount || Math.max(qty * rate - discount, 0));
    return {
      sr: index + 1,
      itemDetails: item.itemDetails || item.description || item.name || "—",
      description: item.description || "",
      quantity: qty,
      rate,
      discount,
      amount,
    };
  });
}

export function toPdfDocumentData({ type = "invoice", doc = {}, title } = {}) {
  const party = partyFromDocument(doc);
  const items = normalizeItems(doc);
  const resolvedTitle = title || documentTitle(type, doc);
  const subTotal = number(doc.subtotal || doc.amount || doc.taxableAmount || 0);
  const discountAmount = number(doc.discountAmount || 0);
  const netTotal = number(doc.taxableAmount || Math.max(subTotal - discountAmount, 0));
  const gstAmount = number(doc.gstAmount || doc.gstTotal || 0);
  const tdsAmount = number(doc.tdsAmount || 0);
  const tcsAmount = number(doc.tcsAmount || 0);
  const adjustmentAmount = number(doc.adjustmentAmount || 0);
  const total = number(doc.totalAmount || netTotal + gstAmount + tcsAmount - tdsAmount + adjustmentAmount);
  const paidAmount = number(doc.paidAmount || 0);
  const balanceAmount = number(doc.balanceAmount ?? Math.max(total - paidAmount, 0));
  return {
    type,
    title: resolvedTitle,
    number: documentNumber(doc),
    date: documentDate(doc),
    secondaryDate: secondaryDate(doc),
    secondaryDateLabel: secondaryDateLabel(type),
    customerOrderNo: doc.salesOrderNumber || doc.referenceNumber || doc.customerOrderNo || "—",
    customerOrderDate: doc.orderDate || doc.salesOrderDate || doc.invoiceDate || doc.challanDate || doc.createdAt,
    party,
    items,
    subTotal,
    discountAmount,
    netTotal,
    gstPercent: number(doc.gstPercent || 0),
    gstAmount,
    tdsPercent: number(doc.tdsPercent || 0),
    tdsAmount,
    tcsPercent: number(doc.tcsPercent || 0),
    tcsAmount,
    adjustmentAmount,
    total,
    paidAmount,
    balanceAmount,
    notes: doc.notes || doc.remarks || doc.description || "",
    status: doc.status || "",
  };
}

function Row({ label, value, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4, gap: 2 }}>
      <Typography sx={{ fontSize: 12, fontWeight: strong ? 700 : 500, color: "#111827" }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: strong ? 700 : 500, color: "#111827", textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}

export default function DocumentPdfPreview({ type = "invoice", doc = {}, title, scale = 1 }) {
  const data = toPdfDocumentData({ type, doc, title });
  const isChallan = data.title.includes("CHALLAN");
  const isReceipt = data.title === "RECEIPT";
  const showAmounts = !isChallan || data.title === "PURCHASE ORDER";
  return (
    <Box className="moneyiq-pdf-preview" sx={{ width: 794, minHeight: 1123, bgcolor: "#fff", border: "1px solid #b8b8b8", boxShadow: "0 10px 28px rgba(15,23,42,0.12)", mx: "auto", my: 3, p: 4, transform: `scale(${scale})`, transformOrigin: "top center", fontFamily: "Times New Roman, serif", color: "#000", position: "relative" }}>
      {data.status ? <Box sx={{ position: "absolute", top: 18, left: -42, transform: "rotate(-45deg)", bgcolor: data.status === "DRAFT" ? "#94a3b8" : data.status === "PAID" ? "#16a34a" : "#2d8cff", color: "#fff", px: 5, py: 0.45, fontSize: 13, fontWeight: 700, letterSpacing: 0.4 }}>{data.status.replace(/_/g, " ")}</Box> : null}
      <Typography sx={{ textAlign: "center", fontSize: 26, fontWeight: 700, letterSpacing: 1, mb: 3 }}>{data.title}</Typography>
      <Box sx={{ border: "1px solid #8d8d8d" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #8d8d8d" }}>
          <Box sx={{ p: 1.3, borderRight: "1px solid #8d8d8d" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>MoneyIQ-AI</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700 }}>BY ESM</Typography>
            <Typography sx={{ fontSize: 12, mt: 1 }}>India</Typography>
          </Box>
          <Box sx={{ p: 1.3 }}>
            <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: 12 }}>Number</Typography><Typography sx={{ fontSize: 12, fontWeight: 700 }}>{data.number}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: 12 }}>Date</Typography><Typography sx={{ fontSize: 12, fontWeight: 700 }}>{formatDate(data.date)}</Typography></Stack>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #8d8d8d" }}>
          <Box sx={{ p: 1.3, borderRight: "1px solid #8d8d8d" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Customer Name</Typography>
            <Typography sx={{ fontSize: 13, mt: 0.5 }}>{data.party.name}</Typography>
            {data.party.email ? <Typography sx={{ fontSize: 11 }}>{data.party.email}</Typography> : null}
            {data.party.mobile ? <Typography sx={{ fontSize: 11 }}>{data.party.mobile}</Typography> : null}
          </Box>
          <Box sx={{ p: 1.3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Customer Address</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.5, whiteSpace: "pre-wrap" }}>{data.party.address || "—"}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #8d8d8d" }}>
          <Box sx={{ p: 1.3, borderRight: "1px solid #8d8d8d" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Customer Order No.</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>{data.customerOrderNo}</Typography>
          </Box>
          <Box sx={{ p: 1.3 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Customer Order Date</Typography>
            <Typography sx={{ fontSize: 12, mt: 0.5 }}>{formatDate(data.customerOrderDate)}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mt: 0.75 }}>Customer GST TIN No.</Typography>
            <Typography sx={{ fontSize: 12 }}>{data.party.gstNumber || "—"}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: showAmounts ? "56px 1fr 96px 116px" : "56px 1fr 116px", bgcolor: "#eeeeee", borderBottom: "1px solid #8d8d8d" }}>
          <Typography sx={{ p: 0.8, fontSize: 12, fontWeight: 700, borderRight: "1px solid #8d8d8d" }}>Sr. No.</Typography>
          <Typography sx={{ p: 0.8, fontSize: 12, fontWeight: 700, borderRight: "1px solid #8d8d8d" }}>Particulars</Typography>
          {showAmounts ? <Typography sx={{ p: 0.8, fontSize: 12, fontWeight: 700, borderRight: "1px solid #8d8d8d", textAlign: "right" }}>Quantity</Typography> : null}
          <Typography sx={{ p: 0.8, fontSize: 12, fontWeight: 700, textAlign: "right" }}>{showAmounts ? "Amount" : "Quantity"}</Typography>
        </Box>
        {(data.items.length ? data.items : [{ sr: 1, itemDetails: data.notes || "—", quantity: 0, amount: data.total }]).map((item) => (
          <Box key={item.sr} sx={{ display: "grid", gridTemplateColumns: showAmounts ? "56px 1fr 96px 116px" : "56px 1fr 116px", borderBottom: "1px solid #d6d6d6", minHeight: 30 }}>
            <Typography sx={{ p: 0.8, fontSize: 12, borderRight: "1px solid #d6d6d6" }}>{item.sr}</Typography>
            <Typography sx={{ p: 0.8, fontSize: 12, borderRight: "1px solid #d6d6d6" }}>{item.itemDetails}</Typography>
            {showAmounts ? <Typography sx={{ p: 0.8, fontSize: 12, borderRight: "1px solid #d6d6d6", textAlign: "right" }}>{item.quantity || ""}</Typography> : null}
            <Typography sx={{ p: 0.8, fontSize: 12, textAlign: "right" }}>{showAmounts ? formatMoney(item.amount) : item.quantity || ""}</Typography>
          </Box>
        ))}
        {showAmounts ? <Box sx={{ display: "grid", gridTemplateColumns: "1fr 240px", minHeight: 150 }}>
          <Box sx={{ p: 1.2, borderRight: "1px solid #8d8d8d" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Notes</Typography>
            <Typography sx={{ fontSize: 12, whiteSpace: "pre-wrap", mt: 0.5 }}>{data.notes || "Thanking you."}</Typography>
          </Box>
          <Box sx={{ p: 1.2 }}>
            <Row label="Net Total" value={formatMoney(data.netTotal)} />
            {data.gstAmount ? <Row label={`GST ${data.gstPercent ? `(${data.gstPercent}%)` : ""}`} value={formatMoney(data.gstAmount)} /> : null}
            {data.tdsAmount ? <Row label={`TDS ${data.tdsPercent ? `(${data.tdsPercent}%)` : ""}`} value={`- ${formatMoney(data.tdsAmount)}`} /> : null}
            {data.tcsAmount ? <Row label={`TCS ${data.tcsPercent ? `(${data.tcsPercent}%)` : ""}`} value={formatMoney(data.tcsAmount)} /> : null}
            {data.adjustmentAmount ? <Row label="Adjustment" value={formatMoney(data.adjustmentAmount)} /> : null}
            <Divider sx={{ my: 0.7 }} />
            <Row label="Total Inclusive of All Taxes" value={formatMoney(data.total)} strong />
            {(data.title.includes("INVOICE") || isReceipt) ? <Row label="Balance Due" value={formatMoney(data.balanceAmount)} strong /> : null}
          </Box>
        </Box> : null}
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Company’s PAN No</Typography>
        <Typography sx={{ fontSize: 12 }}>{COMPANY_PAN}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, mt: 1 }}>Bank</Typography>
        <Typography sx={{ fontSize: 12 }}>{BANK_TEXT}</Typography>
        <Typography sx={{ fontSize: 12, mt: 1 }}>Other TAX: If any need to be borne by the customer.</Typography>
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
        <Box>
          <Typography sx={{ fontSize: 12 }}>Thanking you.</Typography>
          <Typography sx={{ fontSize: 12, mt: 1 }}>Yours faithfully,</Typography>
          <Typography sx={{ fontSize: 12, mt: 2 }}>{COMPANY_NAME}</Typography>
          <Typography sx={{ fontSize: 12, mt: 4, fontWeight: 700 }}>Authorized Signatory</Typography>
        </Box>
        {isChallan ? <Box sx={{ width: 280 }}>
          <Typography sx={{ fontSize: 12 }}>For</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{data.party.name}</Typography>
          <Typography sx={{ fontSize: 12, mt: 1 }}>{data.title === "INSTALLATION CHALLAN" ? "Installation Completed" : "Received the above Material in Good Condition"}</Typography>
          {["Name", "Designation", "Phone No.", "Email ID", "Signature"].map((label) => (
            <Stack key={label} direction="row" sx={{ mt: 1.1 }}>
              <Typography sx={{ fontSize: 12, width: 88 }}>{label}</Typography>
              <Box sx={{ borderBottom: "1px solid #111", flex: 1 }} />
            </Stack>
          ))}
        </Box> : null}
      </Stack>
    </Box>
  );
}

function pdfEscape(value) {
  return String(value ?? "").replace(/[₹]/g, "INR").replace(/[^\x00-\x7F]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function wrap(text, max = 92) {
  const out = [];
  let current = "";
  String(text || "").split(/\s+/).forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) { if (current) out.push(current); current = word; } else current = next;
  });
  if (current) out.push(current);
  return out.length ? out : [""];
}
export function createDocumentPdfBlob({ type = "invoice", doc = {}, title } = {}) {
  const data = toPdfDocumentData({ type, doc, title });
  const lines = [];
  lines.push({ text: data.title, size: 20 });
  lines.push({ text: "MoneyIQ-AI BY ESM", size: 12 });
  lines.push({ text: `Number: ${data.number}    Date: ${formatDate(data.date)}`, size: 10 });
  lines.push({ text: `Customer Name: ${data.party.name}`, size: 10 });
  lines.push({ text: `Customer Address: ${data.party.address || "-"}`, size: 10 });
  lines.push({ text: `Customer Order No.: ${data.customerOrderNo}    Customer Order Date: ${formatDate(data.customerOrderDate)}`, size: 10 });
  lines.push({ text: "", size: 8 });
  lines.push({ text: "Sr. No.   Particulars                                      Qty       Amount", size: 10 });
  lines.push({ text: "--------------------------------------------------------------------------", size: 10 });
  (data.items.length ? data.items : [{ sr: 1, itemDetails: data.notes || "Document", quantity: 1, amount: data.total }]).slice(0, 22).forEach((item) => {
    wrap(`${item.sr}. ${item.itemDetails}`, 54).forEach((line, i) => {
      if (i === 0) lines.push({ text: `${line.padEnd(56)} ${String(item.quantity || "").padStart(6)} ${formatMoney(item.amount).padStart(14)}`, size: 9 });
      else lines.push({ text: `   ${line}`, size: 9 });
    });
  });
  lines.push({ text: "--------------------------------------------------------------------------", size: 10 });
  lines.push({ text: `Net Total: ${formatMoney(data.netTotal)}`, size: 10 });
  if (data.gstAmount) lines.push({ text: `GST: ${formatMoney(data.gstAmount)}`, size: 10 });
  if (data.tdsAmount) lines.push({ text: `TDS: - ${formatMoney(data.tdsAmount)}`, size: 10 });
  if (data.tcsAmount) lines.push({ text: `TCS: ${formatMoney(data.tcsAmount)}`, size: 10 });
  if (data.adjustmentAmount) lines.push({ text: `Adjustment: ${formatMoney(data.adjustmentAmount)}`, size: 10 });
  lines.push({ text: `Total Inclusive of All Taxes: ${formatMoney(data.total)}`, size: 12 });
  if (data.title.includes("INVOICE") || data.title === "RECEIPT") lines.push({ text: `Balance Due: ${formatMoney(data.balanceAmount)}`, size: 12 });
  lines.push({ text: "", size: 8 });
  lines.push({ text: `Company PAN: ${COMPANY_PAN}`, size: 9 });
  lines.push({ text: `Bank: ${BANK_TEXT}`, size: 9 });
  lines.push({ text: "Thanking you. Yours faithfully,", size: 10 });
  lines.push({ text: COMPANY_NAME, size: 10 });
  lines.push({ text: "Authorized Signatory", size: 10 });

  const pageWidth = 595;
  const pageHeight = 842;
  let y = 800;
  const parts = [];
  lines.forEach((line) => {
    const size = line.size || 10;
    if (y < 40) return;
    parts.push(`BT /F1 ${size} Tf 40 ${y} Td (${pdfEscape(line.text)}) Tj ET`);
    y -= size + 7;
  });
  const stream = parts.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, idx) => { offsets.push(pdf.length); pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`; });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
export function createDocumentPdfFile({ type = "invoice", doc = {}, title, fileName } = {}) {
  const name = fileName || `${documentTitle(type, doc).replace(/\s+/g, "-")}-${documentNumber(doc)}.pdf`;
  return new File([createDocumentPdfBlob({ type, doc, title })], name, { type: "application/pdf" });
}
export function downloadDocumentPdf({ type = "invoice", doc = {}, title, fileName } = {}) {
  const blob = createDocumentPdfBlob({ type, doc, title });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `${documentTitle(type, doc).replace(/\s+/g, "-")}-${documentNumber(doc)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
