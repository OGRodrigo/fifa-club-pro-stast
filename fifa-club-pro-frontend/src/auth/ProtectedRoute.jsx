// src/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * =====================================================
 * PROTECTED ROUTE
 * -----------------------------------------------------
 * - Si AuthContext está booting, no redirige todavía
 * - Si no hay sesión, manda a /login
 * - Si hay sesión, renderiza children
 * =====================================================
 */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, booting } = useAuth();

  if (booting) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}