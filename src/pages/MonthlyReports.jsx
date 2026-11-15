import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    X,
    Check,
    FileText,
    CalendarDays,
    ArrowLeft,
    Download,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import "../styles/MonthlyReports.css";
import Footer from "../components/Footer";
import { fetchInvoicesRangeWithCache, fetchProfileWithCache } from "../utils/invoiceApi";
import { OFFLINE_SYNC_COMPLETE_EVENT } from "../utils/offlineStore";
import { exportPDF } from "../utils/exportReport";
import useAuth from "../hooks/useAuth";

const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const shiftYearMonth = (yearMonth, deltaMonths) => {
    const [year, month] = String(yearMonth).split("-").map(Number);
    const shifted = new Date(year, month - 1 + deltaMonths, 1);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
};

const getInvoiceDate = (dateValue) => {
    const [year, month, day] = String(dateValue).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
};

const formatDateFr = (dateStr) => {
    const d = getInvoiceDate(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const MonthlyReports = () => {
    const { token, user } = useAuth();
    const today = new Date();
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [invoices, setInvoices] = useState([]);

    const [activeModal, setActiveModal] = useState(null);
    const [modalFormData, setModalFormData] = useState(null);
    const [modalError, setModalError] = useState(null);

    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [profileUser, setProfileUser] = useState(null);
    const hasEditedCsbRef = useRef(false);
    const [exportForm, setExportForm] = useState({
        sdsp: "NOSY-VARIKA",
        csb: user?.workAt || ""
    });

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();

        const fetchUserWorkAt = async () => {
            try {
                const profile = await fetchProfileWithCache({
                    token,
                    signal: controller.signal
                });
                if (!profile) return;

                setProfileUser(profile);

                if (profile?.workAt && !hasEditedCsbRef.current) {
                    setExportForm((prev) => ({
                        ...prev,
                        csb: profile.workAt
                    }));
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    // Fallback to cached user.workAt if profile request fails
                }
            }
        };

        fetchUserWorkAt();
        return () => controller.abort();
    }, [token]);

    useEffect(() => {
        const [year, month] = selectedMonth.split("-").map(Number);
        const startDate = formatDateInputValue(new Date(year, month - 1, 1));
        const endDate = formatDateInputValue(new Date(year, month, 0));
        let controller = new AbortController();

        const loadMonthInvoices = async () => {
            try {
                const { invoices: data } = await fetchInvoicesRangeWithCache({
                    token,
                    startDate,
                    endDate,
                    signal: controller.signal
                });

                const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
                const monthlyInvoices = data.map((invoice) => {
                    const invoiceDate = getInvoiceDate(invoice.date);
                    const patientCount = Number(invoice.nbP) || 0;
                    const amount = Number(invoice.amount) || 0;

                    return {
                        ...invoice,
                        id: invoice._id ?? invoice.id,
                        dayName: dayNames[invoiceDate.getDay()],
                        averageCost: Math.round(Number(invoice.averageCost ?? (patientCount ? amount / patientCount : 0)) || 0),
                        comment: invoice.comment || ""
                    };
                }).sort((a, b) => getInvoiceDate(a.date) - getInvoiceDate(b.date));
                setInvoices(monthlyInvoices);
                setError(null);
            } catch (requestError) {
                if (requestError.name === "AbortError") return;
                const message = requestError.message || "";
                setError(
                    message.toLowerCase().includes("fetch") || message.toLowerCase().includes("network")
                        ? "Impossible de joindre le serveur. Vérifiez votre connexion Internet, puis réessayez."
                        : message || "Impossible de charger les factures de ce mois."
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        const handleSyncComplete = () => {
            controller.abort();
            controller = new AbortController();
            loadMonthInvoices();
        };

        loadMonthInvoices();
        window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);
        return () => {
            controller.abort();
            window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);
        };
    }, [selectedMonth, token]);

    const applySelectedMonth = (nextMonth) => {
        if (!nextMonth || nextMonth === selectedMonth) return;
        setLoading(true);
        setError(null);
        setInvoices([]);
        setSelectedMonth(nextMonth);
    };

    const handleMonthChange = (e) => {
        applySelectedMonth(e.target.value);
    };

    const handleShiftMonth = (deltaMonths) => {
        applySelectedMonth(shiftYearMonth(selectedMonth, deltaMonths));
    };

    const handleCurrentMonth = () => {
        applySelectedMonth(defaultMonth);
    };

    const openExportModal = () => {
        setExportModalOpen(true);
        if (!hasEditedCsbRef.current) {
            const workAt = profileUser?.workAt || user?.workAt;
            if (workAt) {
                setExportForm((prev) => (prev.csb ? prev : { ...prev, csb: workAt }));
            }
        }
    };

    const closeExportModal = () => {
        setExportModalOpen(false);
    };

    const handleMonthlyExportPDF = async (e) => {
        e.preventDefault();
        setIsExporting(true);
        try {
            await exportPDF({
                yearMonth: selectedMonth,
                invoices,
                totalAmount,
                totalPatients,
                totalOrdonnances,
                info: {
                    drsp: "VATOVAVY",
                    sdsp: exportForm.sdsp.trim() || "NOSY-VARIKA",
                    csb: exportForm.csb.trim() || profileUser?.workAt || user?.workAt || ""
                }
            });
            closeExportModal();
        } finally {
            setIsExporting(false);
        }
    };

    const totalAmount = Math.round(invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0));
    const totalPatients = invoices.reduce((acc, inv) => acc + Number(inv.nbP || 0), 0);
    const totalOrdonnances = invoices.reduce((acc, inv) => acc + Number(inv.nbOf || 0), 0);
    const totalDays = invoices.length;
    const avgDailyAmount = totalDays > 0 ? Math.round(totalAmount / totalDays) : 0;
    const overallAvgCost = totalPatients > 0 ? Math.round(totalAmount / totalPatients) : 0;

    const getFormattedMonthTitle = () => {
        const [y, m] = selectedMonth.split("-");
        const date = new Date(y, m - 1);
        return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setModalFormData(null);
        setModalError(null);
    };

    const handleModalSubmit = (e) => {
        e.preventDefault();
        setModalError(null);
        if (!modalFormData || activeModal?.mode !== "edit") return;
        if (modalFormData.nbP === "" || !Number.isInteger(Number(modalFormData.nbP)) || Number(modalFormData.nbP) < 0) {
            setModalError("Veuillez saisir un nombre de patients valide.");
            return;
        }
        if (modalFormData.nbOf === "" || !Number.isInteger(Number(modalFormData.nbOf)) || Number(modalFormData.nbOf) < 0) {
            setModalError("Veuillez saisir un nombre d'ordonnances valide.");
            return;
        }
        if (modalFormData.amount === "" || !Number.isFinite(Number(modalFormData.amount)) || Number(modalFormData.amount) < 0) {
            setModalError("Veuillez saisir un montant valide.");
            return;
        }
        if (Number(modalFormData.amount) / (Number(modalFormData.nbP) || 1) > 3500 && !modalFormData.comment?.trim()) {
            setModalError("Veuillez saisir un commentaire pour ce coût moyen supérieur à 3 500 Ar.");
            return;
        }

        const updatedAvg = modalFormData.nbP > 0
            ? Math.round(Number(modalFormData.amount) / Number(modalFormData.nbP))
            : 0;

        const updatedInvoice = {
            ...modalFormData,
            averageCost: updatedAvg
        };

        setInvoices((prev) => prev.map((inv) => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        handleCloseModal();
    };

    return (
        <>
            <div className="report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Récapitulatif mensuel</p>
                        <h1 className="report-title">Facture du mois</h1>
                        <p className="report-subtitle">
                            Consultez la synthèse globale, les statistiques et le détail des factures du mois.
                        </p>
                    </div>
                </header>

                <section className="monthly-picker-card" aria-label="Sélection de la période">
                    <div className="monthly-picker-heading">
                        <span className="monthly-picker-icon" aria-hidden="true">
                            <CalendarDays />
                        </span>
                        <div>
                            <span className="monthly-picker-eyebrow">Période du rapport</span>
                            <p className="month-capitalize">{getFormattedMonthTitle()}</p>
                        </div>
                    </div>
                    <div className="monthly-picker-actions">
                        <div className="month-stepper" role="group" aria-label="Navigation par mois">
                            <button
                                type="button"
                                className="month-step-btn"
                                onClick={() => handleShiftMonth(-1)}
                                title="Mois précédent"
                                aria-label="Mois précédent"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="month-step-btn month-step-current"
                                onClick={handleCurrentMonth}
                                disabled={selectedMonth === defaultMonth}
                            >
                                Ce mois
                            </button>
                            <button
                                type="button"
                                className="month-step-btn"
                                onClick={() => handleShiftMonth(1)}
                                title="Mois suivant"
                                aria-label="Mois suivant"
                            >
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="monthly-picker-control">
                            <label htmlFor="monthSelect">Mois sélectionné</label>
                            <input
                                type="month"
                                id="monthSelect"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                            />
                        </div>
                    </div>
                </section>

                {error && <div className="alert error" role="alert">{error}</div>}

                <section className="summary-grid monthly-summary">
                    {loading ? (
                        <div className="monthly-summary-skeleton" role="status" aria-label="Chargement du rapport mensuel">
                            <span className="sr-only">Chargement du rapport mensuel...</span>
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div className="summary-card skeleton-card" key={item} aria-hidden="true">
                                    <span className="skeleton-line skeleton-label" />
                                    <span className="skeleton-line skeleton-value" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Montant total</span>
                                    <h3 className="summary-value">{totalAmount.toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Patients du mois</span>
                                    <h3 className="summary-value">{totalPatients.toLocaleString("fr-FR")}</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Total ordonnances</span>
                                    <h3 className="summary-value">{totalOrdonnances.toLocaleString("fr-FR")}</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Moyenne / jour</span>
                                    <h3 className="summary-value">{Math.round(avgDailyAmount).toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Coût moyen / patient</span>
                                    <h3 className="summary-value">{Math.round(overallAvgCost).toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                <main className="table-card">
                    <div className="table-header flex-header">
                        <h2>
                            Historique de <span className="month-capitalize">{getFormattedMonthTitle()}</span>
                            {loading
                                ? <span className="skeleton-line skeleton-count" aria-hidden="true" />
                                : <span className="table-count"> · {invoices.length} {invoices.length > 1 ? "factures" : "facture"}</span>}
                        </h2>
                        <button
                            type="button"
                            className="action-btn export-btn"
                            onClick={openExportModal}
                            disabled={loading || isExporting}
                        >
                            <Download size={16} aria-hidden="true" />
                            <span>Exporter le recap mensuel</span>
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="monthly-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Jour</th>
                                    <th className="num-col">Patients</th>
                                    <th className="num-col">Ordonnances</th>
                                    <th className="num-col">Montant total</th>
                                    <th className="num-col">Coût moyen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading
                                    ? [1, 2, 3, 4, 5].map((row) => (
                                        <tr key={row} aria-hidden="true">
                                            {[1, 2, 3, 4, 5, 6].map((cell) => (
                                                <td key={cell}><span className="skeleton-line skeleton-cell" /></td>
                                            ))}
                                        </tr>
                                    ))
                                    : error
                                        ? <tr><td colSpan="6">Les factures n'ont pas pu être chargées.</td></tr>
                                        : invoices.length === 0
                                            ? <tr><td colSpan="6">Aucune facture enregistrée pour ce mois.</td></tr>
                                            : invoices.map((inv) => {
                                                const isHigh = parseFloat(inv.averageCost) > 3500;
                                                return (
                                                    <tr key={inv.id}>
                                                        <td className="date-cell">{formatDateFr(inv.date)}</td>
                                                        <td className="day-cell">{inv.dayName}</td>
                                                        <td className="nb-cell">{inv.nbP}</td>
                                                        <td className="nb-cell">{inv.nbOf}</td>
                                                        <td className="amount-cell">{Math.round(Number(inv.amount) || 0).toLocaleString("fr-FR")} Ar</td>
                                                        <td className={`avg-cell ${isHigh ? "avg-high" : ""}`}>
                                                            {Math.round(Number(inv.averageCost) || 0).toLocaleString("fr-FR")} Ar
                                                            {isHigh && <span className="avg-flag">(Élevé)</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                            </tbody>
                        </table>
                    </div>
                </main>

                {exportModalOpen && (
                    <div className="modal-backdrop" onClick={closeExportModal}>
                        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Exporter le rapport mensuel en PDF</h3>
                                <button type="button" className="close-btn" onClick={closeExportModal} aria-label="Fermer">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleMonthlyExportPDF} className="modal-body" noValidate>
                                <p className="monthly-export-meta">
                                    DRSP : <strong>VATOVAVY</strong>
                                    <span aria-hidden="true"> · </span>
                                    Période : <strong className="month-capitalize">{getFormattedMonthTitle()}</strong>
                                </p>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="monthly-export-sdsp">SDSP</label>
                                        <input
                                            id="monthly-export-sdsp"
                                            type="text"
                                            value={exportForm.sdsp}
                                            onChange={(e) => setExportForm((prev) => ({ ...prev, sdsp: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="monthly-export-csb">CSB</label>
                                        <input
                                            id="monthly-export-csb"
                                            type="text"
                                            value={exportForm.csb}
                                            onChange={(e) => {
                                                hasEditedCsbRef.current = true;
                                                setExportForm((prev) => ({ ...prev, csb: e.target.value }));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="monthly-export-summary" aria-label="Totaux à exporter">
                                    <p className="monthly-export-summary-title">Récapitulatif à confirmer</p>
                                    <dl className="monthly-export-totals">
                                        <div>
                                            <dt>Factures</dt>
                                            <dd className="tabular-nums">{invoices.length}</dd>
                                        </div>
                                        <div>
                                            <dt>Patients</dt>
                                            <dd className="tabular-nums">{totalPatients.toLocaleString("fr-FR")}</dd>
                                        </div>
                                        <div>
                                            <dt>Ordonnances (OF)</dt>
                                            <dd className="tabular-nums">{totalOrdonnances.toLocaleString("fr-FR")}</dd>
                                        </div>
                                        <div>
                                            <dt>Montant total</dt>
                                            <dd className="tabular-nums">{Math.round(totalAmount).toLocaleString("fr-FR")} Ar</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={closeExportModal} disabled={isExporting}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="submit-btn" disabled={isExporting}>
                                        <Download size={16} aria-hidden="true" />
                                        {isExporting ? "Exportation..." : "Exporter PDF"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeModal && modalFormData && (
                    <div className="modal-backdrop" onClick={handleCloseModal}>
                        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>
                                    <FileText className="field-icon" aria-hidden="true" />
                                    {activeModal.mode === "edit" ? "Modifier la facture" : "Détails de la facture"}
                                </h3>
                                <button type="button" className="close-btn" onClick={handleCloseModal} aria-label="Fermer">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleModalSubmit} className="modal-body" noValidate>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Jour & Date</label>
                                        <input type="text" value={`${modalFormData.dayName} (${formatDateFr(modalFormData.date)})`} disabled />
                                    </div>

                                    <div className="form-group">
                                        <label>Nombre de patients</label>
                                        <input
                                            type="number"
                                            value={modalFormData.nbP}
                                            disabled={activeModal.mode === "view"}
                                            onChange={(e) => {
                                                setModalError(null);
                                                setModalFormData({ ...modalFormData, nbP: e.target.value });
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Ordonnances</label>
                                        <input
                                            type="number"
                                            value={modalFormData.nbOf}
                                            disabled={activeModal.mode === "view"}
                                            onChange={(e) => {
                                                setModalError(null);
                                                setModalFormData({ ...modalFormData, nbOf: e.target.value });
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Montant total (Ar)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={modalFormData.amount}
                                            disabled={activeModal.mode === "view"}
                                            onChange={(e) => {
                                                setModalError(null);
                                                setModalFormData({ ...modalFormData, amount: e.target.value });
                                            }}
                                        />
                                    </div>

                                    {modalError && <div className="alert error full-width" role="alert">{modalError}</div>}

                                    {parseFloat(modalFormData.amount / (modalFormData.nbP || 1)) > 3500 && (
                                        <div className="form-group full-width">
                                            <label>Commentaire (Coût moyen &gt; 3 500)</label>
                                            <textarea
                                                rows="3"
                                                value={modalFormData.comment}
                                                disabled={activeModal.mode === "view"}
                                                onChange={(e) => {
                                                    setModalError(null);
                                                    setModalFormData({ ...modalFormData, comment: e.target.value });
                                                }}
                                            ></textarea>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                                        Fermer
                                    </button>
                                    {activeModal.mode === "edit" && (
                                        <button type="submit" className="submit-btn">
                                            <Check size={16} aria-hidden="true" /> Enregistrer
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default MonthlyReports;