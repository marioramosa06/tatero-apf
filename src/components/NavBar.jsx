import { NavLink } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import "../styles/NavBar.css";

const Navbar = () => {
    return (
        <header className="desktop-navbar">
            <div className="nav-container">
                <NavLink to="/" className="nav-brand">
                    <span className="nav-brand-name">Tatero</span>
                </NavLink>

                <nav className="nav-links" aria-label="Navigation principale">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <span>Tableau de bord</span>
                    </NavLink>

                    <NavLink to="/invoices" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <span>Factures</span>
                    </NavLink>

                    <NavLink to="/invoices/new" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <span>Journalier</span>
                    </NavLink>

                    <NavLink to="/reports/week" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <span>Hebdomadaire</span>
                    </NavLink>

                    <NavLink to="/reports/month" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <span>Mensuel</span>
                    </NavLink>
                </nav>

                <div className="nav-actions">
                    <NavLink
                        to="/profile"
                        className={({ isActive }) => isActive ? "nav-profile-btn active" : "nav-profile-btn"}
                    >
                        <CircleUserRound className="nav-icon" aria-hidden="true" />
                        <span>Profil</span>
                    </NavLink>
                </div>
            </div>
        </header>
    );
};

export default Navbar;