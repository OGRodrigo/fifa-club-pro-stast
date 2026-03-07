// src/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Protege rutas privadas:
 * - Si está booting, no redirige aún (evita parpadeo)
 * - Si no hay token, manda a /login
 */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, booting } = useAuth();

  if (booting) return null; // o un loader FIFA
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return children;
}
