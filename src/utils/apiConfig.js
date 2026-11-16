export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://api-tatero-apf.vercel.app/api"
).replace(/\/+$/, "");

export const AUTH_EXPIRED_EVENT = "tatero:auth-expired";

export const notifyAuthExpired = () => {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
};
