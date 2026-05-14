// Add these imports in App.jsx / router file
import { Navigate } from "react-router-dom";
import BanksPage from "./pages/BanksPage";
import BankDetailPage from "./pages/BankDetailPage";

// Add these routes inside <Routes>
<Route path="/banks" element={<BanksPage />} />
<Route path="/banks/:id" element={<BankDetailPage />} />
<Route path="/statements" element={<Navigate to="/banks" replace />} />
