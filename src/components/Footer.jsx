import { Link } from "react-router-dom";
import {
    FilePlus,
    CalendarDays,
    BarChart3,
    Info,
    Heart,
    // Github,
    Globe,
    Code
} from "lucide-react";
import "../styles/Footer.css";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">

            {/* Bottom Bar / Copyright */}
            {/* <div className="footer-bottom"> */}
            <div className="bottom-container">
                <p className="copyright-text">
                    &copy; {currentYear} <strong>Tatero</strong>.
                </p>
                <p className="author-credit">
                    By <strong>Mario Ramosa</strong>
                </p>
            </div>
            {/* </div> */}
        </footer>
    );
};

export default Footer;