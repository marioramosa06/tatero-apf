const CACHE_INVOICES_KEY = "tatero_offline_invoices_v1";
const CACHE_PROFILE_KEY = "tatero_offline_profile_v1";
const OFFLINE_QUEUE_KEY = "tatero_offline_queue_v1";

export const OFFLINE_CHANGE_EVENT = "tatero:offline-change";
export const OFFLINE_SYNC_COMPLETE_EVENT = "tatero:sync-complete";

const getStorage = (storage) => {
    if (storage) return storage;
    if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
    }
    return null;
};

const emitWindowEvent = (eventName, detail = {}) => {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
};

const readJson = (key, fallback, storage) => {
    const store = getStorage(storage);
    if (!store) return fallback;
    try {
        const raw = store.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

const writeJson = (key, value, storage) => {
    const store = getStorage(storage);
    if (!store) return;
    try {
        store.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage quota errors
    }
};

const getInvoiceKey = (invoice) => String(invoice?._id ?? invoice?.id ?? "");
const toDateKey = (value) => String(value || "").slice(0, 10);

const sortInvoicesDesc = (list) =>
    [...list].sort((a, b) => {
        const dateCmp = toDateKey(b?.date).localeCompare(toDateKey(a?.date));
        if (dateCmp !== 0) return dateCmp;
        const timeA = new Date(a?.updatedAt || a?.createdAt || 0).getTime() || 0;
        const timeB = new Date(b?.updatedAt || b?.createdAt || 0).getTime() || 0;
        return timeB - timeA;
    });

export const isOfflineTempId = (id) => String(id || "").startsWith("offline-");

export const readCachedInvoices = (storage) => {
    const list = readJson(CACHE_INVOICES_KEY, [], storage);
    return Array.isArray(list) ? list : [];
};

export const writeCachedInvoices = (invoices, storage) => {
    const sorted = sortInvoicesDesc(Array.isArray(invoices) ? invoices : []);
    writeJson(CACHE_INVOICES_KEY, sorted, storage);
    return sorted;
};

export const getPendingQueue = (storage) => {
    const queue = readJson(OFFLINE_QUEUE_KEY, [], storage);
    return Array.isArray(queue) ? queue : [];
};

export const writePendingQueue = (queue, storage) => {
    const list = Array.isArray(queue) ? queue : [];
    writeJson(OFFLINE_QUEUE_KEY, list, storage);
    emitWindowEvent(OFFLINE_CHANGE_EVENT, { pendingCount: list.length });
    return list;
};

export const getPendingCount = (storage) => getPendingQueue(storage).length;

export const applyQueueToInvoices = (invoices, queue) => {
    let result = Array.isArray(invoices) ? [...invoices] : [];

    for (const op of queue) {
        if (op.type === "create" && op.invoice) {
            const exists = result.some((item) => getInvoiceKey(item) === getInvoiceKey(op.invoice));
            if (!exists) {
                result.push(op.invoice);
            }
        } else if (op.type === "update" && op.invoiceId) {
            result = result.map((item) =>
                getInvoiceKey(item) === String(op.invoiceId)
                    ? { ...item, ...op.payload, pendingSync: true }
                    : item
            );
        } else if (op.type === "delete" && op.invoiceId) {
            result = result.filter((item) => getInvoiceKey(item) !== String(op.invoiceId));
        }
    }

    return sortInvoicesDesc(result);
};

export const mergeCachedInvoices = (freshList, rangeBounds = null, storage) => {
    const existing = readCachedInvoices(storage);
    const queue = getPendingQueue(storage);
    const syncedFresh = (Array.isArray(freshList) ? freshList : []).map((inv) => ({
        ...inv,
        pendingSync: false
    }));

    let merged;
    if (rangeBounds && rangeBounds.startDate && rangeBounds.endDate) {
        const { startDate, endDate } = rangeBounds;
        const outsideRange = existing.filter((inv) => {
            if (inv?.pendingSync) return false;
            const key = toDateKey(inv?.date);
            return key < startDate || key > endDate;
        });
        merged = [...outsideRange, ...syncedFresh];
    } else {
        merged = [...syncedFresh];
    }

    const withQueue = applyQueueToInvoices(merged, queue);
    return writeCachedInvoices(withQueue, storage);
};

export const getCachedInvoicesInRange = (startDate, endDate, storage) => {
    const cached = readCachedInvoices(storage);
    const filtered = cached.filter((inv) => {
        const key = toDateKey(inv?.date);
        return (!startDate || key >= startDate) && (!endDate || key <= endDate);
    });
    return sortInvoicesDesc(filtered);
};

export const saveCachedProfile = (profile, storage) => {
    if (!profile) return;
    writeJson(CACHE_PROFILE_KEY, profile, storage);
};

export const getCachedProfile = (storage) => readJson(CACHE_PROFILE_KEY, null, storage);

export const enqueueCreateInvoice = (payload, storage) => {
    const nowIso = new Date().toISOString();
    const tempId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localInvoice = {
        ...payload,
        _id: tempId,
        id: tempId,
        createdAt: nowIso,
        updatedAt: nowIso,
        pendingSync: true
    };

    const cached = readCachedInvoices(storage);
    writeCachedInvoices([localInvoice, ...cached], storage);

    const queue = getPendingQueue(storage);
    writePendingQueue(
        [
            ...queue,
            {
                queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: "create",
                invoiceId: tempId,
                payload,
                invoice: localInvoice,
                createdAt: nowIso
            }
        ],
        storage
    );

    return localInvoice;
};

export const enqueueUpdateInvoice = (invoiceId, payload, existingInvoice = {}, storage) => {
    const idStr = String(invoiceId);
    const updatedInvoice = {
        ...existingInvoice,
        ...payload,
        _id: existingInvoice?._id ?? idStr,
        id: existingInvoice?.id ?? idStr,
        updatedAt: new Date().toISOString(),
        pendingSync: true
    };

    const cached = readCachedInvoices(storage);
    const foundInCache = cached.some((inv) => getInvoiceKey(inv) === idStr);
    const nextCached = foundInCache
        ? cached.map((inv) => (getInvoiceKey(inv) === idStr ? updatedInvoice : inv))
        : [updatedInvoice, ...cached];
    writeCachedInvoices(nextCached, storage);

    const queue = getPendingQueue(storage);

    if (isOfflineTempId(idStr)) {
        const nextQueue = queue.map((op) =>
            op.type === "create" && String(op.invoiceId) === idStr
                ? {
                    ...op,
                    payload: { ...op.payload, ...payload },
                    invoice: updatedInvoice
                }
                : op
        );
        writePendingQueue(nextQueue, storage);
        return updatedInvoice;
    }

    const filteredQueue = queue.filter(
        (op) => !(op.type === "update" && String(op.invoiceId) === idStr)
    );
    writePendingQueue(
        [
            ...filteredQueue,
            {
                queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: "update",
                invoiceId: idStr,
                payload,
                createdAt: new Date().toISOString()
            }
        ],
        storage
    );

    return updatedInvoice;
};

export const enqueueDeleteInvoice = (invoiceId, storage) => {
    const idStr = String(invoiceId);
    const cached = readCachedInvoices(storage);
    writeCachedInvoices(
        cached.filter((inv) => getInvoiceKey(inv) !== idStr),
        storage
    );

    const queue = getPendingQueue(storage);
    if (isOfflineTempId(idStr)) {
        writePendingQueue(
            queue.filter((op) => String(op.invoiceId) !== idStr),
            storage
        );
        return;
    }

    const filteredQueue = queue.filter((op) => String(op.invoiceId) !== idStr);
    writePendingQueue(
        [
            ...filteredQueue,
            {
                queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: "delete",
                invoiceId: idStr,
                createdAt: new Date().toISOString()
            }
        ],
        storage
    );
};

export const clearOfflineUserCache = (storage) => {
    const store = getStorage(storage);
    if (!store) return;
    try {
        store.removeItem(CACHE_INVOICES_KEY);
        store.removeItem(CACHE_PROFILE_KEY);
        store.removeItem(OFFLINE_QUEUE_KEY);
    } catch {
        // Ignore storage errors
    }
    emitWindowEvent(OFFLINE_CHANGE_EVENT, { pendingCount: 0 });
};

let activeSyncPromise = null;

export const syncOfflineQueue = async ({
    token,
    apiBase = "https://api-tatero-apf.vercel.app/api",
    fetchImpl = typeof fetch !== "undefined" ? fetch : null,
    storage
} = {}) => {
    if (activeSyncPromise) return activeSyncPromise;

    const run = async () => {
        const queue = getPendingQueue(storage);
        if (!token || queue.length === 0 || !fetchImpl) {
            return { synced: 0, remaining: queue.length, error: null };
        }

        let synced = 0;
        const remaining = [...queue];

        while (remaining.length > 0) {
            const op = remaining[0];
            try {
                if (op.type === "create") {
                    const response = await fetchImpl(`${apiBase}/invoices`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(op.payload)
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok || data?.error) {
                        throw new Error(data?.error || data?.message || `Erreur serveur (${response.status})`);
                    }

                    const cached = readCachedInvoices(storage);
                    const savedInvoice = {
                        ...(op.invoice || {}),
                        ...data,
                        _id: data._id ?? data.id ?? op.invoiceId,
                        id: data.id ?? data._id ?? op.invoiceId,
                        pendingSync: false
                    };
                    writeCachedInvoices(
                        cached.map((inv) =>
                            getInvoiceKey(inv) === String(op.invoiceId) ? savedInvoice : inv
                        ),
                        storage
                    );
                } else if (op.type === "update") {
                    const response = await fetchImpl(
                        `${apiBase}/invoices/${encodeURIComponent(op.invoiceId)}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify(op.payload)
                        }
                    );
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok || data?.error) {
                        throw new Error(data?.error || data?.message || `Erreur serveur (${response.status})`);
                    }

                    const cached = readCachedInvoices(storage);
                    writeCachedInvoices(
                        cached.map((inv) =>
                            getInvoiceKey(inv) === String(op.invoiceId)
                                ? { ...inv, ...op.payload, ...data, pendingSync: false }
                                : inv
                        ),
                        storage
                    );
                } else if (op.type === "delete") {
                    const response = await fetchImpl(
                        `${apiBase}/invoices/${encodeURIComponent(op.invoiceId)}`,
                        {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                    if (!response.ok && response.status !== 404) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data?.error || data?.message || `Erreur serveur (${response.status})`);
                    }
                }

                remaining.shift();
                synced += 1;
                writePendingQueue(remaining, storage);
            } catch (err) {
                return {
                    synced,
                    remaining: remaining.length,
                    error: err.message || "Synchronisation interrompue."
                };
            }
        }

        if (synced > 0) {
            emitWindowEvent(OFFLINE_SYNC_COMPLETE_EVENT, { synced });
        }

        return { synced, remaining: 0, error: null };
    };

    activeSyncPromise = run().finally(() => {
        activeSyncPromise = null;
    });

    return activeSyncPromise;
};
