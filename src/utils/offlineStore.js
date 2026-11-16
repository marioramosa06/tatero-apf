const CACHE_INVOICES_KEY = "tatero_offline_invoices_v1";
const CACHE_PROFILE_KEY = "tatero_offline_profile_v1";
const OFFLINE_QUEUE_KEY = "tatero_offline_queue_v1";
const OFFLINE_META_KEY = "tatero_offline_meta_v1";
const DAILY_DRAFT_KEY = "tatero_daily_draft_v1";

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

const removeItem = (key, storage) => {
    const store = getStorage(storage);
    if (!store) return;
    try {
        store.removeItem(key);
    } catch {
        // Ignore storage errors
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

export const getOfflineMeta = (storage) => {
    const meta = readJson(OFFLINE_META_KEY, {}, storage);
    return meta && typeof meta === "object" ? meta : {};
};

export const setLastSyncedAt = (isoString = new Date().toISOString(), storage) => {
    const meta = getOfflineMeta(storage);
    const nextMeta = { ...meta, lastSyncedAt: isoString };
    writeJson(OFFLINE_META_KEY, nextMeta, storage);
    emitWindowEvent(OFFLINE_CHANGE_EVENT, {
        pendingCount: getPendingCount(storage),
        lastSyncedAt: isoString
    });
    return nextMeta;
};

export const getLastSyncedAt = (storage) => getOfflineMeta(storage).lastSyncedAt || null;

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
    emitWindowEvent(OFFLINE_CHANGE_EVENT, {
        pendingCount: list.length,
        lastSyncedAt: getLastSyncedAt(storage)
    });
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
    const cached = readCachedInvoices(storage);
    const cachedOriginal = cached.find((inv) => getInvoiceKey(inv) === idStr) || existingInvoice;

    const updatedInvoice = {
        ...cachedOriginal,
        ...payload,
        _id: cachedOriginal?._id ?? idStr,
        id: cachedOriginal?.id ?? idStr,
        updatedAt: new Date().toISOString(),
        pendingSync: true
    };

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

    const previousOp = queue.find((op) => op.type === "update" && String(op.invoiceId) === idStr);
    const previousInvoice = previousOp?.previousInvoice || cachedOriginal || null;
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
                previousInvoice: previousInvoice ? { ...previousInvoice, pendingSync: false } : null,
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
    const deletedInvoice = cached.find((inv) => getInvoiceKey(inv) === idStr) || null;
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

    const previousOp = queue.find((op) => String(op.invoiceId) === idStr);
    const snapshot = previousOp?.previousInvoice || deletedInvoice;
    const filteredQueue = queue.filter((op) => String(op.invoiceId) !== idStr);
    writePendingQueue(
        [
            ...filteredQueue,
            {
                queueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: "delete",
                invoiceId: idStr,
                previousInvoice: snapshot ? { ...snapshot, pendingSync: false } : null,
                createdAt: new Date().toISOString()
            }
        ],
        storage
    );
};

export const cancelQueuedOperation = (queueId, storage) => {
    const queue = getPendingQueue(storage);
    const target = queue.find((op) => op.queueId === queueId);
    if (!target) return false;

    const nextQueue = queue.filter((op) => op.queueId !== queueId);
    const cached = readCachedInvoices(storage);

    if (target.type === "create") {
        writeCachedInvoices(
            cached.filter((inv) => getInvoiceKey(inv) !== String(target.invoiceId)),
            storage
        );
    } else if (target.type === "update") {
        const restored = target.previousInvoice
            ? { ...target.previousInvoice, pendingSync: false }
            : null;
        if (restored) {
            writeCachedInvoices(
                cached.map((inv) =>
                    getInvoiceKey(inv) === String(target.invoiceId) ? restored : inv
                ),
                storage
            );
        } else {
            writeCachedInvoices(
                cached.map((inv) =>
                    getInvoiceKey(inv) === String(target.invoiceId)
                        ? { ...inv, pendingSync: false }
                        : inv
                ),
                storage
            );
        }
    } else if (target.type === "delete" && target.previousInvoice) {
        const idStr = String(target.invoiceId);
        const alreadyPresent = cached.some((inv) => getInvoiceKey(inv) === idStr);
        if (!alreadyPresent) {
            writeCachedInvoices(
                [{ ...target.previousInvoice, pendingSync: false }, ...cached],
                storage
            );
        }
    }

    writePendingQueue(nextQueue, storage);
    emitWindowEvent(OFFLINE_SYNC_COMPLETE_EVENT, { synced: 0, cancelled: true });
    return true;
};

export const saveDailyDraft = (draft, storage) => {
    if (!draft || typeof draft !== "object") return;
    writeJson(
        DAILY_DRAFT_KEY,
        {
            date: draft.date || "",
            nbP: draft.nbP ?? "",
            nbOf: draft.nbOf ?? "",
            amount: draft.amount ?? "",
            comment: draft.comment ?? "",
            updatedAt: new Date().toISOString()
        },
        storage
    );
};

export const loadDailyDraft = (storage) => {
    const draft = readJson(DAILY_DRAFT_KEY, null, storage);
    if (!draft || typeof draft !== "object") return null;
    const hasContent =
        Boolean(String(draft.nbP ?? "").trim()) ||
        Boolean(String(draft.nbOf ?? "").trim()) ||
        Boolean(String(draft.amount ?? "").trim()) ||
        Boolean(String(draft.comment ?? "").trim());
    return hasContent ? draft : null;
};

export const clearDailyDraft = (storage) => {
    removeItem(DAILY_DRAFT_KEY, storage);
};

export const getOfflineStats = (storage) => ({
    cachedCount: readCachedInvoices(storage).length,
    pendingCount: getPendingCount(storage),
    lastSyncedAt: getLastSyncedAt(storage),
    hasDraft: Boolean(loadDailyDraft(storage))
});

export const exportOfflineBackupData = (storage) => ({
    version: 1,
    app: "Tatero",
    exportedAt: new Date().toISOString(),
    lastSyncedAt: getLastSyncedAt(storage),
    profile: getCachedProfile(storage),
    invoices: readCachedInvoices(storage),
    pendingQueue: getPendingQueue(storage)
});

export const importOfflineBackupData = (backup, storage) => {
    if (!backup || typeof backup !== "object") {
        throw new Error("Fichier de sauvegarde invalide.");
    }

    const incomingInvoices = Array.isArray(backup)
        ? backup
        : Array.isArray(backup.invoices)
            ? backup.invoices
            : null;

    if (!incomingInvoices) {
        throw new Error("Aucune facture valide détectée dans cette sauvegarde.");
    }

    const validInvoices = incomingInvoices.filter(
        (item) => item && typeof item === "object" && /^\d{4}-\d{2}-\d{2}/.test(String(item.date || ""))
    );

    const existing = readCachedInvoices(storage);
    const byId = new Map();

    existing.forEach((inv) => {
        const key = getInvoiceKey(inv) || `${toDateKey(inv.date)}-${inv.amount}-${inv.nbP}`;
        byId.set(key, inv);
    });

    let importedCount = 0;
    validInvoices.forEach((inv, idx) => {
        const key = getInvoiceKey(inv) || `import-${toDateKey(inv.date)}-${idx}`;
        if (!byId.has(key)) {
            importedCount += 1;
        }
        byId.set(key, { ...inv });
    });

    const existingQueue = getPendingQueue(storage);
    let nextQueue = [...existingQueue];
    if (Array.isArray(backup.pendingQueue)) {
        const seenQueueIds = new Set(existingQueue.map((op) => op.queueId));
        for (const op of backup.pendingQueue) {
            if (op && typeof op === "object" && op.queueId && !seenQueueIds.has(op.queueId)) {
                nextQueue.push(op);
                seenQueueIds.add(op.queueId);
            }
        }
    }

    const merged = applyQueueToInvoices(Array.from(byId.values()), nextQueue);
    writeCachedInvoices(merged, storage);
    writePendingQueue(nextQueue, storage);
    emitWindowEvent(OFFLINE_SYNC_COMPLETE_EVENT, { synced: 0, imported: importedCount });

    return {
        importedCount,
        totalCached: merged.length,
        pendingCount: nextQueue.length
    };
};

export const clearOfflineUserCache = (storage) => {
    removeItem(CACHE_INVOICES_KEY, storage);
    removeItem(CACHE_PROFILE_KEY, storage);
    removeItem(OFFLINE_QUEUE_KEY, storage);
    removeItem(OFFLINE_META_KEY, storage);
    removeItem(DAILY_DRAFT_KEY, storage);
    emitWindowEvent(OFFLINE_CHANGE_EVENT, { pendingCount: 0, lastSyncedAt: null });
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
            setLastSyncedAt(new Date().toISOString(), storage);
            emitWindowEvent(OFFLINE_SYNC_COMPLETE_EVENT, { synced });
        }

        return { synced, remaining: 0, error: null };
    };

    activeSyncPromise = run().finally(() => {
        activeSyncPromise = null;
    });

    return activeSyncPromise;
};
