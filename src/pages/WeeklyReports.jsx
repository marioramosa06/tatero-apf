import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
import {
    CalendarDays,
    ArrowRight,
    // Coins,
    // Users,
    // Receipt,
    // Calculator,
    // Eye,
    // Edit3,
    X,
    Check,
    Loader,
    DatabaseXIcon,
    // FileText,
    // Download
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

    // Calculate aggregated weekly summary
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalPatient, setTotalPatient] = useState(0);
    const [totalOf, setTotalOf] = useState(0)
    const weeklyAvgCost = totalPatient > 0 ? Math.round(totalAmount / totalPatient) : "0.00";

    //Loading state
    const [loading, setLoading] = useState(true)
    //error
    const [error, setError] = useState(null);

    // Open View / Edit Modal
    const handleOpenModal = (invoice, mode) => {
        setActiveModal({ mode, invoice });
        setModalFormData({ ...invoice });
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setModalFormData(null);
    };

    // Save edited invoice
    const handleModalSubmit = (e) => {
        e.preventDefault();
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
        // setLoading(true)
        fetch(`http://192.168.1.3:8000/api/invoices/range?startDate=${startDate}&endDate=${endDate}`)
            .then(res => {
                setLoading(true)
                return res.json()
            })
            .then(dat => {
                // console.log(dat);
                setTotalAmount(0)
                setTotalPatient(0)
                setTotalOf(0)

                setInvoices(dat)
                dat.forEach(element => {
                    setTotalAmount(prev => prev + element.amount)
                    setTotalPatient(prev => prev + element.nbP)
                    setTotalOf(prev => prev + element.nbOf)
                });
                setLoading(false)

            }).catch(err => {
                console.log(err.message);
                setError(err.message)
                setLoading(false)
            })
    }, [startDate, endDate])

    return (
        <>
            <div className="report-container">
                {/* Header */}
                <header className="report-header">
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
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <ArrowRight className="week-date-separator" aria-hidden="true" />
                        <div className="week-date-field">
                            <label htmlFor="endDate">Date de fin</label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="week-range-badge">
                        <span>Période sélectionnée</span>
                        <strong>{`${formatDate(startDate)} au ${formatDate(endDate)}`}</strong>
                    </div>
                </section>
                {!loading && !invoices && <div className="no-data"> <DatabaseXIcon /> <span>Aucun données disponible</span> </div>}
                {loading && <div className="loader"><Loader className="btn-icon spin" /> <span>Chargement ...</span></div>}
                {error && <div className="alert error">{error}</div>}

                {invoices &&
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
                                {/* <button className="action-btn export-btn" onClick={handleExportCSV} title="Exporter en CSV">
                            <Download size={16} /> Exporter le rapport
                        </button> */}
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
                                {loading && <div><Loader /> Chargement ...</div>}
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

                                    <form onSubmit={handleModalSubmit} className="modal-body">
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
                                                    onChange={(e) => setModalFormData({ ...modalFormData, nbP: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Ordonnances :</label>
                                                <input
                                                    type="number"
                                                    value={modalFormData.nbOf}
                                                    disabled={activeModal.mode === "view"}
                                                    onChange={(e) => setModalFormData({ ...modalFormData, nbOf: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Montant total (Ar) :</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={modalFormData.amount}
                                                    disabled={activeModal.mode === "view"}
                                                    onChange={(e) => setModalFormData({ ...modalFormData, amount: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            {parseFloat(modalFormData.amount / (modalFormData.nbP || 1)) > 3500 && (
                                                <div className="form-group full-width">
                                                    <label>Commentaire (Requis) :</label>
                                                    <textarea
                                                        rows="3"
                                                        value={modalFormData.comment}
                                                        disabled={activeModal.mode === "view"}
                                                        onChange={(e) => setModalFormData({ ...modalFormData, comment: e.target.value })}
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