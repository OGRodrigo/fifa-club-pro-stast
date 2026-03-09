import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import FifaLoader from "../components/FifaLoader";

export default function ProtectedRoute({ children }) {

  const { isLoggedIn, booting } = useAuth();

  if (booting) {
    return <FifaLoader text="Verificando sesión..." />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}