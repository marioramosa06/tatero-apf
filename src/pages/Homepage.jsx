import { Link } from "react-router-dom";
import {
    FilePlus,
    CalendarDays,
    BarChart3,
    Info,
    ArrowRight,
    UserRound,
    LogIn,
    UserPlus,
    LayoutDashboard,
} from "lucide-react";
import "../styles/Homepage.css";
import Footer from "../components/Footer";
import useAuth from "../hooks/useAuth";

const Homepage = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div className="homepage-container">
            <header className="homepage-hero">
                <div className="homepage-hero-copy">
                    <div className="homepage-brand">
                        <span>Tatero</span>
                        <span className="homepage-brand-divider" aria-hidden="true">·</span>
                        <span>APF</span>
                    </div>

                    <h1 className="homepage-title">
                        Une gestion plus simple, <span>un suivi plus clair.</span>
                    </h1>
                    <p className="homepage-subtitle">
                        Enregistrez vos factures de couverture des soins, suivez votre activité et retrouvez vos rapports au même endroit.
                    </p>

                    {!isAuthenticated ? (
                        <div className="homepage-auth-actions">
                            <Link to="/signin" className="homepage-auth-link homepage-auth-link-primary">
                                <LogIn aria-hidden="true" />
                                Se connecter
                            </Link>
                            <Link to="/signup" className="homepage-auth-link">
                                <UserPlus aria-hidden="true" />
                                Créer un compte
                            </Link>
                        </div>
                    ) : (
                        <div className="homepage-auth-actions">
                            <Link to="/dashboard" className="homepage-auth-link homepage-auth-link-primary">
                                <LayoutDashboard aria-hidden="true" />
                                Tableau de bord
                            </Link>
                            <Link to="/invoices/new" className="homepage-auth-link">
                                <FilePlus aria-hidden="true" />
                                Nouvelle facture
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <main className="homepage-main">
                <section className="homepage-tools" aria-label="Outils disponibles">
                    <div className="homepage-grid">
                        <Link to="/dashboard" className="homepage-card">
                            <div className="card-icon-wrapper"><LayoutDashboard className="card-icon" aria-hidden="true" /></div>
                            <div className="card-content">
                                <h3>Tableau de bord</h3>
                                <p>Visualisez votre activité et accédez rapidement à vos outils.</p>
                            </div>
                            <span className="card-action-hint">Ouvrir <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                        </Link>

                        <Link to="/invoices/new" className="homepage-card">
                            <div className="card-icon-wrapper"><FilePlus className="card-icon" aria-hidden="true" /></div>
                            <div className="card-content">
                                <h3>Facture journalière</h3>
                                <p>Enregistrez une nouvelle facture pour la journée.</p>
                            </div>
                            <span className="card-action-hint">Créer une facture <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                        </Link>

                        <Link to="/reports/week" className="homepage-card">
                            <div className="card-icon-wrapper"><CalendarDays className="card-icon" aria-hidden="true" /></div>
                            <div className="card-content">
                                <h3>Rapport hebdomadaire</h3>
                                <p>Analysez et compilez les chiffres de la semaine.</p>
                            </div>
                            <span className="card-action-hint">Voir le rapport <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                        </Link>

                        <Link to="/reports/month" className="homepage-card">
                            <div className="card-icon-wrapper"><BarChart3 className="card-icon" aria-hidden="true" /></div>
                            <div className="card-content">
                                <h3>Récapitulatif mensuel</h3>
                                <p>Consultez ou exportez la synthèse du mois.</p>
                            </div>
                            <span className="card-action-hint">Voir le récapitulatif <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                        </Link>

                        {isAuthenticated && (
                            <Link to="/profile" className="homepage-card">
                                <div className="card-icon-wrapper"><UserRound className="card-icon" aria-hidden="true" /></div>
                                <div className="card-content">
                                    <h3>Mon profil</h3>
                                    <p>Consultez vos informations et gérez votre compte.</p>
                                </div>
                                <span className="card-action-hint">Voir mon profil <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                            </Link>
                        )}

                        <Link to="/about" className="homepage-card">
                            <div className="card-icon-wrapper"><Info className="card-icon" aria-hidden="true" /></div>
                            <div className="card-content">
                                <h3>À propos</h3>
                                <p>Découvrez Tatero APF et ses fonctionnalités.</p>
                            </div>
                            <span className="card-action-hint">En savoir plus <ArrowRight className="hint-arrow" aria-hidden="true" /></span>
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default Homepage;