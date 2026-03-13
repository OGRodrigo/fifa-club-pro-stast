// src/pages/Home.jsx
import { useAuth } from "../auth/AuthContext";
import HomeNoClub from "./home/HomeNoClub";
import HomeAdmin from "./home/HomeAdmin";
import HomeMember from "./home/HomeMember";

export default function Home() {
  const { clubContext, booting, isLoggedIn } = useAuth();

  if (booting) {
    return (
      <div className="rounded-2xl bg-fifa-card p-6 ring-1 ring-[var(--fifa-line)] shadow-glow">
        <p className="text-sm text-[var(--fifa-mute)]">Cargando inicio...</p>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  if (!clubContext?.clubId) {
    return <HomeNoClub />;
  }

  if (clubContext.role === "admin" || clubContext.role === "captain") {
    return <HomeAdmin />;
  }

  return <HomeMember />;
}