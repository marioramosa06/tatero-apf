import test from "node:test";
import assert from "node:assert/strict";
import {
    cancelQueuedOperation,
    clearDailyDraft,
    enqueueCreateInvoice,
    enqueueDeleteInvoice,
    enqueueUpdateInvoice,
    exportOfflineBackupData,
    getCachedInvoicesInRange,
    getOfflineStats,
    getPendingCount,
    getPendingQueue,
    importOfflineBackupData,
    loadDailyDraft,
    mergeCachedInvoices,
    readCachedInvoices,
    saveDailyDraft,
    setLastSyncedAt,
    syncOfflineQueue
} from "./offlineStore.js";

const createMemoryStorage = () => {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
};

test("offlineStore queues create, edits pending create in-place, and cancels when deleted", () => {
    const storage = createMemoryStorage();

    const created = enqueueCreateInvoice(
        { date: "2026-11-14", nbP: 10, nbOf: 10, amount: 30000, averageCost: 3000, comment: "" },
        storage
    );
    assert.equal(getPendingCount(storage), 1);
    assert.equal(created.pendingSync, true);
    assert.equal(readCachedInvoices(storage).length, 1);

    const updated = enqueueUpdateInvoice(
        created._id,
        { date: "2026-11-14", nbP: 12, nbOf: 12, amount: 36000, averageCost: 3000, comment: "Ajusté" },
        created,
        storage
    );
    assert.equal(getPendingCount(storage), 1);
    assert.equal(updated.amount, 36000);
    assert.equal(getPendingQueue(storage)[0].payload.comment, "Ajusté");

    enqueueDeleteInvoice(created._id, storage);
    assert.equal(getPendingCount(storage), 0);
    assert.equal(readCachedInvoices(storage).length, 0);
});

test("mergeCachedInvoices preserves out-of-range cached items and pending operations", () => {
    const storage = createMemoryStorage();

    mergeCachedInvoices(
        [{ _id: "oct-1", date: "2026-10-15T00:00:00.000Z", nbP: 5, nbOf: 5, amount: 15000 }],
        { startDate: "2026-10-01", endDate: "2026-10-31" },
        storage
    );

    enqueueCreateInvoice(
        { date: "2026-11-10", nbP: 8, nbOf: 8, amount: 24000, averageCost: 3000, comment: "Hors ligne" },
        storage
    );

    mergeCachedInvoices(
        [{ _id: "nov-1", date: "2026-11-05T00:00:00.000Z", nbP: 6, nbOf: 6, amount: 18000 }],
        { startDate: "2026-11-01", endDate: "2026-11-30" },
        storage
    );

    const all = readCachedInvoices(storage);
    assert.equal(all.length, 3);
    assert.equal(getCachedInvoicesInRange("2026-11-01", "2026-11-30", storage).length, 2);
});

test("syncOfflineQueue replays queued create, update, and delete operations sequentially", async () => {
    const storage = createMemoryStorage();

    mergeCachedInvoices(
        [
            { _id: "srv-1", date: "2026-11-02", nbP: 5, nbOf: 5, amount: 15000 },
            { _id: "srv-2", date: "2026-11-03", nbP: 4, nbOf: 4, amount: 12000 }
        ],
        null,
        storage
    );

    enqueueCreateInvoice(
        { date: "2026-11-14", nbP: 7, nbOf: 7, amount: 21000, averageCost: 3000, comment: "" },
        storage
    );
    enqueueUpdateInvoice(
        "srv-1",
        { date: "2026-11-02", nbP: 6, nbOf: 6, amount: 18000, averageCost: 3000, comment: "Maj" },
        { _id: "srv-1" },
        storage
    );
    enqueueDeleteInvoice("srv-2", storage);

    assert.equal(getPendingCount(storage), 3);

    const calls = [];
    const fakeFetch = async (url, options = {}) => {
        calls.push({ url, method: options.method });
        if (options.method === "POST") {
            return {
                ok: true,
                status: 201,
                json: async () => ({ _id: "srv-created-99", date: "2026-11-14", nbP: 7, nbOf: 7, amount: 21000 })
            };
        }
        if (options.method === "PUT") {
            return {
                ok: true,
                status: 200,
                json: async () => ({ _id: "srv-1", date: "2026-11-02", nbP: 6, nbOf: 6, amount: 18000, comment: "Maj" })
            };
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({ message: "Deleted" })
        };
    };

    const result = await syncOfflineQueue({
        token: "jwt-token",
        fetchImpl: fakeFetch,
        storage
    });

    assert.equal(result.synced, 3);
    assert.equal(result.remaining, 0);
    assert.equal(result.error, null);
    assert.equal(calls.map((c) => c.method).join(","), "POST,PUT,DELETE");

    const cached = readCachedInvoices(storage);
    assert.equal(cached.length, 2);
    assert.equal(cached[0]._id, "srv-created-99");
    assert.equal(cached[0].pendingSync, false);
    assert.ok(getOfflineStats(storage).lastSyncedAt);
});

test("cancelQueuedOperation cleanly reverts pending create, update, and delete operations", () => {
    const storage = createMemoryStorage();
    mergeCachedInvoices(
        [
            { _id: "srv-a", date: "2026-11-01", nbP: 5, nbOf: 5, amount: 15000, comment: "Orig" },
            { _id: "srv-b", date: "2026-11-02", nbP: 4, nbOf: 4, amount: 12000, comment: "" }
        ],
        null,
        storage
    );

    enqueueCreateInvoice(
        { date: "2026-11-03", nbP: 3, nbOf: 3, amount: 9000, comment: "" },
        storage
    );
    enqueueUpdateInvoice("srv-a", { amount: 25000, comment: "Edited" }, null, storage);
    enqueueDeleteInvoice("srv-b", storage);

    const queue = getPendingQueue(storage);
    assert.equal(queue.length, 3);

    // Cancel create -> removes temp invoice
    assert.equal(cancelQueuedOperation(queue[0].queueId, storage), true);
    assert.equal(readCachedInvoices(storage).some((i) => i.date === "2026-11-03"), false);

    // Cancel update -> restores previous amount & comment
    assert.equal(cancelQueuedOperation(queue[1].queueId, storage), true);
    const restoredA = readCachedInvoices(storage).find((i) => i._id === "srv-a");
    assert.equal(restoredA.amount, 15000);
    assert.equal(restoredA.comment, "Orig");
    assert.equal(restoredA.pendingSync, false);

    // Cancel delete -> restores deleted invoice
    assert.equal(cancelQueuedOperation(queue[2].queueId, storage), true);
    assert.equal(readCachedInvoices(storage).some((i) => i._id === "srv-b"), true);
    assert.equal(getPendingCount(storage), 0);
});

test("daily draft persistence and offline JSON backup export/import work end-to-end", () => {
    const sourceStorage = createMemoryStorage();
    assert.equal(loadDailyDraft(sourceStorage), null);

    saveDailyDraft({ date: "2026-11-15", nbP: "14", nbOf: "12", amount: "42000", comment: "" }, sourceStorage);
    const restored = loadDailyDraft(sourceStorage);
    assert.equal(restored.nbP, "14");
    assert.equal(restored.amount, "42000");

    clearDailyDraft(sourceStorage);
    assert.equal(loadDailyDraft(sourceStorage), null);

    setLastSyncedAt("2026-11-15T12:00:00.000Z", sourceStorage);
    mergeCachedInvoices(
        [{ _id: "srv-10", date: "2026-11-10", nbP: 10, nbOf: 10, amount: 30000 }],
        null,
        sourceStorage
    );
    enqueueCreateInvoice(
        { date: "2026-11-15", nbP: 9, nbOf: 8, amount: 27000, averageCost: 3000, comment: "" },
        sourceStorage
    );

    const backup = exportOfflineBackupData(sourceStorage);
    assert.equal(backup.invoices.length, 2);
    assert.equal(backup.pendingQueue.length, 1);

    const targetStorage = createMemoryStorage();
    const importResult = importOfflineBackupData(backup, targetStorage);
    assert.equal(importResult.importedCount, 2);
    assert.equal(importResult.totalCached, 2);
    assert.equal(importResult.pendingCount, 1);
    assert.throws(() => importOfflineBackupData({ foo: "bar" }, targetStorage));
});
