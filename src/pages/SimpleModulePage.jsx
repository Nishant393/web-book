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
import { purchaseOrderApi, salesOrderApi } from "../api/customerVendorApi";

const CONFIG = {
  "Sales Orders": {
    path: "/sales-orders/new",
    empty: "No sales orders found",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Customer Name" },
      { key: "shipment", header: "Expected Shipment" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Invoices: {
    path: "/invoices/new",
    empty: "No invoices found",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Customer Name" },
      { key: "due", header: "Due Date" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  "Purchase Orders": {
    path: "/purchase-orders/new",
    empty: "No purchase orders found",
    columns: [
      { key: "date", header: "Date" },
      { key: "party", header: "Vendor Name" },
      { key: "shipment", header: "Expected Shipment" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Bills: {
    path: "/bills/new",
    empty: "No bills found",
    columns: [
      { key: "date", header: "Date" },
      { key: "number", header: "Bill#" },
      { key: "party", header: "Vendor Name" },
      { key: "due", header: "Due Date" },
      { key: "baseAmount", header: "Base Amount", align: "right", render: (row) => money(row.baseAmount) },
      { key: "gstAmount", header: "GST", align: "right", render: (row) => money(row.gstAmount) },
      { key: "amount", header: "Total", align: "right", render: (row) => money(row.amount) },
      { key: "status", header: "Status" },
    ],
  },
  Vouchers: {
    path: "/vouchers/new",
    empty: "No vouchers found",
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

const getId = (row) => row?._id || row?.id || row?.orderId || "";

function partyName(row, type) {
  const party = type === "sales" ? row?.customerId : row?.vendorId;

  if (party && typeof party === "object") {
    return party.displayName || party.customerName || party.vendorName || party.companyName || "-";
  }

  return row?.party || row?.partyName || "-";
}

function normalizeApiOrderRow(row, type) {
  return {
    ...row,
    id: getId(row),
    __rowKey: getId(row),
    date: row.orderDate || row.date,
    party: partyName(row, type),
    shipment: row.expectedShipmentDate || row.shipment,
    baseAmount: row.amount || row.baseAmount || row.subTotal || 0,
    gstAmount: row.gstAmount || 0,
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
              if (title === "Sales Orders") {
                salesOrderApi.delete(getId(row)).then(loadRows).catch((error) => {
                  toast.error(error?.response?.data?.message || "Failed to delete sales order");
                });
                return;
              }

              if (title === "Purchase Orders") {
                purchaseOrderApi.delete(getId(row)).then(loadRows).catch((error) => {
                  toast.error(error?.response?.data?.message || "Failed to delete purchase order");
                });
                return;
              }

              removeDocument(row.id);
              loadRows();
            }}
          >
            Delete
          </Button>
        ),
      },
    ];
  }, [columns, cfg.columns]);

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
                {title === "Sales Orders" || title === "Purchase Orders" ? "Records are loaded from backend API." : "Saved draft/demo records are stored locally until backend routes are connected."}
              </Typography>
            </Stack>
            <DataTable columns={tableColumns} rows={rows} loading={loading} emptyText={cfg.empty || `No ${title.toLowerCase()} found`} minWidth={1280} />
          </Card>
        </Box>
      </ZohoPage>
    </AppShell>
  );
}
