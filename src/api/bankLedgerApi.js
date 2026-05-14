import axios from "axios";

const cleanBase = (value) => String(value || "").trim().replace(/\/$/, "");

const API_BASE =
  cleanBase(import.meta.env.VITE_CRM_API_URL) ||
  cleanBase(import.meta.env.VITE_BANK_API_BASE_URL) ||
  cleanBase(import.meta.env.VITE_LEDGER_API_BASE_URL) ||
  cleanBase(import.meta.env.VITE_API_BASE_URL) ||
  cleanBase(import.meta.env.VITE_AUTH_BASE_URL) ||
  "";

function getAuthToken() {
  try {
    return (
      localStorage.getItem("crm_token") ||
      sessionStorage.getItem("crm_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      JSON.parse(localStorage.getItem("loginData") || "null")?.token ||
      JSON.parse(sessionStorage.getItem("loginData") || "null")?.token ||
      ""
    );
  } catch {
    return "";
  }
}

const bankLedgerAxios = axios.create({
  baseURL: API_BASE,
});

bankLedgerAxios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrap = (res) => res?.data;

export const ledgerApi = {
  getHeadTypes: () => bankLedgerAxios.get("/api/ledger/head-types").then(unwrap),
  seedDefaultSubHeads: () => bankLedgerAxios.post("/api/ledger/sub-heads/seed-defaults").then(unwrap),
  createSubHead: (payload) => bankLedgerAxios.post("/api/ledger/sub-heads", payload).then(unwrap),
  listSubHeads: (params = {}) => bankLedgerAxios.get("/api/ledger/sub-heads", { params }).then(unwrap),
  updateSubHead: (subHeadId, payload) =>
    bankLedgerAxios.patch(`/api/ledger/sub-heads/${subHeadId}`, payload).then(unwrap),
  deleteSubHead: (subHeadId) => bankLedgerAxios.delete(`/api/ledger/sub-heads/${subHeadId}`).then(unwrap),
};

export const bankStatementApi = {
  uploadAndExtractPreview: (formData) =>
    bankLedgerAxios
      .post("/api/bank-statements/upload-extract-preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),
  confirmImport: (payload) => bankLedgerAxios.post("/api/bank-statements/confirm-import", payload).then(unwrap),
  uploadAndExtractStatement: (formData) =>
    bankLedgerAxios
      .post("/api/bank-statements/upload-extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),
  listStatements: (params = {}) => bankLedgerAxios.get("/api/bank-statements", { params }).then(unwrap),
  getStatementById: (statementId) => bankLedgerAxios.get(`/api/bank-statements/${statementId}`).then(unwrap),
  deleteDraftStatement: (statementId) => bankLedgerAxios.delete(`/api/bank-statements/${statementId}`).then(unwrap),
  getStatementTransactions: (statementId, params = {}) =>
    bankLedgerAxios.get(`/api/bank-statements/${statementId}/transactions`, { params }).then(unwrap),
  getAccountTransactions: (accountNumberMasked, params = {}) =>
    bankLedgerAxios
      .get(`/api/bank-statements/account/${encodeURIComponent(accountNumberMasked)}/transactions`, { params })
      .then(unwrap),
  updateTransactionMapping: (transactionId, payload) =>
    bankLedgerAxios.patch(`/api/bank-statements/transactions/${transactionId}/mapping`, payload).then(unwrap),
  bulkUpdateTransactionMapping: (payload) =>
    bankLedgerAxios.patch("/api/bank-statements/transactions/bulk-mapping", payload).then(unwrap),
  validateStatement: (statementId) => bankLedgerAxios.post(`/api/bank-statements/${statementId}/validate`).then(unwrap),
  checkDuplicateTransactions: (statementId) =>
    bankLedgerAxios.post(`/api/bank-statements/${statementId}/check-duplicates`).then(unwrap),
  approveStatement: (statementId) => bankLedgerAxios.post(`/api/bank-statements/${statementId}/approve`).then(unwrap),
};

export default bankLedgerAxios;
