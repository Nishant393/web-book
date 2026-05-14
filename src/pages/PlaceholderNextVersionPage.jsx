import React from "react";
import { Box, Paper, Stack, Typography, Chip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StickyHeaderShell from "../components/StickyHeaderShell";
import { HistoricalUiStyles } from "../styles/powerUi";

const copy = {
  vendors: {
    title: "Vendors",
    icon: StorefrontRoundedIcon,
    description:
      "Vendor master, vendor ledger mapping, PO linkage, payment advice, and payable ageing will be added in the next version.",
  },
  customers: {
    title: "Customers",
    icon: GroupsRoundedIcon,
    description:
      "Customer master, receivable mapping, invoice linkage, payment receipts, and customer ageing will be added in the next version.",
  },
};

export default function PlaceholderNextVersionPage({ type = "vendors" }) {
  const theme = useTheme();
  const page = copy[type] || copy.vendors;
  const Icon = page.icon;

  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={{ minHeight: "100%", p: { xs: 0.5, sm: 1, md: 1.5 } }}>
        <Box sx={{ maxWidth: 1180, mx: "auto" }}>
          <Stack spacing={2}>
            <StickyHeaderShell boxSx={{ top: 0, pt: 0, pb: 1 }} paperSx={{ px: 2, py: 1.5 }}>
              <PageHeader
                title={page.title}
                action={
                  <Button variant="outline" startIcon={<UpdateRoundedIcon />}>
                    Next Version
                  </Button>
                }
              />
            </StickyHeaderShell>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3, md: 4 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  right: -80,
                  bottom: -100,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              />

              <Stack spacing={2} sx={{ position: "relative", zIndex: 1, maxWidth: 760 }}>
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Icon fontSize="large" />
                </Box>

                <Stack spacing={1}>
                  <Chip
                    label="Future Update"
                    sx={{ width: "fit-content", fontWeight: 700, color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 650, color: "text.primary" }}>
                    {page.title} will be available in the next version
                  </Typography>
                  <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                    {page.description}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </AppShell>
  );
}
