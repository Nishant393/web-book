import { EMPTY_ADDR, EMPTY_CP } from "./constants";

export function getConfig(type) {
  const isVendor = type === "vendor";

  return {
    isVendor,
    nameKey: isVendor ? "vendorName" : "customerName",
    typeKey: isVendor ? "vendorType" : "customerType",
    langKey: isVendor ? "vendorLanguage" : "customerLanguage",
    payableKey: isVendor ? "accountsPayable" : "accountsReceivable",
    payableLabel: isVendor ? "Accounts Payable" : "Accounts Receivable",
    label: isVendor ? "Vendor" : "Customer",
    gstText: isVendor
      ? "Prefill Vendor details from the GST portal using the Vendor's GSTIN."
      : "Prefill Customer details from the GST portal using the Customer's GSTIN.",
    portalText: isVendor
      ? "Allow portal access for this vendor"
      : "Allow portal access for this customer",
    empty: {
      [isVendor ? "vendorType" : "customerType"]: "Business",
      salutation: "",
      firstName: "",
      lastName: "",
      companyName: "",
      [isVendor ? "vendorName" : "customerName"]: "",
      displayName: "",
      email: "",
      workPhone: "",
      mobile: "",
      [isVendor ? "vendorLanguage" : "customerLanguage"]: "English",
      gstNumber: "",
      pan: "",
      currency: "INR - Indian Rupee",
      [isVendor ? "accountsPayable" : "accountsReceivable"]: "",
      openingBalance: "",
      paymentTerms: "Due on Receipt",
      enablePortal: false,
      billing: { ...EMPTY_ADDR },
      shipping: { ...EMPTY_ADDR },
      contactPersons: [],
      remarks: "",
    },
  };
}

export function mergeForm(type, value) {
  const cfg = getConfig(type);

  const base = {
    ...cfg.empty,
    billing: { ...EMPTY_ADDR },
    shipping: { ...EMPTY_ADDR },
    contactPersons: [],
  };

  if (!value) return base;

  const name =
    value[cfg.nameKey] ||
    value.vendorName ||
    value.customerName ||
    value.displayName ||
    "";

  let billing = { ...EMPTY_ADDR };

  if (value.billing && typeof value.billing === "object") {
    billing = { ...EMPTY_ADDR, ...value.billing };
  } else if (value.billingAddress || value.address) {
    billing = {
      ...EMPTY_ADDR,
      street1: value.billingAddress || value.address || "",
      city: value.city || "",
      state: value.state || "",
    };
  }

  let shipping = { ...EMPTY_ADDR };

  if (value.shipping && typeof value.shipping === "object") {
    shipping = { ...EMPTY_ADDR, ...value.shipping };
  } else if (value.shippingAddress) {
    shipping = {
      ...EMPTY_ADDR,
      street1: value.shippingAddress || "",
    };
  }

  return {
    ...base,
    ...value,
    [cfg.nameKey]: name,
    displayName: value.displayName || name,
    [cfg.langKey]: value[cfg.langKey] || value.language || "English",
    currency: value.currency
      ? value.currency.includes(" ")
        ? value.currency
        : `${value.currency} - Indian Rupee`
      : "INR - Indian Rupee",
    billing,
    shipping,
    contactPersons: Array.isArray(value.contactPersons)
      ? value.contactPersons.map((cp) => ({
          ...EMPTY_CP,
          ...cp,
          workPhone: cp.workPhone || cp.phone || "",
        }))
      : [],
    openingBalance: value.openingBalance ?? "",
  };
}

export function buildSubmitPayload(form, cfg) {
  const displayName = String(form.displayName || form[cfg.nameKey] || "").trim();

  const billingStr = [form.billing?.street1, form.billing?.street2]
    .filter(Boolean)
    .join(", ");

  const shippingStr = [form.shipping?.street1, form.shipping?.street2]
    .filter(Boolean)
    .join(", ");

  return {
    ...form,
    [cfg.nameKey]: displayName,
    displayName,
    language: form[cfg.langKey],
    address: billingStr,
    billingAddress: billingStr,
    shippingAddress: shippingStr,
    city: form.billing?.city || "",
    state: form.billing?.state || "",
    openingBalance:
      form.openingBalance === "" ? 0 : Number(form.openingBalance),
  };
}