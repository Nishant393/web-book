import axios from "axios";

const cleanBase = (value) => String(value || "").trim().replace(/\/+$/, "");

function normalizeBaseUrl(value) {
  const base = cleanBase(value);
  return base;
}

const API_BASE =
  normalizeBaseUrl(import.meta.env.VITE_CRM_API_URL) ||
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ||
  normalizeBaseUrl(import.meta.env.VITE_AUTH_BASE_URL) ||
  "";

function apiPath(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (/\/api$/i.test(API_BASE)) {
    return cleanPath.replace(/^\/api/i, "");
  }

  return cleanPath;
}

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

export const customerVendorAxios = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

customerVendorAxios.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const unwrap = (res) => res?.data;

function extractList(payload) {
  const data = payload?.data || payload?.result || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.vendors)) return data.vendors;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getPagination(payload) {
  const data = payload?.data || payload?.result || payload;
  const pagination = data?.pagination || {};
  const page = Number(pagination.page || data?.page || 1);
  const pages = Number(pagination.pages || data?.pages || 1);

  return {
    page,
    pages,
    total: Number(pagination.total || data?.total || 0),
    hasNext: Boolean(pagination.hasNext || data?.hasNext || page < pages),
  };
}

async function listAll(endpoint, params = {}) {
  const first = await customerVendorAxios
    .get(apiPath(endpoint), {
      params: {
        limit: 1000,
        page: 1,
        ...params,
      },
    })
    .then(unwrap);

  let rows = extractList(first);
  const pagination = getPagination(first);

  if (!pagination.hasNext || pagination.pages <= 1) {
    return rows;
  }

  for (let page = 2; page <= pagination.pages; page += 1) {
    const next = await customerVendorAxios
      .get(apiPath(endpoint), {
        params: {
          limit: 1000,
          ...params,
          page,
        },
      })
      .then(unwrap);

    rows = [...rows, ...extractList(next)];
  }

  return rows;
}

export const customerApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/customers"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/customers", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/customers"), payload).then(unwrap),

  getById: (customerId) =>
    customerVendorAxios.get(apiPath(`/api/customers/${customerId}`)).then(unwrap),

  update: (customerId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/customers/${customerId}`), payload).then(unwrap),

  delete: (customerId) =>
    customerVendorAxios.delete(apiPath(`/api/customers/${customerId}`)).then(unwrap),

  addSalesOrder: (customerId, payload) =>
    customerVendorAxios
      .post(apiPath(`/api/customers/${customerId}/sales-orders`), payload)
      .then(unwrap),

  updateSalesOrder: (customerId, orderId, payload) =>
    customerVendorAxios
      .patch(apiPath(`/api/customers/${customerId}/sales-orders/${orderId}`), payload)
      .then(unwrap),

  deleteSalesOrder: (customerId, orderId) =>
    customerVendorAxios
      .delete(apiPath(`/api/customers/${customerId}/sales-orders/${orderId}`))
      .then(unwrap),

  uploadDocument: (customerId, formData) =>
    customerVendorAxios
      .post(apiPath(`/api/customers/${customerId}/documents`), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  addBankAccount: (customerId, payload) =>
    customerVendorAxios
      .post(apiPath(`/api/customers/${customerId}/bank-accounts`), payload)
      .then(unwrap),

  deleteBankAccount: (customerId, bankAccountId) =>
    customerVendorAxios
      .delete(apiPath(`/api/customers/${customerId}/bank-accounts/${bankAccountId}`))
      .then(unwrap),
};

export const vendorApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/vendors"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/vendors", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/vendors"), payload).then(unwrap),

  getById: (vendorId) =>
    customerVendorAxios.get(apiPath(`/api/vendors/${vendorId}`)).then(unwrap),

  update: (vendorId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/vendors/${vendorId}`), payload).then(unwrap),

  delete: (vendorId) =>
    customerVendorAxios.delete(apiPath(`/api/vendors/${vendorId}`)).then(unwrap),

  addPurchaseOrder: (vendorId, payload) =>
    customerVendorAxios
      .post(apiPath(`/api/vendors/${vendorId}/purchase-orders`), payload)
      .then(unwrap),

  updatePurchaseOrder: (vendorId, orderId, payload) =>
    customerVendorAxios
      .patch(apiPath(`/api/vendors/${vendorId}/purchase-orders/${orderId}`), payload)
      .then(unwrap),

  deletePurchaseOrder: (vendorId, orderId) =>
    customerVendorAxios
      .delete(apiPath(`/api/vendors/${vendorId}/purchase-orders/${orderId}`))
      .then(unwrap),

  uploadDocument: (vendorId, formData) =>
    customerVendorAxios
      .post(apiPath(`/api/vendors/${vendorId}/documents`), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  addBankAccount: (vendorId, payload) =>
    customerVendorAxios
      .post(apiPath(`/api/vendors/${vendorId}/bank-accounts`), payload)
      .then(unwrap),

  deleteBankAccount: (vendorId, bankAccountId) =>
    customerVendorAxios
      .delete(apiPath(`/api/vendors/${vendorId}/bank-accounts/${bankAccountId}`))
      .then(unwrap),
};

export const salesOrderApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/sales-orders"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/sales-orders", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/sales-orders"), payload).then(unwrap),

  getById: (orderId) =>
    customerVendorAxios.get(apiPath(`/api/sales-orders/${orderId}`)).then(unwrap),

  update: (orderId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/sales-orders/${orderId}`), payload).then(unwrap),

  delete: (orderId) =>
    customerVendorAxios.delete(apiPath(`/api/sales-orders/${orderId}`)).then(unwrap),
};

export const purchaseOrderApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/purchase-orders"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/purchase-orders", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/purchase-orders"), payload).then(unwrap),

  getById: (orderId) =>
    customerVendorAxios.get(apiPath(`/api/purchase-orders/${orderId}`)).then(unwrap),

  update: (orderId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/purchase-orders/${orderId}`), payload).then(unwrap),

  delete: (orderId) =>
    customerVendorAxios.delete(apiPath(`/api/purchase-orders/${orderId}`)).then(unwrap),
};

export const invoiceApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/invoices"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/invoices", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/invoices"), payload).then(unwrap),

  getById: (invoiceId) =>
    customerVendorAxios.get(apiPath(`/api/invoices/${invoiceId}`)).then(unwrap),

  update: (invoiceId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/invoices/${invoiceId}`), payload).then(unwrap),

  delete: (invoiceId) =>
    customerVendorAxios.delete(apiPath(`/api/invoices/${invoiceId}`)).then(unwrap),
};

export const billApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/bills"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/bills", params),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/bills"), payload).then(unwrap),

  getById: (billId) =>
    customerVendorAxios.get(apiPath(`/api/bills/${billId}`)).then(unwrap),

  update: (billId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/bills/${billId}`), payload).then(unwrap),

  delete: (billId) =>
    customerVendorAxios.delete(apiPath(`/api/bills/${billId}`)).then(unwrap),
};

export const proformaInvoiceApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/proforma-invoices"), { params }).then(unwrap),

  listAll: (params = {}) => listAll("/api/proforma-invoices", params),

  getById: (proformaId) =>
    customerVendorAxios.get(apiPath(`/api/proforma-invoices/${proformaId}`)).then(unwrap),

  update: (proformaId, payload) =>
    customerVendorAxios.put(apiPath(`/api/proforma-invoices/${proformaId}`), payload).then(unwrap),

  recordPayment: (proformaId, payload) =>
    customerVendorAxios.post(apiPath(`/api/proforma-invoices/${proformaId}/record-payment`), payload).then(unwrap),

  convertToTaxInvoice: (proformaId) =>
    customerVendorAxios.post(apiPath(`/api/proforma-invoices/${proformaId}/convert-to-tax-invoice`)).then(unwrap),
};

export const paymentApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/payments"), { params }).then(unwrap),

  getById: (paymentId) =>
    customerVendorAxios.get(apiPath(`/api/payments/${paymentId}`)).then(unwrap),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/payments"), payload).then(unwrap),
};

// Extended sales order API with new cycle actions
export const salesOrderCycleApi = {
  convertToProforma: (orderId) =>
    customerVendorAxios.post(apiPath(`/api/sales-orders/${orderId}/convert-to-proforma`)).then(unwrap),

  createDeliveryChallan: (orderId, payload) =>
    customerVendorAxios.post(apiPath(`/api/sales-orders/${orderId}/create-delivery-challan`), payload).then(unwrap),

  createInstallationChallan: (orderId, payload) =>
    customerVendorAxios.post(apiPath(`/api/sales-orders/${orderId}/create-installation-challan`), payload).then(unwrap),
};
const SEND_MEDIA_URL =
  normalizeBaseUrl(import.meta.env.VITE_SEND_MEDIA_URL) ||
  "https://dev.esmbackend.click/api/message/api/v1/support/send-media";

export const sendMediaApi = {
  send: (formData) => {
    const token = getAuthToken();

    return axios
      .post(SEND_MEDIA_URL, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
      })
      .then(unwrap);
  },
};