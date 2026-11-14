import "../styles/Footer.css";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="bottom-container">
                <p className="copyright-text">
                    &copy; {currentYear} Tatero
                </p>
                <p className="author-credit">
                    Par Mario Ramosa
                </p>
            </div>
        </footer>
    );
};

export default Footer;