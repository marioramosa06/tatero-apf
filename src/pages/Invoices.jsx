import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Check,
    FilePlus,
    Pencil,
    Search,
    Trash2,
    X
} from "lucide-react";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";
import { getAuthHeaders } from "../utils/authHeaders";
import {
    filterInvoices,
    formatInvoiceDate,
    formatNumber,
    getInvoiceAverageCost,
    groupInvoicesByMonthAndWeek,
    toDateKey
} from "../utils/invoiceGrouping";
import "../styles/Invoices.css";

const Invoices = () => {
    const { token } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [onlyHighAvg, setOnlyHighAvg] = useState(false);

    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editFormData, setEditFormData] = useState(null);
    const [editError, setEditError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchInvoices = useCallback(async (signal) => {
        const response = await fetch("https://api-tatero-apf.vercel.app/api/invoices", {
            headers: getAuthHeaders(token),
            signal
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
            }
            throw new Error(data?.error || data?.message || "Impossible de charger les factures.");
        }

        const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.invoices)
                ? data.invoices
                : null;

        if (!list) {
            throw new Error("La réponse du serveur est invalide.");
        }

        return list;
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();

        fetchInvoices(controller.signal)
            .then((list) => {
                setInvoices(list);
                setError(null);
            })
            .catch((requestError) => {
                if (requestError.name !== "AbortError") {
                    const message = requestError.message || "";
                    setError(
                        message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")
                            ? "Impossible de joindre le serveur. Vérifiez votre connexion Internet, puis réessayez."
                            : message || "Impossible de charger les factures."
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [fetchInvoices]);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        fetchInvoices()
            .then((list) => {
                setInvoices(list);
            })
            .catch((requestError) => {
                setError(requestError.message || "Impossible de charger les factures.");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const filteredInvoices = useMemo(
        () => filterInvoices(invoices, { searchQuery, onlyHighAvg }),
        [invoices, searchQuery, onlyHighAvg]
    );

    const groupedMonths = useMemo(
        () => groupInvoicesByMonthAndWeek(filteredInvoices),
        [filteredInvoices]
    );

    const totalSavedAmount = useMemo(
        () => invoices.reduce((sum, inv) => sum + Math.round(Number(inv.amount) || 0), 0),
        [invoices]
    );

    const openEditModal = (invoice) => {
        setEditingInvoice(invoice);
        setEditFormData({
            ...invoice,
            date: toDateKey(invoice.date),
            nbP: invoice.nbP ?? "",
            nbOf: invoice.nbOf ?? "",
            amount: invoice.amount ?? "",
            comment: invoice.comment || ""
        });
        setEditError(null);
    };

    const closeEditModal = () => {
        if (isSaving) return;
        setEditingInvoice(null);
        setEditFormData(null);
        setEditError(null);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError(null);
        if (!editFormData || !editingInvoice) return;

        if (!editFormData.date) {
            setEditError("Veuillez sélectionner une date.");
            return;
        }
        if (editFormData.nbP === "" || !Number.isInteger(Number(editFormData.nbP)) || Number(editFormData.nbP) < 0) {
            setEditError("Veuillez saisir un nombre de patients valide.");
            return;
        }
        if (editFormData.nbOf === "" || !Number.isInteger(Number(editFormData.nbOf)) || Number(editFormData.nbOf) < 0) {
            setEditError("Veuillez saisir un nombre d'ordonnances valide.");
            return;
        }
        if (editFormData.amount === "" || !Number.isFinite(Number(editFormData.amount)) || Number(editFormData.amount) < 0) {
            setEditError("Veuillez saisir un montant valide.");
            return;
        }

        const patients = Number(editFormData.nbP);
        const amount = Number(editFormData.amount);
        const updatedAvg = patients > 0 ? Math.round(amount / patients) : 0;

        if (updatedAvg > 3500 && !editFormData.comment?.trim()) {
            setEditError("Veuillez saisir un commentaire pour ce coût moyen supérieur à 3 500 Ar.");
            return;
        }

        const invoiceId = editingInvoice._id ?? editingInvoice.id;
        if (!invoiceId) {
            setEditError("Impossible d'identifier cette facture.");
            return;
        }

        const payload = {
            date: editFormData.date,
            nbP: patients,
            nbOf: Number(editFormData.nbOf),
            amount,
            averageCost: updatedAvg,
            comment: editFormData.comment?.trim() || ""
        };

        setIsSaving(true);
        try {
            const response = await fetch(
                `https://api-tatero-apf.vercel.app/api/invoices/${encodeURIComponent(invoiceId)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeaders(token)
                    },
                    body: JSON.stringify(payload)
                }
            );
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data?.error) {
                throw new Error(data?.error || data?.message || "Impossible d'enregistrer les modifications.");
            }

            const updatedInvoice = {
                ...editingInvoice,
                ...payload,
                ...data,
                _id: data._id ?? editingInvoice._id,
                id: data.id ?? data._id ?? editingInvoice.id,
                averageCost: data.averageCost ?? updatedAvg
            };

            setInvoices((prev) =>
                prev.map((inv) =>
                    String(inv._id ?? inv.id) === String(invoiceId) ? updatedInvoice : inv
                )
            );
            setEditingInvoice(null);
            setEditFormData(null);
            setEditError(null);
        } catch (err) {
            setEditError(err.message || "Impossible d'enregistrer les modifications.");
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteModal = (invoice) => {
        setDeleteTarget(invoice);
        setDeleteError(null);
    };

    const closeDeleteModal = () => {
        if (isDeleting) return;
        setDeleteTarget(null);
        setDeleteError(null);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const invoiceId = deleteTarget._id ?? deleteTarget.id;
        if (!invoiceId) {
            setDeleteError("Impossible d'identifier cette facture.");
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);
        try {
            const response = await fetch(
                `https://api-tatero-apf.vercel.app/api/invoices/${encodeURIComponent(invoiceId)}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders(token)
                }
            );
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data?.error) {
                throw new Error(data?.error || data?.message || "Impossible de supprimer cette facture.");
            }

            setInvoices((prev) =>
                prev.filter((inv) => String(inv._id ?? inv.id) !== String(invoiceId))
            );
            setDeleteTarget(null);
            setDeleteError(null);
        } catch (err) {
            setDeleteError(err.message || "Impossible de supprimer cette facture.");
        } finally {
            setIsDeleting(false);
        }
    };

    const editPatients = Number(editFormData?.nbP) || 0;
    const editAmount = Number(editFormData?.amount) || 0;
    const editComputedAvg = editPatients > 0 ? Math.round(editAmount / editPatients) : 0;
    const isEditHighAvg = editComputedAvg > 3500;

    return (
        <>
            <div className="invoices-page report-container">
                <header className="report-header">
                    <Link to="/dashboard" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour au tableau de bord
                    </Link>
                    <div className="invoices-header-row">
                        <div className="header-title-wrapper">
                            <p className="report-kicker">Historique complet</p>
                            <h1 className="report-title">Toutes les factures</h1>
                            <p className="report-subtitle">
                                Consultez, modifiez ou supprimez l'ensemble de vos factures enregistrées, classées par mois et par semaine.
                            </p>
                        </div>
                        <Link to="/invoices/new" className="invoices-new-btn">
                            <FilePlus size={16} aria-hidden="true" />
                            <span>Nouvelle facture</span>
                        </Link>
                    </div>
                </header>

                <section className="invoices-toolbar" aria-label="Filtrer les factures">
                    <div className="invoices-search-field">
                        <Search className="invoices-search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher par mois, date ou remarque..."
                            aria-label="Rechercher une facture"
                        />
                    </div>

                    <div className="invoices-toolbar-right">
                        <button
                            type="button"
                            className={`invoices-filter-toggle${onlyHighAvg ? " is-active" : ""}`}
                            onClick={() => setOnlyHighAvg((prev) => !prev)}
                            aria-pressed={onlyHighAvg}
                        >
                            Coût moyen &gt; 3 500 Ar
                        </button>
                        {!loading && !error && (
                            <p className="invoices-toolbar-count tabular-nums">
                                {filteredInvoices.length} / {invoices.length} factures
                                <span aria-hidden="true"> · </span>
                                {formatNumber(totalSavedAmount)} Ar au total
                            </p>
                        )}
                    </div>
                </section>

                {error && (
                    <div className="invoices-error-box" role="alert">
                        <span>{error}</span>
                        <button type="button" className="invoices-retry-btn" onClick={handleRetry}>
                            Réessayer
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="invoices-skeleton-list" role="status" aria-label="Chargement des factures">
                        <span className="sr-only">Chargement des factures...</span>
                        {[1, 2].map((block) => (
                            <div className="invoices-skeleton-card" key={block} aria-hidden="true">
                                <div className="skeleton-line invoices-skeleton-title" />
                                <div className="skeleton-line invoices-skeleton-row" />
                                <div className="skeleton-line invoices-skeleton-row" />
                                <div className="skeleton-line invoices-skeleton-row" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && !error && invoices.length === 0 && (
                    <div className="no-data">
                        <span>Aucune facture enregistrée pour le moment.</span>
                        <Link to="/invoices/new" className="invoices-new-btn">
                            <FilePlus size={16} aria-hidden="true" />
                            <span>Enregistrer une première facture</span>
                        </Link>
                    </div>
                )}

                {!loading && !error && invoices.length > 0 && groupedMonths.length === 0 && (
                    <div className="no-data">
                        <span>Aucune facture ne correspond à votre recherche.</span>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                                setSearchQuery("");
                                setOnlyHighAvg(false);
                            }}
                        >
                            Réinitialiser les filtres
                        </button>
                    </div>
                )}

                {!loading && !error && groupedMonths.length > 0 && (
                    <div className="invoices-months-stack">
                        {groupedMonths.map((month) => (
                            <section className="invoices-month-section" key={month.monthKey} aria-labelledby={`month-${month.monthKey}`}>
                                <div className="invoices-month-separator">
                                    <h2 id={`month-${month.monthKey}`}>{month.label}</h2>
                                    <p className="invoices-month-meta tabular-nums">
                                        {month.count} {month.count > 1 ? "factures" : "facture"}
                                        <span aria-hidden="true"> · </span>
                                        {formatNumber(month.totalPatients)} patients
                                        <span aria-hidden="true"> · </span>
                                        <strong>{formatNumber(month.totalAmount)} Ar</strong>
                                    </p>
                                </div>

                                <div className="invoices-weeks-stack">
                                    {month.weeks.map((week) => (
                                        <article className="invoices-week-card" key={week.weekKey}>
                                            <div className="invoices-week-header">
                                                <h3>{week.label}</h3>
                                                <p className="invoices-week-meta tabular-nums">
                                                    {week.items.length} {week.items.length > 1 ? "factures" : "facture"}
                                                    <span aria-hidden="true"> · </span>
                                                    {formatNumber(week.totalPatients)} patients
                                                    <span aria-hidden="true"> · </span>
                                                    <span>{formatNumber(week.totalAmount)} Ar</span>
                                                </p>
                                            </div>

                                            <div className="table-responsive">
                                                <table className="invoices-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th className="num-col">Patients</th>
                                                            <th className="num-col">Ordonnances</th>
                                                            <th className="num-col">Montant</th>
                                                            <th className="num-col">Coût moyen</th>
                                                            <th className="actions-col">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {week.items.map((inv) => {
                                                            const dateKey = toDateKey(inv.date);
                                                            const avg = getInvoiceAverageCost(inv);
                                                            const isHigh = avg > 3500;
                                                            const invId = inv._id ?? inv.id ?? dateKey;

                                                            return (
                                                                <tr key={invId}>
                                                                    <td className="invoices-date-cell">
                                                                        <div className="invoices-date-stack">
                                                                            <span className="invoices-date-main">{formatInvoiceDate(dateKey)}</span>
                                                                            {inv.comment && (
                                                                                <span className="invoices-comment-note">{inv.comment}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="nb-cell" data-label="Patients">{formatNumber(inv.nbP)}</td>
                                                                    <td className="nb-cell" data-label="Ordonnances">{formatNumber(inv.nbOf)}</td>
                                                                    <td className="amount-cell" data-label="Montant">{formatNumber(inv.amount)} Ar</td>
                                                                    <td className={`avg-cell ${isHigh ? "avg-high" : ""}`} data-label="Coût moyen">
                                                                        {formatNumber(avg)} Ar
                                                                        {isHigh && <span className="avg-flag">(Élevé)</span>}
                                                                    </td>
                                                                    <td className="invoices-actions-cell">
                                                                        <div className="invoices-row-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="row-action-btn"
                                                                                onClick={() => openEditModal(inv)}
                                                                                aria-label={`Modifier la facture du ${dateKey}`}
                                                                                title="Modifier"
                                                                            >
                                                                                <Pencil size={15} aria-hidden="true" />
                                                                                <span>Modifier</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="row-action-btn row-action-danger"
                                                                                onClick={() => openDeleteModal(inv)}
                                                                                aria-label={`Supprimer la facture du ${dateKey}`}
                                                                                title="Supprimer"
                                                                            >
                                                                                <Trash2 size={15} aria-hidden="true" />
                                                                                <span>Supprimer</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {editingInvoice && editFormData && (
                    <div className="modal-backdrop" onClick={closeEditModal}>
                        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Modifier la facture</h3>
                                <button type="button" className="close-btn" onClick={closeEditModal} aria-label="Fermer" disabled={isSaving}>
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="modal-body" noValidate>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="edit-invoice-date">Date</label>
                                        <input
                                            id="edit-invoice-date"
                                            type="date"
                                            value={editFormData.date}
                                            disabled={isSaving}
                                            onChange={(e) => {
                                                setEditError(null);
                                                setEditFormData((prev) => ({ ...prev, date: e.target.value }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="edit-invoice-nbp">Nombre de patients</label>
                                        <input
                                            id="edit-invoice-nbp"
                                            type="number"
                                            min="0"
                                            value={editFormData.nbP}
                                            disabled={isSaving}
                                            onChange={(e) => {
                                                setEditError(null);
                                                setEditFormData((prev) => ({ ...prev, nbP: e.target.value }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="edit-invoice-nbof">Ordonnances</label>
                                        <input
                                            id="edit-invoice-nbof"
                                            type="number"
                                            min="0"
                                            value={editFormData.nbOf}
                                            disabled={isSaving}
                                            onChange={(e) => {
                                                setEditError(null);
                                                setEditFormData((prev) => ({ ...prev, nbOf: e.target.value }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="edit-invoice-amount">Montant total (Ar)</label>
                                        <input
                                            id="edit-invoice-amount"
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={editFormData.amount}
                                            disabled={isSaving}
                                            onChange={(e) => {
                                                setEditError(null);
                                                setEditFormData((prev) => ({ ...prev, amount: e.target.value }));
                                            }}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label htmlFor="edit-invoice-avg">Coût moyen calculé</label>
                                        <input
                                            id="edit-invoice-avg"
                                            type="text"
                                            value={`${formatNumber(editComputedAvg)} Ar`}
                                            readOnly
                                            className={`readonly-input${isEditHighAvg ? " is-high" : ""}`}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label htmlFor="edit-invoice-comment">
                                            {`Commentaire${isEditHighAvg ? " (Requis : coût moyen > 3 500 Ar)" : ""}`}
                                        </label>
                                        <textarea
                                            id="edit-invoice-comment"
                                            rows="3"
                                            value={editFormData.comment}
                                            disabled={isSaving}
                                            placeholder={isEditHighAvg ? "Veuillez justifier ce coût moyen élevé..." : "Ajouter un commentaire si nécessaire..."}
                                            onChange={(e) => {
                                                setEditError(null);
                                                setEditFormData((prev) => ({ ...prev, comment: e.target.value }));
                                            }}
                                        />
                                    </div>

                                    {editError && <div className="alert error full-width" role="alert">{editError}</div>}
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={closeEditModal} disabled={isSaving}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="submit-btn" disabled={isSaving}>
                                        <Check size={16} aria-hidden="true" />
                                        {isSaving ? "Enregistrement..." : "Enregistrer"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {deleteTarget && (
                    <div className="modal-backdrop" onClick={closeDeleteModal}>
                        <div className="modal-card modal-card-compact" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Supprimer la facture</h3>
                                <button type="button" className="close-btn" onClick={closeDeleteModal} aria-label="Fermer" disabled={isDeleting}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <p className="delete-confirm-text">
                                    Voulez-vous vraiment supprimer la facture du{" "}
                                    <strong>{formatInvoiceDate(toDateKey(deleteTarget.date))}</strong> pour un montant de{" "}
                                    <strong className="tabular-nums">{formatNumber(deleteTarget.amount)} Ar</strong> ?
                                </p>
                                <p className="delete-confirm-warning">
                                    Cette action est définitive et supprimera la facture de votre historique.
                                </p>

                                {deleteError && <div className="alert error" role="alert">{deleteError}</div>}

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        className="danger-btn"
                                        onClick={handleConfirmDelete}
                                        disabled={isDeleting}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                        {isDeleting ? "Suppression..." : "Supprimer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default Invoices;
