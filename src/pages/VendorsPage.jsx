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
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import CustomerFormModal from "../components/CustomerFormModal";
import { vendorApi } from "../api/customerVendorApi";
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

const emptyVendor = {
  vendorType: "Business",
  salutation: "",
  firstName: "",
  lastName: "",
  companyName: "",
  vendorName: "",
  displayName: "",
  email: "",
  workPhone: "",
  mobile: "",
  vendorLanguage: "English",
  pan: "",
  currency: "INR - Indian Rupee",
  accountsPayable: "",
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
            <StorefrontRoundedIcon fontSize="small" />
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
            New Vendor
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function VendorsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vendorModal, setVendorModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setSelectedVendor(null);
    setVendorModal(true);
  }, []);

  const closeVendorModal = () => {
    setVendorModal(false);
    setSelectedVendor(null);
    setModalMode("create");

    if (searchParams.get("create")) {
      setSearchParams({});
    }
  };

  const loadVendors = useCallback(async () => {
    setLoading(true);

    try {
      const res = await vendorApi.list({ limit: 500 });
      const data = pickData(res);
      const list = safeArray(data.items || data);

      setVendors(list);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreateModal();
    }
  }, [searchParams, openCreateModal]);

  const handleSubmitVendor = async (payload, pendingFiles = []) => {
    setSaving(true);

    try {
      let vendorId;

      if (modalMode === "edit" && selectedVendor) {
        const id = getId(selectedVendor);
        if (!id) { toast.error("Vendor id missing"); return; }
        await vendorApi.update(id, payload);
        vendorId = id;
        toast.success("Vendor updated");
      } else {
        const res = await vendorApi.create(payload);
        const data = res?.data || res;
        vendorId = data?._id || data?.vendor?._id;
        toast.success("Vendor created");
      }

      if (vendorId && pendingFiles.length > 0) {
        for (const { file, title } of pendingFiles) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("title", title || file.name);
            await vendorApi.uploadDocument(vendorId, fd);
          } catch {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      closeVendorModal();
      await loadVendors();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (modalMode === "edit" ? "Failed to update vendor" : "Failed to create vendor"),
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditVendor = (row) => {
    setModalMode("edit");
    setSelectedVendor(row);
    setVendorModal(true);
  };

  const openDeleteVendor = (row) => {
    setDeleteTarget(row);
    setDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteModal(false);
  };

  const deleteVendor = async () => {
    const id = getId(deleteTarget);

    if (!id) {
      toast.error("Vendor id missing");
      return;
    }

    setSaving(true);

    try {
      const deleteFn =
        vendorApi.deleteVendor ||
        vendorApi.delete ||
        vendorApi.remove ||
        vendorApi.deleteById;

      if (!deleteFn) {
        toast.error("Delete API function is not available");
        return;
      }

      await deleteFn(id);
      toast.success("Vendor deleted");

      closeDeleteModal();
      await loadVendors();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete vendor");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => vendors, [vendors]);

  const columns = [
    {
      key: "vendorName",
      header: "Vendor Details",
      render: (row) => (
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
            {row.vendorName || row.displayName || row.companyName || "-"}
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
          label={row.vendorType || "Business"}
          variant="outlined"
          sx={{ fontSize: 12 }}
        />
      ),
    },
    {
      key: "payable",
      header: "Payable",
      align: "right",
      render: (row) => money(row?.summary?.remainingPayment || row.remainingPayment || 0),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      render: (row) => money(row?.summary?.totalPaymentMade || row.totalPaymentMade || 0),
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
              navigate(`/vendors/${getId(row)}`);
            }}
          >
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openEditVendor(row);
            }}
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteVendor(row);
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
          title="Active Vendors"
          subtitle="Create and manage vendor records, payables, and linked bank debits."
          count={vendors.length}
          loading={loading}
          onRefresh={loadVendors}
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
                    Vendors
                  </Typography>
                  <Chip size="small" label="Zoho-style list" variant="outlined" />
                </Stack>
              </Box>

              <DataTable
                columns={columns}
                rows={rows}
                loading={loading}
                loadingText="Loading vendors..."
                emptyText="No vendors found. Click New Vendor to add one."
                onRowClick={(row) => navigate(`/vendors/${getId(row)}`)}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <CustomerFormModal
        open={vendorModal}
        type="vendor"
        mode={modalMode}
        value={modalMode === "edit" ? selectedVendor : null}
        saving={saving}
        onClose={closeVendorModal}
        onSubmit={handleSubmitVendor}
      />

      <Modal
        open={deleteModal}
        onClose={closeDeleteModal}
        title="Delete Vendor"
        maxBodyHeight="50vh"
        footer={
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
            <Button variant="outline" onClick={closeDeleteModal} disabled={saving}>
              Cancel
            </Button>

            <Button variant="danger" onClick={deleteVendor} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        }
      >
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Are you sure you want to delete{" "}
          <b>
            {deleteTarget?.vendorName ||
              deleteTarget?.displayName ||
              deleteTarget?.companyName ||
              "this vendor"}
          </b>
          ?
        </Alert>
      </Modal>
    </AppShell>
  );
}