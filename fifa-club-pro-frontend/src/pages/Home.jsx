// src/pages/Home.jsx
import { useAuth } from "../auth/AuthContext";
import HomeNoClub from "./home/HomeNoClub";
import HomeAdmin from "./home/HomeAdmin";
import HomeMember from "./home/HomeMember";

export default function Home() {
  const { clubContext, booting, isLoggedIn } = useAuth();

  // Evita parpadeo mientras se hidrata localStorage
  if (booting) return null;

  // Si no está logeado, Home no debería mostrarse (pero por si acaso)
  if (!isLoggedIn) return null;

  // 1) Sin club
  if (!clubContext?.clubId) {
    return <HomeNoClub />;
  }

  // 2) Admin / Captain
  if (clubContext.role === "admin" || clubContext.role === "captain") {
    return <HomeAdmin />;
  }

  // 3) Member (default)
  return <HomeMember />;
}
