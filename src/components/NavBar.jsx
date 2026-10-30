import { Link, NavLink } from "react-router-dom";
import {
    Home,
    FilePlus,
    CalendarDays,
    BarChart3,
    Info,
    ArrowLeft
} from "lucide-react";
import "../styles/NavBar.css";

const Navbar = () => {
    return (
        <header className="desktop-navbar">
            <div className="nav-container">
                {/* Brand Logo & Name */}
                <NavLink to="/" className="nav-brand">
                    <svg
                        width="28"
                        height="28"
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
                    </svg>
                    <span className="nav-brand-name">Tatero</span>
                </NavLink>
                {/* <Link to="/" className="back-link nav-brand">
                    <ArrowLeft className="back-icon" />Retour à l'accueil
                </Link> */}

                {/* Navigation Links */}
                <nav className="nav-links">
                    {/* <NavLink to="/" end className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Home className="nav-icon" />
                        <span>Accueil</span>
                    </NavLink> */}

                    <NavLink to="/invoices/new" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        {/* <FilePlus className="nav-icon" /> */}
                        <span>Journalier</span>
                    </NavLink>

                    <NavLink to="/reports/week" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        {/* <CalendarDays className="nav-icon" /> */}
                        <span>Hebdomadaire</span>
                    </NavLink>

                    <NavLink to="/reports/month" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        {/* <BarChart3 className="nav-icon" /> */}
                        <span>Mensuel</span>
                    </NavLink>

                    <NavLink to="/about" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        {/* <Info className="nav-icon" /> */}
                        <span>À propos</span>
                    </NavLink>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;