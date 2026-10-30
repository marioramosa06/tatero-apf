import { useEffect, useState } from "react";
import { Link } from "react-router-dom"
import {
    Eye,
    Edit3,
    X,
    Check,
    FileText,
    CalendarDays,
    ArrowLeft
} from "lucide-react";
import "../styles/MonthlyReports.css";
import Footer from "../components/Footer";

// Helper to format date strings to local French format
const formatDateFr = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

// Mock generator for daily invoices of a selected month
const generateMockMonthlyInvoices = (yearMonth) => {
    const [year, month] = yearMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const invoices = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayOfWeek = currentDate.getDay();

        // Include weekdays (Monday = 1 to Friday = 5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const dateStr = currentDate.toISOString().split("T")[0];
            const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
            const patients = Math.floor(Math.random() * 15) + 15;
            const ordonnances = Math.floor(patients * 0.85);
            const amount = Math.floor(patients * (Math.random() * 1000 + 2800));

            invoices.push({
                id: `INV-${dateStr}`,
                dayName: dayNames[dayOfWeek],
                date: dateStr,
                nbP: patients,
                nbOf: ordonnances,
                amount: amount,
                averageCost: (amount / patients).toFixed(2),
                comment: (amount / patients) > 3500 ? "Augmentation du coût moyen due à des actes complexes." : "",
            });
        }
    }
    return invoices;
};

const MonthlyReports = () => {
    // State for YYYY-MM selector
    const today = new Date();
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [loading, setLoading] = useState(true);

    // Invoices list for the selected month
    const [invoices, setInvoices] = useState(() => generateMockMonthlyInvoices(defaultMonth));

    // Modal state
    const [activeModal, setActiveModal] = useState(null); // { mode: 'view' | 'edit', invoice: obj }
    const [modalFormData, setModalFormData] = useState(null);
    const [modalError, setModalError] = useState(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setInvoices(generateMockMonthlyInvoices(selectedMonth));
            setLoading(false);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedMonth]);

    // Handle month selection change
    const handleMonthChange = (e) => {
        const newMonth = e.target.value;
        setSelectedMonth(newMonth);
        setLoading(true);
    };

    // Calculate aggregated metrics
    const totalAmount = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const totalPatients = invoices.reduce((acc, inv) => acc + Number(inv.nbP), 0);
    const totalOrdonnances = invoices.reduce((acc, inv) => acc + Number(inv.nbOf), 0);
    const totalDays = invoices.length;
    const avgDailyAmount = totalDays > 0 ? (totalAmount / totalDays).toFixed(2) : "0.00";
    const overallAvgCost = totalPatients > 0 ? (totalAmount / totalPatients).toFixed(2) : "0.00";

    // Format display for month title (e.g., "Octobre 2026")
    const getFormattedMonthTitle = () => {
        const [y, m] = selectedMonth.split("-");
        const date = new Date(y, m - 1);
        return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    };

    // Open View / Edit Modal
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

    // Save edited invoice
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
            ? (modalFormData.amount / modalFormData.nbP).toFixed(2)
            : "0.00";

        const updatedInvoice = {
            ...modalFormData,
            averageCost: updatedAvg
        };

        setInvoices((prev) => prev.map((inv) => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        handleCloseModal();
    };

    return (
        <div className="report-container">
            {/* Header */}
            <header className="report-header">
                <Link to="/" className="back-link">
                    <ArrowLeft className="back-icon" /> Retour à l'accueil
                </Link>
                <div className="header-title-wrapper">
                    <span className="report-badge">Récap Mensuel</span>
                    <h1 className="report-title">Facture du Mois</h1>
                    <p className="report-subtitle">
                        Consultez la synthèse globale, les statistiques et le détail de toutes les factures du mois.
                    </p>
                </div>
            </header>

            {/* Month Picker Box */}
            <section className="monthly-picker-card" aria-label="Sélection de la période">
                <div className="monthly-picker-heading">
                    <span className="monthly-picker-icon" aria-hidden="true">
                        <CalendarDays />
                    </span>
                    <div>
                        <span className="monthly-picker-eyebrow">Période du rapport</span>
                        <p>Choisissez le mois à consulter</p>
                    </div>
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
                {/* <div className="month-display-badge" aria-live="polite">
                    <span className="month-display-dot" aria-hidden="true" />
                    <div>
                        <span>Vous consultez</span>
                        <strong className="month-capitalize">{getFormattedMonthTitle()}</strong>
                    </div>
                </div> */}
            </section>

            {/* Monthly Summary Grid */}
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
                        <div className="summary-card card-primary">
                            <div className="summary-content">
                                <span className="summary-label">Montant Total</span>
                                <h3 className="summary-value">{totalAmount.toLocaleString("fr-FR")} Ar</h3>
                            </div>
                        </div>

                        <div className="summary-card card-secondary">
                            <div className="summary-content">
                                <span className="summary-label">Patients du Mois</span>
                                <h3 className="summary-value">{totalPatients}</h3>
                            </div>
                        </div>

                        <div className="summary-card card-tertiary">
                            <div className="summary-content">
                                <span className="summary-label">Total Ordonnances</span>
                                <h3 className="summary-value">{totalOrdonnances}</h3>
                            </div>
                        </div>

                        <div className="summary-card card-info">
                            <div className="summary-content">
                                <span className="summary-label">Moyenne / Jour</span>
                                <h3 className="summary-value">{Number(avgDailyAmount).toLocaleString("fr-FR")} Ar</h3>
                            </div>
                        </div>

                        <div className="summary-card card-primary full-span-mobile">
                            <div className="summary-content">
                                <span className="summary-label">Coût Moyen / Patient</span>
                                <h3 className="summary-value">{overallAvgCost} Ar</h3>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* Monthly Invoices Table */}
            <main className="table-card">
                <div className="table-header">
                    <h2>
                        Historique des factures de <span className="month-capitalize">{getFormattedMonthTitle()}</span>
                        {loading
                            ? <span className="skeleton-line skeleton-count" aria-hidden="true" />
                            : <span className="count-pill">{invoices.length} jours facturés</span>}
                    </h2>
                </div>

                <div className="table-responsive">
                    <table className="monthly-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Jour</th>
                                <th>Patients</th>
                                <th>Ordonnances</th>
                                <th>Montant Total</th>
                                <th>Coût Moyen</th>
                                {/* <th>Commentaire</th> */}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? [1, 2, 3, 4, 5].map((row) => (
                                    <tr key={row} aria-hidden="true">
                                        {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                                            <td key={cell}><span className="skeleton-line skeleton-cell" /></td>
                                        ))}
                                    </tr>
                                ))
                                : invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="date-cell">{formatDateFr(inv.date)}</td>
                                        <td className="day-cell"><strong>{inv.dayName}</strong></td>
                                        <td>{inv.nbP}</td>
                                        <td>{inv.nbOf}</td>
                                        <td className="amount-cell">{Number(inv.amount).toLocaleString("fr-FR")} Ar</td>
                                        <td className={parseFloat(inv.averageCost) > 3500 ? "avg-high" : ""}>
                                            {inv.averageCost} Ar
                                        </td>
                                        {/* <td className="comment-cell" title={inv.comment}>
                                        {inv.comment ? (
                                            <span className="has-comment-badge">Oui</span>
                                        ) : (
                                            <span className="no-comment-text">—</span>
                                        )}
                                    </td> */}
                                        <td className="actions-cell">
                                            <button
                                                className="action-btn view-btn"
                                                onClick={() => handleOpenModal(inv, 'view')}
                                                title="Consulter"
                                            >
                                                <Eye size={16} /> Voir
                                            </button>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleOpenModal(inv, 'edit')}
                                                title="Modifier"
                                            >
                                                <Edit3 size={16} /> Modifier
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>
            <Footer />
            {/* View / Edit Modal */}
            {activeModal && modalFormData && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                <FileText className="field-icon" />
                                {activeModal.mode === "edit" ? "Modifier la Facture" : "Détails de la Facture"}
                            </h3>
                            <button className="close-btn" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleModalSubmit} className="modal-body" noValidate>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Jour & Date :</label>
                                    <input type="text" value={`${modalFormData.dayName} (${formatDateFr(modalFormData.date)})`} disabled />
                                </div>

                                <div className="form-group">
                                    <label>Nombre de patients :</label>
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
                                    <label>Ordonnances :</label>
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
                                    <label>Montant total (Ar) :</label>
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
                                        <label>Commentaire (Coût moyen &gt; 3500) :</label>
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
                                        <Check size={18} /> Enregistrer
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyReports;