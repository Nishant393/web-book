import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import ZohoPage from "../components/ZohoPage";
import { HistoricalUiStyles } from "../styles/powerUi";
import { Card, PageBar, money } from "./businessUtils.jsx";
import { getDocuments, removeDocument } from "../utils/documentStore";
import {
  billApi,
  invoiceApi,
  purchaseOrderApi,
  salesOrderApi,
} from "../api/customerVendorApi";

const CONFIG = {
  "Sales Orders": {
    path: "/sales-orders/new",
    empty: "No sales orders found",
    apiMessage: "Records are loaded from backend API.",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Customer Name" },
      { key: "shipment", header: "Expected Shipment" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "tdsAmount", header: "TDS", align: "right", render: (row) => money(row.tdsAmount) },
      { key: "tcsAmount", header: "TCS", align: "right", render: (row) => money(row.tcsAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Invoices: {
    path: "/invoices/new",
    empty: "No invoices found",
    apiMessage: "Records are loaded from backend API.",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Customer Name" },
      { key: "due", header: "Due Date" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "tdsAmount", header: "TDS", align: "right", render: (row) => money(row.tdsAmount) },
      { key: "tcsAmount", header: "TCS", align: "right", render: (row) => money(row.tcsAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  "Purchase Orders": {
    path: "/purchase-orders/new",
    empty: "No purchase orders found",
    apiMessage: "Records are loaded from backend API.",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Vendor Name" },
      { key: "shipment", header: "Expected Shipment" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "tdsAmount", header: "TDS", align: "right", render: (row) => money(row.tdsAmount) },
      { key: "tcsAmount", header: "TCS", align: "right", render: (row) => money(row.tcsAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Bills: {
    path: "/bills/new",
    empty: "No bills found",
    apiMessage: "Records are loaded from backend API.",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Vendor Name" },
      { key: "due", header: "Due Date" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "tdsAmount", header: "TDS", align: "right", render: (row) => money(row.tdsAmount) },
      { key: "tcsAmount", header: "TCS", align: "right", render: (row) => money(row.tcsAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Vouchers: {
    path: "/vouchers/new",
    empty: "No vouchers found",
    apiMessage: "Saved draft/demo records are stored locally until backend routes are connected.",
    columns: [
      { key: "date", header: "Date" },
      { key: "number", header: "Voucher#" },
      { key: "party", header: "Party Name" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
};

const pickData = (value) => value?.data || value?.result || value || {};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.docs)) return value.docs;
  return [];
};

const getId = (row) => row?._id || row?.id || row?.orderId || row?.invoiceId || row?.billId || "";

function partyName(row, type) {
  const party = type === "sales" || type === "invoice" ? row?.customerId : row?.vendorId;

  if (party && typeof party === "object") {
    return party.displayName || party.customerName || party.vendorName || party.companyName || "-";
  }

  return row?.party || row?.partyName || "-";
}

function baseAmountOf(row) {
  const amount = Number(row.amount || 0);
  const discountAmount = Number(row.discountAmount || 0);

  if (amount > 0 && discountAmount > 0) {
    return Math.max(amount - discountAmount, 0);
  }

  return row.baseAmount || row.subTotal || amount || 0;
}

function normalizeApiOrderRow(row, type) {
  return {
    ...row,
    id: getId(row),
    __rowKey: getId(row),
    date: row.orderDate || row.date,
    party: partyName(row, type),
    shipment: row.expectedShipmentDate || row.shipment,
    baseAmount: baseAmountOf(row),
    gstAmount: row.gstAmount || 0,
    tdsAmount: row.tdsAmount || 0,
    tcsAmount: row.tcsAmount || 0,
    amount: row.totalAmount || row.amount || 0,
    status: row.status || "-",
  };
}

function normalizeApiInvoiceRow(row) {
  return {
    ...row,
    id: getId(row),
    __rowKey: getId(row),
    date: row.invoiceDate || row.date,
    party: partyName(row, "invoice"),
    due: row.dueDate || row.due,
    baseAmount: baseAmountOf(row),
    gstAmount: row.gstAmount || 0,
    tdsAmount: row.tdsAmount || 0,
    tcsAmount: row.tcsAmount || 0,
    amount: row.totalAmount || row.amount || 0,
    status: row.status || "-",
  };
}

function normalizeApiBillRow(row) {
  return {
    ...row,
    id: getId(row),
    __rowKey: getId(row),
    date: row.billDate || row.date,
    party: partyName(row, "bill"),
    due: row.dueDate || row.due,
    baseAmount: baseAmountOf(row),
    gstAmount: row.gstAmount || 0,
    tdsAmount: row.tdsAmount || 0,
    tcsAmount: row.tcsAmount || 0,
    amount: row.totalAmount || row.amount || 0,
    status: row.status || "-",
  };
}

const defaultColumns = [
  { key: "date", header: "Date" },
  { key: "party", header: "Name" },
  { key: "amount", header: "Amount", align: "right", render: (row) => money(row.amount) },
  { key: "status", header: "Status" },
];

export default function SimpleModulePage({ title = "Module", button = "New", columns = [] }) {
  const navigate = useNavigate();
  const cfg = CONFIG[title] || {};
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRows = async () => {
    setLoading(true);

    try {
      if (title === "Sales Orders") {
        const res = await salesOrderApi.listAll();
        setRows(safeArray(pickData(res).items || pickData(res)).map((row) => normalizeApiOrderRow(row, "sales")));
        return;
      }

      if (title === "Purchase Orders") {
        const res = await purchaseOrderApi.listAll();
        setRows(safeArray(pickData(res).items || pickData(res)).map((row) => normalizeApiOrderRow(row, "purchase")));
        return;
      }

      if (title === "Invoices") {
        const res = await invoiceApi.listAll();
        setRows(safeArray(pickData(res).items || pickData(res)).map(normalizeApiInvoiceRow));
        return;
      }

      if (title === "Bills") {
        const res = await billApi.listAll();
        setRows(safeArray(pickData(res).items || pickData(res)).map(normalizeApiBillRow));
        return;
      }

      setRows(getDocuments(title).map((row) => ({ ...row, __rowKey: row.id })));
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteRow = async (row) => {
    try {
      if (title === "Sales Orders") {
        await salesOrderApi.delete(getId(row));
        await loadRows();
        return;
      }

      if (title === "Purchase Orders") {
        await purchaseOrderApi.delete(getId(row));
        await loadRows();
        return;
      }

      if (title === "Invoices") {
        await invoiceApi.delete(getId(row));
        await loadRows();
        return;
      }

      if (title === "Bills") {
        await billApi.delete(getId(row));
        await loadRows();
        return;
      }

      removeDocument(row.id);
      loadRows();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to delete ${title}`);
    }
  };

  const tableColumns = useMemo(() => {
    const base = columns.length ? columns : cfg.columns || defaultColumns;
    return [
      ...base,
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <Button
            variant="text"
            startIcon={<Trash2 size={14} />}
            onClick={(event) => {
              event.stopPropagation();
              deleteRow(row);
            }}
          >
            Delete
          </Button>
        ),
      },
    ];
  }, [columns, cfg.columns]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell>
      <HistoricalUiStyles />
      <ZohoPage sx={{ p: 0 }}>
        <PageBar title={title} subtitle="Zoho Books style list page">
          <Button startIcon={<Plus size={15} />} onClick={() => (cfg.path ? navigate(cfg.path) : undefined)}>
            {button}
          </Button>
        </PageBar>

        <Box sx={{ p: { xs: 1.5, md: 2 }, width: "100%" }}>
          <Card title={title} action={<Chip size="small" label={`${rows.length} records`} variant="outlined" />} bodySx={{ p: 0 }}>
            <Stack sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e3e7ef" }}>
              <Typography sx={{ fontSize: 13, color: "#667085" }}>
                {cfg.apiMessage || "Saved draft/demo records are stored locally until backend routes are connected."}
              </Typography>
            </Stack>
            <DataTable columns={tableColumns} rows={rows} loading={loading} emptyText={cfg.empty || `No ${title.toLowerCase()} found`} minWidth={1280} />
          </Card>
        </Box>
      </ZohoPage>
    </AppShell>
  );
}