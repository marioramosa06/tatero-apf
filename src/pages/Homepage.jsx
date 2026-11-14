import { Link } from "react-router-dom";
import {
    FilePlus,
    CalendarDays,
    BarChart3,
    ArrowRight,
    UserRound,
    LogIn,
    LayoutDashboard,
} from "lucide-react";
import "../styles/Homepage.css";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";

const Homepage = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="homepage-shell">
            <header className="homepage-topbar">
                <div className="homepage-topbar-inner">
                    <Link to="/" className="homepage-wordmark">
                        Tatero
                    </Link>

                    <div className="homepage-topbar-action">
                        <Link to="/about" className="homepage-top-link">
                            À propos
                        </Link>
                        {isAuthenticated && (
                            <Link to="/profile" className="homepage-top-btn">
                                <UserRound size={15} aria-hidden="true" />
                                <span>Profil</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="homepage-container">
                <section className="homepage-hero" aria-labelledby="homepage-hero-title">
                    <p className="homepage-kicker">
                        Tatero <span aria-hidden="true">·</span> APF
                    </p>
                    <h1 id="homepage-hero-title" className="homepage-title">
                        Une gestion plus simple, <span>un suivi plus clair.</span>
                    </h1>
                    <p className="homepage-subtitle">
                        Saisie des factures quotidiennes et rapports périodiques au même endroit.
                    </p>

                    {!isAuthenticated && (
                        <div className="homepage-hero-actions">
                            <Link to="/signin" className="homepage-cta-primary">
                                <LogIn size={16} aria-hidden="true" />
                                <span>Se connecter</span>
                            </Link>
                            <Link to="/signup" className="homepage-cta-secondary">
                                <span>Créer un compte</span>
                                <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                        </div>
                    )}
                </section>

                <main className="homepage-main">
                    <nav className="homepage-links-grid" aria-label="Modules">
                        <Link to="/dashboard" className="homepage-link-item">
                            <span className="link-item-icon"><LayoutDashboard size={18} aria-hidden="true" /></span>
                            <span className="link-item-text">
                                <strong>Tableau de bord</strong>
                                <small>Aperçu du mois</small>
                            </span>
                            <ArrowRight className="link-item-arrow" size={16} aria-hidden="true" />
                        </Link>

                        <Link to="/invoices/new" className="homepage-link-item">
                            <span className="link-item-icon"><FilePlus size={18} aria-hidden="true" /></span>
                            <span className="link-item-text">
                                <strong>Facture journalière</strong>
                                <small>Saisie du jour</small>
                            </span>
                            <ArrowRight className="link-item-arrow" size={16} aria-hidden="true" />
                        </Link>

                        <Link to="/reports/week" className="homepage-link-item">
                            <span className="link-item-icon"><CalendarDays size={18} aria-hidden="true" /></span>
                            <span className="link-item-text">
                                <strong>Rapport hebdomadaire</strong>
                                <small>Synthèse et export XLSX</small>
                            </span>
                            <ArrowRight className="link-item-arrow" size={16} aria-hidden="true" />
                        </Link>

                        <Link to="/reports/month" className="homepage-link-item">
                            <span className="link-item-icon"><BarChart3 size={18} aria-hidden="true" /></span>
                            <span className="link-item-text">
                                <strong>Récapitulatif mensuel</strong>
                                <small>Historique du mois</small>
                            </span>
                            <ArrowRight className="link-item-arrow" size={16} aria-hidden="true" />
                        </Link>
                    </nav>
                </main>
            </div>

            <Footer />
        </div>
    );
};

export default Homepage;