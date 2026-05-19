import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import CustomerFormModal from "../components/CustomerFormModal";
import { customerApi } from "../api/customerVendorApi";
import { HistoricalUiStyles } from "../styles/powerUi";

const PAGE_SX = {
  width: "100%",
  minHeight: "100%",
  bgcolor: "#fff",
  px: { xs: 1, md: 2 },
  py: { xs: 1, md: 1.5 },
};

const CARD_SX = {
  borderRadius: "6px",
  border: "1px solid #e3e7ef",
  bgcolor: "#fff",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const emptyCustomer = {
  customerType: "Business",
  salutation: "",
  firstName: "",
  lastName: "",
  companyName: "",
  customerName: "",
  displayName: "",
  email: "",
  workPhone: "",
  mobile: "",
  customerLanguage: "English",
  pan: "",
  currency: "INR - Indian Rupee",
  accountsReceivable: "",
  paymentTerms: "Due on Receipt",
  enablePortal: false,
  address: "",
  billingAddress: "",
  shippingAddress: "",
  contactPerson: "",
  remarks: "",
  gstNumber: "",
  city: "",
  state: "",
};

const pickData = (value) => value?.data || value?.result || value || {};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.results)) return value.results;
  if (Array.isArray(value.docs)) return value.docs;

  if (value.data && value.data !== value) return safeArray(value.data);
  if (value.result && value.result !== value) return safeArray(value.result);

  return [];
};

const getId = (row) => row?._id || row?.id || "";

const money = (value) => {
  const n = Number(value || 0);

  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
};

function PageTopBar({ title, subtitle, count, onRefresh, onAdd, loading }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...CARD_SX,
        px: 2,
        py: 1.5,
        mb: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              bgcolor: "#eaf2ff",
              color: "#4088ff",
            }}
          >
            <PeopleAltRoundedIcon fontSize="small" />
          </Box>

          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 500, color: "#111827" }}>
              {title}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#667085", mt: 0.25 }}>
              {subtitle}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={`${count} records`}
            sx={{
              ml: 0.5,
              height: 24,
              fontSize: 12,
              bgcolor: "#f7f8fb",
              border: "1px solid #e3e7ef",
            }}
          />
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outline"
            startIcon={
              loading ? <CircularProgress size={15} /> : <RefreshRoundedIcon />
            }
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button variant="primary" startIcon={<AddRoundedIcon />} onClick={onAdd}>
            New Customer
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerModal, setCustomerModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setSelectedCustomer(null);
    setCustomerModal(true);
  }, []);

  const closeCustomerModal = () => {
    setCustomerModal(false);
    setSelectedCustomer(null);
    setModalMode("create");

    if (searchParams.get("create")) {
      setSearchParams({});
    }
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await customerApi.list({ limit: 500 });
      const data = pickData(res);
      const list = safeArray(data.items || data);

      setCustomers(list);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreateModal();
    }
  }, [searchParams, openCreateModal]);

  const handleSubmitCustomer = async (payload, pendingFiles = []) => {
    setSaving(true);

    try {
      let customerId;

      if (modalMode === "edit" && selectedCustomer) {
        const id = getId(selectedCustomer);
        if (!id) { toast.error("Customer id missing"); return; }
        await customerApi.update(id, payload);
        customerId = id;
        toast.success("Customer updated");
      } else {
        const res = await customerApi.create(payload);
        const data = res?.data || res;
        customerId = data?._id || data?.customer?._id;
        toast.success("Customer created");
      }

      // Upload any pending documents after customer is created/updated
      if (customerId && pendingFiles.length > 0) {
        for (const { file, title } of pendingFiles) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("title", title || file.name);
            await customerApi.uploadDocument(customerId, fd);
          } catch {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      closeCustomerModal();
      await loadCustomers();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (modalMode === "edit" ? "Failed to update customer" : "Failed to create customer"),
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditCustomer = (row) => {
    setModalMode("edit");
    setSelectedCustomer(row);
    setCustomerModal(true);
  };

  const openDeleteCustomer = (row) => {
    setDeleteTarget(row);
    setDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteModal(false);
  };

  const deleteCustomer = async () => {
    const id = getId(deleteTarget);

    if (!id) {
      toast.error("Customer id missing");
      return;
    }

    setSaving(true);

    try {
      const deleteFn =
        customerApi.deleteCustomer ||
        customerApi.delete ||
        customerApi.remove ||
        customerApi.deleteById;

      if (!deleteFn) {
        toast.error("Delete API function is not available");
        return;
      }

      await deleteFn(id);
      toast.success("Customer deleted");

      closeDeleteModal();
      await loadCustomers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete customer");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => customers, [customers]);

  const columns = [
    {
      key: "customerName",
      header: "Customer Details",
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
            {row.customerName || row.displayName || row.companyName || "-"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#667085" }}>
            {row.email || row.mobile || row.contactPerson || "-"}
          </Typography>
        </Stack>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Chip
          size="small"
          label={row.customerType || "Business"}
          variant="outlined"
          sx={{ fontSize: 12 }}
        />
      ),
    },
    {
      key: "receivable",
      header: "Receivable",
      align: "right",
      render: (row) => money(row?.summary?.remainingPayment || row.remainingPayment || 0),
    },
    {
      key: "received",
      header: "Received",
      align: "right",
      render: (row) => money(row?.summary?.totalPaymentReceived || row.totalPaymentReceived || 0),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Chip
          size="small"
          label={row.isActive === false ? "Inactive" : "Active"}
          color={row.isActive === false ? "warning" : "success"}
          variant="outlined"
          sx={{ fontSize: 12 }}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/customers/${getId(row)}`);
            }}
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openEditCustomer(row);
            }}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteCustomer(row);
            }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <AppShell>
      <HistoricalUiStyles />

      <Box sx={PAGE_SX}>
        <PageTopBar
          title="Active Customers"
          subtitle="Create and manage customer records, receivables, and linked bank credits."
          count={customers.length}
          loading={loading}
          onRefresh={loadCustomers}
          onAdd={openCreateModal}
        />

        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                ...CARD_SX,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderBottom: "1px solid #e3e7ef",
                  bgcolor: "#fff",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>
                    Customers
                  </Typography>
                  <Chip size="small" label="Zoho-style list" variant="outlined" />
                </Stack>
              </Box>

              <DataTable
                columns={columns}
                rows={rows}
                loading={loading}
                loadingText="Loading customers..."
                emptyText="No customers found. Click New Customer to add one."
                onRowClick={(row) => navigate(`/customers/${getId(row)}`)}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <CustomerFormModal
        open={customerModal}
        mode={modalMode}
        value={modalMode === "edit" ? selectedCustomer : null}
        saving={saving}
        onClose={closeCustomerModal}
        onSubmit={handleSubmitCustomer}
      />

      <Modal
        open={deleteModal}
        onClose={closeDeleteModal}
        title="Delete Customer"
        maxBodyHeight="50vh"
        footer={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
            <Button variant="outline" onClick={closeDeleteModal} disabled={saving}>
              Cancel
            </Button>

            <Button variant="danger" onClick={deleteCustomer} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        }
      >
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Are you sure you want to delete{" "}
          <b>
            {deleteTarget?.customerName ||
              deleteTarget?.displayName ||
              deleteTarget?.companyName ||
              "this customer"}
          </b>
          ?
        </Alert>
      </Modal>
    </AppShell>
  );
}