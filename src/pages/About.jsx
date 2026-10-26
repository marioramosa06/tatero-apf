import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    // FileText,
    ShieldCheck,
    Sparkles,
    Heart,
    CheckCircle2,
    Mail,
    Send,
    MessageSquare,
    X,
    Check,
    Smile
} from "lucide-react";
import "../styles/About.css";
import Footer from "../components/Footer";

const About = () => {
    const [isContactOpen, setIsContactOpen] = useState(false);
    const [contactSubmitted, setContactSubmitted] = useState(false);
    const [contactError, setContactError] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: "",
        email: "",
        subject: "Message pour Tatero",
        message: ""
    });

    const handleContactSubmit = (e) => {
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
        setContactSubmitted(true);
        setTimeout(() => {
            setContactSubmitted(false);
            setIsContactOpen(false);
            setContactForm({ name: "", email: "", subject: "Message pour Tatero", message: "" });
        }, 2000);
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
        <div className="report-container">
            {/* Header */}
            <header className="report-header">
                <Link to="/" className="back-link">
                    <ArrowLeft className="back-icon" />Retour à l'accueil
                </Link>
                <div className="header-title-wrapper">
                    {/* <span className="report-badge">Projet Personnel</span> */}
                    <h1 className="report-title">À propos de Tatero</h1>
                    <p className="report-subtitle">
                        Un petit projet développé par passion pour la programmation et le plaisir de créer.
                    </p>
                </div>
            </header>

            <main className="about-content">
                {/* Application Overview */}
                <section className="about-card">
                    <div className="about-section-header">
                        <Smile className="about-icon text-primary" />
                        <h2>Un projet conçu pour le plaisir de coder</h2>
                    </div>
                    <p>
                        <strong>Tatero</strong> est un projet personnel créé sur mon temps libre par pure passion pour le développement web. L'objectif était d'expérimenter, de pratiquer React et de concevoir une interface simple, agréable et intuitive pour gérer de petits rapports de facturation quotidienne, hebdomadaire et mensuelle.
                    </p>
                </section>

                {/* Key Features Grid */}
                <section className="about-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper card-primary">
                            <Sparkles className="feature-icon" />
                        </div>
                        <h3>Saisie & Calcul Automatique</h3>
                        <p>Une expérience fluide pour enregistrer rapidement les données et calculer les moyennes en un clin d'œil.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper card-secondary">
                            <ShieldCheck className="feature-icon" />
                        </div>
                        <h3>Alertes & Commentaires</h3>
                        <p>Détection automatique des coûts élevés pour ajouter un petit commentaire explicatif si nécessaire.</p>
                    </div>

                    {/* <div className="feature-card">
                        <div className="feature-icon-wrapper card-tertiary">
                            <CheckCircle2 className="feature-icon" />
                        </div>
                        <h3>Synthèses Intelligentes</h3>
                        <p>Regroupement pratique par semaine et par mois pour visualiser facilement les tendances.</p>
                    </div> */}
                </section>

                {/* Developer Credits */}
                <section className="about-card credits-card">
                    <div className="credits-info">
                        <div className="about-section-header">
                            <Heart className="about-icon text-secondary" />
                            <h2>Créateur du projet</h2>
                        </div>
                        <p className="hobby-note">
                            Ce projet fait partie de mon laboratoire d'apprentissage continu. N'hésitez pas à me faire part de vos idées ou de vos impressions !
                        </p>
                    </div>

                    <div className="credits-author">
                        <div className="author-badge">
                            <Heart className="heart-icon" />
                            <span>Créé par <strong>Mario Ramosa</strong></span>
                        </div>
                        <button
                            className="contact-dev-btn"
                            onClick={openContactModal}
                        >
                            <Mail size={16} /> Me contacter
                        </button>
                    </div>
                </section>
            </main>
            <Footer />

            {/* Contact Developer Modal */}
            {isContactOpen && (
                <div className="modal-backdrop" onClick={closeContactModal}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {/* <MessageSquare className="field-icon" />  */}
                                Envoyer un message à Mario
                            </h3>
                            <button className="close-btn" onClick={closeContactModal}>
                                <X size={20} />
                            </button>
                        </div>

                        {contactSubmitted ? (
                            <div className="contact-success-state">
                                <div className="success-icon-box">
                                    <Check size={32} />
                                </div>
                                <h4>Message envoyé avec succès !</h4>
                                <p>Merci pour votre message. Je vous répondrai avec plaisir dès que possible.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleContactSubmit} className="modal-body" noValidate>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Votre nom :</label>
                                        <input
                                            type="text"
                                            placeholder="ex: Alex"
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Votre Email :</label>
                                        <input
                                            type="email"
                                            placeholder="exemple@domaine.com"
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Sujet :</label>
                                        <input
                                            type="text"
                                            value={contactForm.subject}
                                            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Message :</label>
                                        <textarea
                                            rows="4"
                                            placeholder="Une idée d'amélioration, une question ou simplement un mot d'encouragement..."
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
                                    <button type="submit" className="submit-btn">
                                        <Send size={16} /> Envoyer
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default About;