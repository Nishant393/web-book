import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ThemeCustomization from "./theme/ThemeCustomization";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeCustomization>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeCustomization>
    </AppErrorBoundary>
  </React.StrictMode>
);
