import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = ({ className = "", ...inputProps }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="password-input-wrapper">
            <input
                {...inputProps}
                className={className}
                type={isVisible ? "text" : "password"}
            />
            <button
                type="button"
                className="password-visibility-toggle"
                aria-label={isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                aria-pressed={isVisible}
                onClick={() => setIsVisible((visible) => !visible)}
            >
                {isVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    );
};

export default PasswordInput;
