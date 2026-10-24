import { Link } from "react-router-dom";
import {
    FilePlus,
    CalendarDays,
    BarChart3,
    Info,
    ArrowRight
} from "lucide-react";
import "../styles/Homepage.css";
import Footer from "../components/Footer";


const Homepage = () => {

    return (
        <div className="homepage-container">
            <header className="homepage-header">
                {/* Logo & Brand Header */}
                <div className="brand-header">

                    {/* <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg> */}
                    {/* <span className="brand-name">Tatero</span> */}
                    <h1 className="homepage-title">Tatero | APF</h1>

                </div>

                <p className="homepage-subtitle">
                    Un outil qui facilite l'enregistrement, la suivi et l'analyser des factures de couverture de soins, Fait specialement pour les APF.
                </p>
            </header>
            <main className="homepage-grid">
                <Link to="/invoices/day/new" className="homepage-card card-primary">
                    <div className="card-icon-wrapper">
                        <FilePlus className="card-icon" />
                    </div>
                    <div className="card-content">
                        <h2>Facture Journalière</h2>
                        <p>Créer et enregistrer une nouvelle facture pour la journée en cours.</p>
                    </div>
                    <span className="card-action-hint">
                        Commencer <ArrowRight className="hint-arrow" />
                    </span>
                </Link>

                <Link to="/invoices/week" className="homepage-card card-primary">
                    <div className="card-icon-wrapper">
                        <CalendarDays className="card-icon" />
                    </div>
                    <div className="card-content">
                        <h2>Rapport Hebdomadaire</h2>
                        <p>Analyser et compiler les activités et chiffres de la semaine.</p>
                    </div>
                    <span className="card-action-hint">
                        Commencer <ArrowRight className="hint-arrow" />
                    </span>
                </Link>

                <Link to="/invoices/month" className="homepage-card card-primary">
                    <div className="card-icon-wrapper">
                        <BarChart3 className="card-icon" />
                    </div>
                    <div className="card-content">
                        <h2>Récap Mensuel</h2>
                        <p>Consulter ou exporter la synthèse globale du mois.</p>
                    </div>
                    <span className="card-action-hint">
                        Consulter <ArrowRight className="hint-arrow" />
                    </span>
                </Link>

                <Link to="/about" className="homepage-card card-primary">
                    <div className="card-icon-wrapper">
                        <Info className="card-icon" />
                    </div>
                    <div className="card-content">
                        <h2>À propos</h2>
                        <p>En savoir plus sur Tatero, les fonctionnalites et le développeur.</p>
                    </div>
                    <span className="card-action-hint">
                        En savoir plus <ArrowRight className="hint-arrow" />
                    </span>
                </Link>
            </main>
            <Footer />
        </div>
    );
};

export default Homepage;