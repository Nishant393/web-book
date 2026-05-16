import React, { useMemo } from "react";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { Landmark, TrendingDown, TrendingUp, WalletCards, FolderKanban, CreditCard } from "lucide-react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import { HistoricalUiStyles } from "../styles/powerUi";
import { Card, PAGE_PAD_SX, PAGE_SX, PageBar, SimpleLineChart, ZohoStat, money } from "./businessUtils.jsx";

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m, i) => ({ label: m, income: [0, 9000, 6800, 13200, 11400, 16000, 9200, 18400, 15000, 22000, 17600, 24600][i], balance: [4200, 5200, 4900, 7000, 6400, 8200, 7800, 10000, 9400, 12400, 11200, 13500][i] }));
const accounts = [
  { name: "Nishant Pawar", account: "xxxx3080", uncategorized: "75 transactions", bank: 1469.17, books: 1469.17 },
  { name: "Petty Cash", account: "Cash", uncategorized: "0 transactions", bank: -7000, books: -7000 },
  { name: "Undeposited Funds", account: "System", uncategorized: "0 transactions", bank: 0, books: 0 },
];

export default function DashboardPage() {
  const totals = useMemo(() => ({ receivable: 145000, payable: 82500, bank: 1469.17, cash: -7000, income: 246000, expense: 114000 }), []);
  return (
    <AppShell>
      <HistoricalUiStyles />
      <Box sx={PAGE_SX}>
        <PageBar title="Dashboard" subtitle="Accounting overview with demo values. Live API analytics can be added later.">
          <Button variant="outline">This Fiscal Year</Button>
        </PageBar>
        <Box sx={PAGE_PAD_SX}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card title="Total Receivables" action={<Button variant="text">+ New</Button>} sx={{ height: "100%" }}>
                <Stack spacing={2}>
                  <Typography sx={{ fontSize: 13, color: "#4b5563" }}>Total Unpaid Invoices</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 600 }}>{money(totals.receivable)}</Typography>
                  <Box sx={{ height: 10, bgcolor: "#f1f3f7", borderRadius: 99 }}><Box sx={{ width: "62%", height: "100%", bgcolor: "#4088ff", borderRadius: 99 }} /></Box>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.25 }}>Current</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#4088ff" }}>{money(85000)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.25 }}>Overdue</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#ef4444" }}>{money(60000)}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card title="Total Payables" action={<Button variant="text">+ New</Button>} sx={{ height: "100%" }}>
                <Stack spacing={2}>
                  <Typography sx={{ fontSize: 13, color: "#4b5563" }}>Total Unpaid Bills</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 600 }}>{money(totals.payable)}</Typography>
                  <Box sx={{ height: 10, bgcolor: "#f1f3f7", borderRadius: 99 }}><Box sx={{ width: "48%", height: "100%", bgcolor: "#f59e0b", borderRadius: 99 }} /></Box>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.25 }}>Current</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>{money(42500)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "#667085", mb: 0.25 }}>Overdue</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#ef4444" }}>{money(40000)}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card title="Cash Flow" action={<Button variant="text">This Fiscal Year</Button>}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={9}><SimpleLineChart data={months} greenKey="income" grayKey="balance" height={275} /></Grid>
                  <Grid item xs={12} md={3}>
                    <Stack spacing={2}>
                      <ZohoStat label="Cash in Hand" value={money(totals.cash)} accent="#9aa1b5" icon={<WalletCards />} />
                      <ZohoStat label="Bank Balance" value={money(totals.bank)} accent="#18b779" icon={<Landmark />} />
                      <ZohoStat label="Incoming" value={`${money(65000)} (+)`} accent="#18b779" />
                      <ZohoStat label="Outgoing" value={`${money(41500)} (-)`} accent="#ef4444" />
                    </Stack>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card title="Income and Expense" action={<Button variant="text">Accrual</Button>}>
                <Stack direction="row" spacing={4} sx={{ mb: 2 }}><Typography sx={{ fontSize: 13 }}><Box component="span" sx={{ color: "#18b779" }}>■</Box> Total Income<br /><b>{money(totals.income)}</b></Typography><Typography sx={{ fontSize: 13 }}><Box component="span" sx={{ color: "#ef4444" }}>■</Box> Total Expenses<br /><b>{money(totals.expense)}</b></Typography></Stack>
                <SimpleLineChart data={months.map((m, i) => ({ ...m, income: m.income, balance: [2000, 4000, 5200, 6200, 5400, 7200, 9000, 10800, 12000, 10300, 9800, 11400][i] }))} height={230} />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card title="Top Expenses" action={<Button variant="text">This Fiscal Year</Button>}>
                <Stack spacing={2} sx={{ minHeight: 275, justifyContent: "center", alignItems: "center" }}><TrendingDown color="#ef4444" /><Typography sx={{ color: "#667085" }}>No expense recorded for this fiscal year</Typography></Stack>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}><Card title="Projects"><Stack direction="row" spacing={1.5} alignItems="center"><FolderKanban color="#4088ff" /><Typography className="zoho-muted">Project profitability module will appear here.</Typography></Stack></Card></Grid>
            <Grid item xs={12} md={6}><Card title="Bank and Credit Cards"><Stack direction="row" spacing={1.5} alignItems="center"><CreditCard color="#18b779" /><Typography className="zoho-muted">Connected bank accounts and balances are summarized here.</Typography></Stack></Card></Grid>
            <Grid item xs={12}>
              <Card title="Active Accounts">
                <DataTable columns={[{ key: "name", header: "Account Details", render: (r) => <Stack><Typography sx={{ color: "#1f6ff2", fontSize: 13 }}>{r.name}</Typography><Typography sx={{ fontSize: 12, color: "#667085" }}>{r.account}</Typography></Stack> }, { key: "uncategorized", header: "Uncategorized", render: (r) => <Typography sx={{ color: r.uncategorized.startsWith("0") ? "#667085" : "#ef4444", fontSize: 13 }}>{r.uncategorized}</Typography> }, { key: "bank", header: "Amount in Bank", align: "right", render: (r) => money(r.bank) }, { key: "books", header: "Amount in Books", align: "right", render: (r) => money(r.books) }]} rows={accounts} minWidth={900} />
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </AppShell>
  );
}
