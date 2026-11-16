import { useEffect, useRef, useState } from "react";
import {
    fetchInvoicesRangeWithCache,
    fetchProfileWithCache,
    submitUpdateInvoice
} from "../utils/invoiceApi";
import { OFFLINE_SYNC_COMPLETE_EVENT } from "../utils/offlineStore";
import { exportWeeklyReportXLSX } from "../utils/exportReport";
import { Link } from "react-router-dom";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
    X,
    Check,
    DatabaseXIcon,
    Download
} from "lucide-react";
import "../styles/WeeklyReports.css";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";

const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
};

const getWorkWeekRange = (value) => {
    const monday = parseDateInput(value);
    const dayOfWeek = monday.getDay();
    monday.setDate(monday.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    return {
        startDate: toDateInputValue(monday),
        endDate: toDateInputValue(friday)
    };
};

const shiftWorkWeek = (startDate, deltaWeeks) => {
    const monday = parseDateInput(startDate);
    monday.setDate(monday.getDate() + deltaWeeks * 7);
    return getWorkWeekRange(toDateInputValue(monday));
};

const WeeklyReports = () => {
    const { token, user } = useAuth();
    const [dateRange, setDateRange] = useState(() => getWorkWeekRange(toDateInputValue(new Date())));
    const { startDate, endDate } = dateRange;

    const formatDate = (value) => {
        if (!value) return "";
        return parseDateInput(value).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const [invoices, setInvoices] = useState(null);

    const [activeModal, setActiveModal] = useState(null);
    const [modalFormData, setModalFormData] = useState(null);
    const [modalError, setModalError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [profileUser, setProfileUser] = useState(null);
    const hasEditedCsbRef = useRef(false);
    const [exportForm, setExportForm] = useState({
        district: "NOSY-VARIKA",
        csb: user?.workAt || "",
        intrants: "",
        stock: {
            OF: "",
            RCS: "",
            ticketBlanc: "",
            ticketBleu: "",
            preRUMER: "",
        },
    });

    const [totalAmount, setTotalAmount] = useState(0);
    const [totalPatient, setTotalPatient] = useState(0);
    const [totalOf, setTotalOf] = useState(0);
    const weeklyAvgCost = totalPatient > 0 ? Math.round(totalAmount / totalPatient) : 0;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fromCache, setFromCache] = useState(false);

    const applyDateRange = (nextRange) => {
        if (nextRange.startDate === startDate && nextRange.endDate === endDate) {
            return;
        }
        setLoading(true);
        setError(null);
        setDateRange(nextRange);
    };

    const handleStartDateChange = (e) => {
        const value = e.target.value;
        if (!value) return;

        applyDateRange({
            startDate: value,
            endDate: value > endDate ? value : endDate
        });
    };

    const handleEndDateChange = (e) => {
        const value = e.target.value;
        if (!value) return;

        applyDateRange({
            startDate: value < startDate ? value : startDate,
            endDate: value
        });
    };

    const handleShiftWeek = (deltaWeeks) => {
        applyDateRange(shiftWorkWeek(startDate, deltaWeeks));
    };

    const handleCurrentWeek = () => {
        applyDateRange(getWorkWeekRange(toDateInputValue(new Date())));
    };

    const handleOpenModal = (invoice, mode) => {
        setActiveModal({ mode, invoice });
        setModalFormData({ ...invoice });
        setModalError(null);
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setModalFormData(null);
        setModalError(null);
    };

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

    const handleWeeklyExport = () => {
        exportWeeklyReportXLSX({
            startDate,
            endDate,
            invoices,
            user: profileUser || user || {},
            exportData: {
                district: exportForm.district,
                csb: exportForm.csb,
                intrants: exportForm.intrants,
                stock: exportForm.stock,
            },
        });
        closeExportModal();
    };

    const handleModalSubmit = async (e) => {
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

        const invoiceId = modalFormData._id ?? modalFormData.id;
        if (!invoiceId) {
            setModalError("Impossible d'identifier cette facture.");
            return;
        }

        const updatedAvg = Number(modalFormData.nbP) > 0
            ? Math.round(Number(modalFormData.amount) / Number(modalFormData.nbP))
            : 0;
        const submissionData = {
            nbP: Number(modalFormData.nbP),
            nbOf: Number(modalFormData.nbOf),
            amount: Number(modalFormData.amount),
            averageCost: updatedAvg,
            comment: modalFormData.comment || ""
        };

        setIsSaving(true);
        try {
            const { invoice: updatedInvoice } = await submitUpdateInvoice({
                token,
                invoiceId,
                payload: submissionData,
                existingInvoice: modalFormData
            });
            const originalInvoice = activeModal.invoice;

            setInvoices((prev) => prev.map((invoice) =>
                String(invoice._id ?? invoice.id) === String(invoiceId) ? updatedInvoice : invoice
            ));
            setTotalAmount((prev) => prev + Number(updatedInvoice.amount || 0) - Number(originalInvoice.amount || 0));
            setTotalPatient((prev) => prev + Number(updatedInvoice.nbP || 0) - Number(originalInvoice.nbP || 0));
            setTotalOf((prev) => prev + Number(updatedInvoice.nbOf || 0) - Number(originalInvoice.nbOf || 0));
            handleCloseModal();
        } catch (err) {
            setModalError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        let controller = new AbortController();

        const loadWeekInvoices = async () => {
            try {
                const { invoices: dat, fromCache: isCached } = await fetchInvoicesRangeWithCache({
                    token,
                    startDate,
                    endDate,
                    signal: controller.signal
                });

                const list = Array.isArray(dat) ? dat : [];
                let sumAmount = 0;
                let sumPatients = 0;
                let sumOf = 0;

                list.forEach((element) => {
                    sumAmount += Number(element.amount || 0);
                    sumPatients += Number(element.nbP || 0);
                    sumOf += Number(element.nbOf || 0);
                });

                setTotalAmount(sumAmount);
                setTotalPatient(sumPatients);
                setTotalOf(sumOf);
                setInvoices(list);
                setFromCache(Boolean(isCached));
                setError(null);
            } catch (err) {
                if (err.name === "AbortError") return;
                setError(err.message || "Impossible de charger les factures.");
                setInvoices([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        const handleSyncComplete = () => {
            controller.abort();
            controller = new AbortController();
            loadWeekInvoices();
        };

        loadWeekInvoices();
        window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);
        return () => {
            controller.abort();
            window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, handleSyncComplete);
        };
    }, [startDate, endDate, token]);

    return (
        <>
            <div className="report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Rapport hebdomadaire</p>
                        <h1 className="report-title">Facture de la semaine</h1>
                        <p className="report-subtitle">
                            Par défaut du lundi au vendredi, ou ajustez librement les dates de début et de fin.
                        </p>
                    </div>
                </header>

                <section className="week-picker-card" aria-label="Sélection de l'intervalle de dates">
                    <div className="week-picker-top">
                        <div className="week-picker-heading">
                            <span className="week-picker-icon">
                                <CalendarDays aria-hidden="true" />
                            </span>
                            <div>
                                <span className="week-picker-eyebrow">Période sélectionnée</span>
                                <h2 className="tabular-nums">{`${formatDate(startDate)} — ${formatDate(endDate)}`}</h2>
                            </div>
                        </div>

                        <div className="week-stepper" role="group" aria-label="Navigation par semaine">
                            <button
                                type="button"
                                className="week-step-btn"
                                onClick={() => handleShiftWeek(-1)}
                                title="Semaine précédente"
                                aria-label="Semaine précédente"
                            >
                                <ChevronLeft size={16} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="week-step-btn week-step-current"
                                onClick={handleCurrentWeek}
                            >
                                Cette semaine
                            </button>
                            <button
                                type="button"
                                className="week-step-btn"
                                onClick={() => handleShiftWeek(1)}
                                title="Semaine suivante"
                                aria-label="Semaine suivante"
                            >
                                <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div className="week-picker-controls">
                        <div className="week-date-field">
                            <label htmlFor="startDate">Date de début</label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={handleStartDateChange}
                            />
                        </div>
                        <ArrowRight className="week-date-separator" aria-hidden="true" />
                        <div className="week-date-field">
                            <label htmlFor="endDate">Date de fin</label>
                            <input
                                type="date"
                                id="endDate"
                                min={startDate}
                                value={endDate}
                                onChange={handleEndDateChange}
                            />
                        </div>
                    </div>
                </section>

                {loading && (
                    <div className="weekly-report-skeleton" role="status" aria-label="Chargement du rapport hebdomadaire">
                        <span className="sr-only">Chargement du rapport hebdomadaire...</span>
                        <section className="summary-grid" aria-hidden="true">
                            {[1, 2, 3, 4].map((item) => (
                                <div className="summary-card skeleton-card" key={item}>
                                    <span className="skeleton-line skeleton-label" />
                                    <span className="skeleton-line skeleton-value" />
                                </div>
                            ))}
                        </section>
                        <section className="table-card" aria-hidden="true">
                            <div className="table-header">
                                <span className="skeleton-line skeleton-heading" />
                            </div>
                            <div className="table-responsive">
                                <table className="weekly-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th className="num-col">Patients</th>
                                            <th className="num-col">Ordonnances</th>
                                            <th className="num-col">Montant total</th>
                                            <th className="num-col">Coût moyen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3, 4, 5].map((row) => (
                                            <tr key={row}>
                                                {[1, 2, 3, 4, 5].map((cell) => (
                                                    <td key={cell}><span className="skeleton-line skeleton-cell" /></td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                )}

                {!loading && !error && !invoices && (
                    <div className="no-data">
                        <DatabaseXIcon aria-hidden="true" />
                        <span>Aucune donnée disponible</span>
                    </div>
                )}

                {error && <div className="alert error" role="alert">{error}</div>}
                {!loading && fromCache && (
                    <div className="offline-cache-note" role="status">
                        <span>Affichage des données hors ligne depuis le cache local.</span>
                    </div>
                )}

                {!loading && invoices && (
                    <>
                        <section className="summary-grid">
                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Montant total</span>
                                    <h3 className="summary-value">{Math.round(totalAmount).toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Patients cumulés</span>
                                    <h3 className="summary-value">{totalPatient.toLocaleString("fr-FR")}</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Ordonnances facturées</span>
                                    <h3 className="summary-value">{totalOf.toLocaleString("fr-FR")}</h3>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-content">
                                    <span className="summary-label">Coût moyen / patient</span>
                                    <h3 className="summary-value">{Math.round(weeklyAvgCost).toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>
                        </section>

                        <main className="table-card">
                            <div className="table-header flex-header">
                                <h2>
                                    Factures enregistrées{" "}
                                    <span className="table-count">
                                        · {invoices.length} {invoices.length > 1 ? "entrées" : "entrée"}
                                    </span>
                                </h2>
                                <button
                                    type="button"
                                    className="action-btn export-btn"
                                    title="Exporter le rapport"
                                    onClick={openExportModal}
                                >
                                    <Download size={16} aria-hidden="true" />
                                    <span>Exporter le rapport hebdo</span>
                                </button>
                            </div>

                            <div className="table-responsive">
                                <table className="weekly-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th className="num-col">Patients</th>
                                            <th className="num-col">Ordonnances</th>
                                            <th className="num-col">Montant total</th>
                                            <th className="num-col">Coût moyen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.length === 0 ? (
                                            <tr>
                                                <td colSpan="5">Aucune facture enregistrée pour cette période.</td>
                                            </tr>
                                        ) : (
                                            invoices.map((inv) => {
                                                const isHigh = parseFloat(inv.averageCost) > 3500;
                                                return (
                                                    <tr key={inv.id ?? inv._id} onClick={() => handleOpenModal(inv, "edit")}>
                                                        <td className="date-cell">{inv.date.split("T")[0]}</td>
                                                        <td className="nb-cell">{inv.nbP}</td>
                                                        <td className="nb-cell">{inv.nbOf}</td>
                                                        <td className="amount-cell">{Math.round(Number(inv.amount) || 0).toLocaleString("fr-FR")} Ar</td>
                                                        <td className={`avg-cell ${isHigh ? "avg-high" : ""}`}>
                                                            {Math.round(Number(inv.averageCost) || 0).toLocaleString("fr-FR")} Ar
                                                            {isHigh && <span className="avg-flag">(Élevé)</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </main>

                        {exportModalOpen && (
                            <div className="modal-backdrop" onClick={closeExportModal}>
                                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>Exporter le rapport hebdomadaire</h3>
                                        <button type="button" className="close-btn" onClick={closeExportModal} aria-label="Fermer">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="modal-body">
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label htmlFor="export-district">District</label>
                                                <input
                                                    id="export-district"
                                                    type="text"
                                                    value={exportForm.district}
                                                    onChange={(e) => setExportForm((prev) => ({ ...prev, district: e.target.value }))}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="export-csb">CSB</label>
                                                <input
                                                    id="export-csb"
                                                    type="text"
                                                    value={exportForm.csb}
                                                    onChange={(e) => {
                                                        hasEditedCsbRef.current = true;
                                                        setExportForm((prev) => ({ ...prev, csb: e.target.value }));
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group full-width">
                                                <label htmlFor="export-intrants">Intrants rupture à la PhaGeCom</label>
                                                <textarea
                                                    id="export-intrants"
                                                    rows="3"
                                                    value={exportForm.intrants}
                                                    onChange={(e) => setExportForm((prev) => ({ ...prev, intrants: e.target.value }))}
                                                />
                                            </div>
                                            <div className="form-section-title full-width">
                                                <h4>Stock outils de gestion</h4>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="export-of">OF</label>
                                                <input
                                                    id="export-of"
                                                    type="number"
                                                    value={exportForm.stock.OF}
                                                    onChange={(e) => setExportForm((prev) => ({
                                                        ...prev,
                                                        stock: { ...prev.stock, OF: e.target.value },
                                                    }))}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="export-rcs">RCS</label>
                                                <input
                                                    id="export-rcs"
                                                    type="number"
                                                    value={exportForm.stock.RCS}
                                                    onChange={(e) => setExportForm((prev) => ({
                                                        ...prev,
                                                        stock: { ...prev.stock, RCS: e.target.value },
                                                    }))}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="export-tb">Ticket blanc</label>
                                                <input
                                                    id="export-tb"
                                                    type="number"
                                                    value={exportForm.stock.ticketBlanc}
                                                    onChange={(e) => setExportForm((prev) => ({
                                                        ...prev,
                                                        stock: { ...prev.stock, ticketBlanc: e.target.value },
                                                    }))}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="export-tbleu">Ticket bleu</label>
                                                <input
                                                    id="export-tbleu"
                                                    type="number"
                                                    value={exportForm.stock.ticketBleu}
                                                    onChange={(e) => setExportForm((prev) => ({
                                                        ...prev,
                                                        stock: { ...prev.stock, ticketBleu: e.target.value },
                                                    }))}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="export-prerumer">PreRUMER</label>
                                                <input
                                                    id="export-prerumer"
                                                    type="number"
                                                    value={exportForm.stock.preRUMER}
                                                    onChange={(e) => setExportForm((prev) => ({
                                                        ...prev,
                                                        stock: { ...prev.stock, preRUMER: e.target.value },
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        <div className="modal-actions">
                                            <button type="button" className="btn-secondary" onClick={closeExportModal}>
                                                Annuler
                                            </button>
                                            <button type="button" className="submit-btn" onClick={handleWeeklyExport}>
                                                <Download size={16} aria-hidden="true" /> Exporter Excel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeModal && modalFormData && (
                            <div className="modal-backdrop" onClick={handleCloseModal}>
                                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>
                                            {activeModal.mode === "edit" ? "Modifier la facture" : "Détails de la facture"}
                                        </h3>
                                        <button type="button" className="close-btn" onClick={handleCloseModal} aria-label="Fermer">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleModalSubmit} className="modal-body" noValidate>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Date</label>
                                                <input type="text" value={`${modalFormData.dayName ? `${modalFormData.dayName} ` : ""}(${String(modalFormData.date).slice(0, 10)})`} disabled />
                                            </div>

                                            <div className="form-group">
                                                <label>Nombre de patients</label>
                                                <input
                                                    type="number"
                                                    value={modalFormData.nbP}
                                                    disabled={activeModal.mode === "view" || isSaving}
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
                                                    disabled={activeModal.mode === "view" || isSaving}
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
                                                    disabled={activeModal.mode === "view" || isSaving}
                                                    onChange={(e) => {
                                                        setModalError(null);
                                                        setModalFormData({ ...modalFormData, amount: e.target.value });
                                                    }}
                                                />
                                            </div>

                                            {modalError && <div className="alert error full-width" role="alert">{modalError}</div>}

                                            {parseFloat(modalFormData.amount / (modalFormData.nbP || 1)) > 3500 && (
                                                <div className="form-group full-width">
                                                    <label>Commentaire (Requis)</label>
                                                    <textarea
                                                        rows="3"
                                                        value={modalFormData.comment}
                                                        disabled={activeModal.mode === "view" || isSaving}
                                                        onChange={(e) => {
                                                            setModalError(null);
                                                            setModalFormData({ ...modalFormData, comment: e.target.value });
                                                        }}
                                                    ></textarea>
                                                </div>
                                            )}
                                        </div>

                                        <div className="modal-actions">
                                            <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={isSaving}>
                                                Fermer
                                            </button>
                                            {activeModal.mode === "edit" && (
                                                <button type="submit" className="submit-btn" disabled={isSaving}>
                                                    <Check size={16} aria-hidden="true" /> {isSaving ? "Enregistrement..." : "Enregistrer"}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <Footer />
        </>
    );
};

export default WeeklyReports;