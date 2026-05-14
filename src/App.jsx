import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPages";
import BanksPage from "./pages/BanksPage";
import BankDetailPage from "./pages/BankDetailPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import VendorsPage from "./pages/VendorsPage";
import VendorDetailPage from "./pages/VendorDetailPage";
import ZohoFormPage from "./pages/ZohoFormPage";
import SimpleModulePage from "./pages/SimpleModulePage";
import RequireAuth from "./auth/RequireAuth";

function Protected({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}

export default function App() {
  const baseUrl = import.meta.env.VITE_BASE_URL || "/";
  const basename = String(baseUrl).replace(/\/$/, "") || "/";

  return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter basename={basename === "/" ? undefined : basename}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/banks" element={<Protected><BanksPage /></Protected>} />
          <Route path="/banks/:id" element={<Protected><BankDetailPage /></Protected>} />

          <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
          <Route path="/customers/:id" element={<Protected><CustomerDetailPage /></Protected>} />
          <Route path="/vendors" element={<Protected><VendorsPage /></Protected>} />
          <Route path="/vendors/:id" element={<Protected><VendorDetailPage /></Protected>} />

          <Route path="/sales-orders" element={<Protected><SimpleModulePage title="Sales Orders" button="New Sales Order" /></Protected>} />
          <Route path="/sales-orders/new" element={<Protected><ZohoFormPage mode="sales-order" /></Protected>} />
          <Route path="/invoices" element={<Protected><SimpleModulePage title="Invoices" button="New Invoice" /></Protected>} />
          <Route path="/invoices/new" element={<Protected><ZohoFormPage mode="invoice" /></Protected>} />
          <Route path="/download-receipt" element={<Protected><SimpleModulePage title="Download Receipt" button="Download" /></Protected>} />

          <Route path="/purchase-orders" element={<Protected><SimpleModulePage title="Purchase Orders" button="New Purchase Order" /></Protected>} />
          <Route path="/purchase-orders/new" element={<Protected><ZohoFormPage mode="purchase-order" /></Protected>} />
          <Route path="/bills" element={<Protected><SimpleModulePage title="Bills" button="New Bill" /></Protected>} />
          <Route path="/bills/new" element={<Protected><ZohoFormPage mode="bill" /></Protected>} />
          <Route path="/expenses" element={<Protected><SimpleModulePage title="Expenses" button="New Expense" /></Protected>} />
          <Route path="/expenses/new" element={<Protected><ZohoFormPage mode="expense" /></Protected>} />
          <Route path="/reports" element={<Protected><SimpleModulePage title="Reports" button="Create Report" /></Protected>} />
          <Route path="/documents" element={<Protected><SimpleModulePage title="Documents" button="Upload Document" /></Protected>} />

          <Route path="/statements" element={<Navigate to="/banks" replace />} />
          <Route path="/bank-statements" element={<Navigate to="/banks" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
