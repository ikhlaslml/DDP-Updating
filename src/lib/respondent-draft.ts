"use client";

const DATABASE = "ddp-updating-drafts";
const STORE = "respondent";

export type RespondentDraft = { nama: string; photo: File | null; updatedAt: number };

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
    tx.onerror = () => reject(tx.error);
  });
}

export function getRespondentDraft(key: string) {
  return transaction<RespondentDraft | undefined>("readonly", (store) => store.get(key));
}

export function saveRespondentDraft(key: string, draft: RespondentDraft) {
  return transaction<IDBValidKey>("readwrite", (store) => store.put(draft, key));
}

export function clearRespondentDraft(key: string) {
  return transaction<undefined>("readwrite", (store) => store.delete(key));
}
