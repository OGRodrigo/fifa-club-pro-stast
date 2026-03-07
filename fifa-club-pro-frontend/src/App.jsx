import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";

// públicas
import Login from "./pages/Login";
import Register from "./pages/Register";

// privadas
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import JoinRequests from "./pages/JoinRequests";
import MemberStats from "./pages/MemberStats";
import Clubs from "./pages/Clubs";
import CreateClub from "./pages/CreateClub";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";

import ProtectedRoute from "./auth/ProtectedRoute";

function Private({ children }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Privadas */}
        <Route
          path="/home"
          element={
            <Private>
              <Home />
            </Private>
          }
        />

        <Route
          path="/league"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />

        <Route
          path="/league/dashboard"
          element={
            <Private>
              <Dashboard />
            </Private>
          }
        />

        <Route
          path="/clubs"
          element={
            <Private>
              <Clubs />
            </Private>
          }
        />

        <Route
          path="/clubs/create"
          element={
            <Private>
              <CreateClub />
            </Private>
          }
        />

        <Route
          path="/clubs/join-requests"
          element={
            <Private>
              <JoinRequests />
            </Private>
          }
        />

        <Route
          path="/club/members-stats"
          element={
            <Private>
              <MemberStats />
            </Private>
          }
        />

        <Route
          path="/matches"
          element={
            <Private>
              <Matches />
            </Private>
          }
        />

        <Route
          path="/matches/:id"
          element={
            <Private>
              <MatchDetail />
            </Private>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}