const STORAGE_KEY = "moneyiq_documents_v1";

const safeJson = (value, fallback) => {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
};

export function getDocuments(module) {
  const all = safeJson(localStorage.getItem(STORAGE_KEY), []);
  return all.filter((item) => item.module === module);
}

export function getAllDocuments() {
  return safeJson(localStorage.getItem(STORAGE_KEY), []);
}

export function saveDocument(record) {
  const all = getAllDocuments();
  const saved = {
    id: record.id || crypto?.randomUUID?.() || String(Date.now()),
    createdAt: new Date().toISOString(),
    ...record,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...all]));
  return saved;
}

export function removeDocument(id) {
  const all = getAllDocuments();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(all.filter((item) => String(item.id) !== String(id)))
  );
}


