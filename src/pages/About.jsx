import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    ShieldCheck,
    Calculator,
    CheckCircle2,
    Mail,
    Send,
    X,
    Check
} from "lucide-react";
import "../styles/About.css";
import Footer from "../components/Footer";

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "https://api-tatero-apf.vercel.app/api"
).replace(/\/+$/, "");

const About = () => {
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactSubmitted, setContactSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [contactError, setContactError] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    });

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setContactError(null);

        if (!contactForm.name.trim()) {
            setContactError("Veuillez saisir votre nom.");
            return;
        }
        if (!contactForm.email.trim()) {
            setContactError("Veuillez saisir votre adresse email.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email.trim())) {
            setContactError("Veuillez saisir une adresse email valide.");
            return;
        }
        if (!contactForm.subject.trim()) {
            setContactError("Veuillez saisir un sujet.");
            return;
        }
        if (!contactForm.message.trim()) {
            setContactError("Veuillez saisir votre message.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: contactForm.name,
                    email: contactForm.email,
                    subject: contactForm.subject,
                    message: contactForm.message,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.message || "Impossible d'envoyer le message pour le moment.");
            }

            setContactSubmitted(true);
            setTimeout(() => {
                setContactSubmitted(false);
                setIsContactOpen(false);
                setContactForm({ name: "", email: "", subject: "", message: "" });
            }, 2000);
        } catch (err) {
            setContactError(
                err instanceof TypeError
                    ? "Impossible de joindre le serveur. Vérifiez votre connexion Internet et réessayez."
                    : err.message || "Une erreur est survenue lors de l'envoi du message."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const openContactModal = () => {
        setContactError(null);
        setIsContactOpen(true);
    };

    const closeContactModal = () => {
        setContactError(null);
        setIsContactOpen(false);
    };

    return (
        <>
            <div className="report-container">
                <header className="report-header">
                    <Link to="/" className="back-link">
                        <ArrowLeft className="back-icon" aria-hidden="true" /> Retour à l'accueil
                    </Link>
                    <div className="header-title-wrapper">
                        <p className="report-kicker">Informations</p>
                        <h1 className="report-title">À propos de Tatero</h1>
                        <p className="report-subtitle">
                            Une application dédiée à la saisie et au suivi des rapports de facturation.
                        </p>
                    </div>
                </header>

                <main className="about-content">
                    <section className="about-card">
                        <h2>Un outil simple pour le suivi quotidien</h2>
                        <p>
                            <strong>Tatero</strong> est un projet personnel conçu pour offrir une interface claire, rapide et intuitive permettant d'enregistrer les factures journalières et d'éditer des synthèses hebdomadaires et mensuelles.
                        </p>
                    </section>

                    <section className="about-grid">
                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <Calculator className="feature-icon" aria-hidden="true" />
                            </div>
                            <h3>Saisie et calcul automatique</h3>
                            <p>Enregistrement rapide des données quotidiennes avec calcul instantané du coût moyen par patient.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <ShieldCheck className="feature-icon" aria-hidden="true" />
                            </div>
                            <h3>Alertes de seuil</h3>
                            <p>Détection automatique des coûts moyens supérieurs à 3 500 Ar avec justification structurée.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon-wrapper">
                                <CheckCircle2 className="feature-icon" aria-hidden="true" />
                            </div>
                            <h3>Synthèses et exports</h3>
                            <p>Regroupement par semaine et par mois avec export Excel prêt pour le suivi administratif.</p>
                        </div>
                    </section>

                    <section className="about-card credits-card">
                        <div className="credits-info">
                            <h2>Créateur du projet</h2>
                            <p className="hobby-note">
                                Conçu et développé par <strong>Mario Ramosa</strong>. N'hésitez pas à envoyer vos retours ou suggestions d'amélioration.
                            </p>
                        </div>

                        <div className="credits-author">
                            <button
                                type="button"
                                className="contact-dev-btn"
                                onClick={openContactModal}
                            >
                                <Mail size={16} aria-hidden="true" /> Me contacter
                            </button>
                        </div>
                    </section>
                </main>

                {isContactOpen && (
                    <div className="modal-backdrop" onClick={closeContactModal}>
                        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Envoyer un message</h3>
                                <button type="button" className="close-btn" onClick={closeContactModal} aria-label="Fermer">
                                    <X size={18} />
                                </button>
                            </div>

                            {contactSubmitted ? (
                                <div className="contact-success-state">
                                    <div className="success-icon-box">
                                        <Check size={24} aria-hidden="true" />
                                    </div>
                                    <h4>Message envoyé avec succès</h4>
                                    <p>Merci pour votre message. Je vous répondrai dès que possible.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="modal-body" noValidate>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label htmlFor="contact-name">Votre nom</label>
                                            <input
                                                id="contact-name"
                                                type="text"
                                                placeholder="ex: Rakoto"
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="contact-email">Votre email</label>
                                            <input
                                                id="contact-email"
                                                type="email"
                                                placeholder="ex: rakoto@mailaka.com"
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="contact-subject">Sujet</label>
                                            <input
                                                id="contact-subject"
                                                type="text"
                                                placeholder="Sujet de votre message"
                                                value={contactForm.subject}
                                                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="contact-message">Message</label>
                                            <textarea
                                                id="contact-message"
                                                rows="4"
                                                placeholder="Une idée d'amélioration ou une question..."
                                                value={contactForm.message}
                                                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>

                                    {contactError && <div className="alert error" role="alert">{contactError}</div>}

                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={closeContactModal}
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            className="submit-btn"
                                            disabled={isSubmitting}
                                            aria-busy={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="spinner" aria-hidden="true" />
                                                    Envoi...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={15} aria-hidden="true" /> Envoyer
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default About;