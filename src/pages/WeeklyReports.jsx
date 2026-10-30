import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    CalendarDays,
    ArrowRight,
    ArrowLeft,
    X,
    Check,
    DatabaseXIcon,
    Download
} from "lucide-react";
import "../styles/WeeklyReports.css";

const WeeklyReports = () => {
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

    const formatDate = (value) => {
        if (!value) return "";
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    // Weekly invoices state
    const [invoices, setInvoices] = useState(null);

    // Modal state for View/Edit
    const [activeModal, setActiveModal] = useState(null); // { mode: 'view' | 'edit', invoice: obj }
    const [modalFormData, setModalFormData] = useState(null);
    const [modalError, setModalError] = useState(null);

    // Calculate aggregated weekly summary
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalPatient, setTotalPatient] = useState(0);
    const [totalOf, setTotalOf] = useState(0)
    const weeklyAvgCost = totalPatient > 0 ? Math.round(totalAmount / totalPatient) : "0.00";

    //Loading state
    const [loading, setLoading] = useState(true)
    //error
    const [error, setError] = useState(null);

    const handleDateChange = (setter) => (e) => {
        setter(e.target.value);
        setLoading(true);
        setError(null);
        setInvoices(null);
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
            ? (modalFormData.amount / modalFormData.nbP).toFixed(0)
            : "0.00";

        const updatedInvoice = {
            ...modalFormData,
            averageCost: updatedAvg
        };

        setInvoices((prev) => prev.map((inv) => inv.id === updatedInvoice.id ? updatedInvoice : inv));
        handleCloseModal();
    };

    useEffect(() => {
        fetch(`https://api-tatero-apf.vercel.app/api/invoices/range?startDate=${startDate}&endDate=${endDate}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data?.error || "Impossible de charger les factures.");
                }
                return data;
            })
            .then((dat) => {
                setTotalAmount(0)
                setTotalPatient(0)
                setTotalOf(0)

                setInvoices(dat)
                dat.forEach(element => {
                    setTotalAmount(prev => prev + Number(element.amount || 0))
                    setTotalPatient(prev => prev + Number(element.nbP || 0))
                    setTotalOf(prev => prev + Number(element.nbOf || 0))
                });

            }).catch(err => {
                console.log(err.message);
                setError(err.message)
                setLoading(false)
            }).finally(() => {
                setLoading(false)
            })
    }, [startDate, endDate])

    return (
        <>
            <div className="report-container">
                {/* Header */}
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <span className="report-badge">Rapport Hebdo</span>
                        <h1 className="report-title">Facture de la semaine</h1>
                        <p className="report-subtitle">
                            Sélectionnez une semaine pour afficher et gérer les factures du lundi au vendredi.
                        </p>
                    </div>
                </header>

                {/* Week Selector Box */}
                <section className="week-picker-card">
                    <div className="week-picker-heading">
                        <span className="week-picker-icon">
                            <CalendarDays aria-hidden="true" />
                        </span>
                        <div>
                            <span className="week-picker-eyebrow">Période du rapport</span>
                            <h2>Choisir une période</h2>
                        </div>
                    </div>
                    <div className="week-picker-controls">
                        <div className="week-date-field">
                            <label htmlFor="startDate">Date de début</label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={handleDateChange(setStartDate)}
                            />
                        </div>
                        <ArrowRight className="week-date-separator" aria-hidden="true" />
                        <div className="week-date-field">
                            <label htmlFor="endDate">Date de fin</label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={handleDateChange(setEndDate)}
                            />
                        </div>
                    </div>
                    <div className="week-range-badge">
                        <span>Période sélectionnée</span>
                        <strong>{`${formatDate(startDate)} au ${formatDate(endDate)}`}</strong>
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
                                            {["Date", "Patients", "Ordonnances", "Montant Total", "Coût Moyen"].map((heading) => (
                                                <th key={heading}>{heading}</th>
                                            ))}
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
                {!loading && !error && !invoices && <div className="no-data"> <DatabaseXIcon /> <span>Aucun données disponible</span> </div>}
                {error && <div className="alert error">{error}</div>}

                {!loading && invoices &&
                    <>
                        {/* Weekly Summary Cards */}
                        <section className="summary-grid">
                            <div className="summary-card card-primary">
                                <div className="summary-content">
                                    <span className="summary-label">Montant Total</span>
                                    <h3 className="summary-value">{totalAmount.toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>

                            <div className="summary-card card-secondary">
                                <div className="summary-content">
                                    <span className="summary-label">Patients Cumulés</span>
                                    <h3 className="summary-value">{totalPatient}</h3>
                                </div>
                            </div>

                            <div className="summary-card card-tertiary">
                                <div className="summary-content">
                                    <span className="summary-label">Ordonnances Facturées</span>
                                    <h3 className="summary-value">{totalOf}</h3>
                                </div>
                            </div>

                            <div className="summary-card card-info">
                                <div className="summary-content">
                                    <span className="summary-label">Coût Moyen / Patient</span>
                                    <h3 className="summary-value">{weeklyAvgCost.toLocaleString("fr-FR")} Ar</h3>
                                </div>
                            </div>
                        </section>

                        {/* Invoices List Table */}
                        <main className="table-card">
                            <div className="table-header flex-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h2>Factures enregistrées (Lundi - Vendredi)</h2>
                                <button className="action-btn export-btn" title="Exporter en CSV">
                                    <Download size={18} />
                                </button>
                            </div>

                            <div className="table-responsive">
                                <table className="weekly-table">
                                    <thead>
                                        <tr>
                                            {/* <th>Jour</th> */}
                                            <th>Date</th>
                                            <th>Patients</th>
                                            <th>Ordonnances</th>
                                            <th>Montant Total</th>
                                            <th>Coût Moyen</th>
                                            {/* <th>Actions</th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr key={inv.id} onClick={() => handleOpenModal(inv, 'edit')}>
                                                {/* <td className="day-cell">
                                                    <strong>{inv.dayName}</strong>
                                                </td> */}
                                                <td>{inv.date.split("T")[0]}</td>
                                                <td className="nb-cell">{inv.nbP}</td>
                                                <td className="nb-cell">{inv.nbOf}</td>
                                                <td className="amount-cell">{Number(inv.amount).toLocaleString("fr-FR")} Ar</td>
                                                <td className={`avg-cell ${parseFloat(inv.averageCost) > 3500 ? "avg-high" : ""}`}>
                                                    {inv.averageCost.toLocaleString("fr-FR")} Ar
                                                </td>
                                                {/* <td className="actions-cell">
                                            <button
                                                className="action-btn view-btn"
                                                onClick={() => handleOpenModal(inv, 'view')}
                                                title="Consulter"
                                            >
                                                <Eye size={16} />
                                                Voir
                                            </button>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleOpenModal(inv, 'edit')}
                                                title="Modifier"
                                            >
                                                <Edit3 size={16} /> Modifier
                                            </button>
                                        </td> */}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </main>

                        {/* View / Edit Modal */}
                        {activeModal && modalFormData && (
                            <div className="modal-backdrop" onClick={handleCloseModal}>
                                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3>
                                            {activeModal.mode === "edit" ? "Modifier la Facture" : "Détails de la Facture"}
                                        </h3>
                                        <button className="close-btn" onClick={handleCloseModal}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleModalSubmit} className="modal-body" noValidate>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label>Jour / Date :</label>
                                                <input type="text" value={`${modalFormData.dayName} (${modalFormData.date})`} disabled />
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
                                                    <label>Commentaire (Requis) :</label>
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
                    </>}
            </div>
        </>
    );
};

export default WeeklyReports;