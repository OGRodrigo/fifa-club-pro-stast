// src/auth/__tests__/ProtectedRoute.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import ProtectedRoute from "../ProtectedRoute";

vi.mock("../AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../AuthContext";

function AppUnderTest() {
  return (
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/login" element={<div>Pantalla Login</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute>
              <div>Contenido Privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("muestra loader mientras booting=true", () => {
    useAuth.mockReturnValue({
      isLoggedIn: false,
      booting: true,
    });

    render(<AppUnderTest />);
    expect(screen.getByText(/cargando sesión/i)).toBeInTheDocument();
  });

  it("redirige a /login si no hay sesión", () => {
    useAuth.mockReturnValue({
      isLoggedIn: false,
      booting: false,
    });

    render(<AppUnderTest />);
    expect(screen.getByText("Pantalla Login")).toBeInTheDocument();
  });

  it("renderiza children si hay sesión", () => {
    useAuth.mockReturnValue({
      isLoggedIn: true,
      booting: false,
    });

    render(<AppUnderTest />);
    expect(screen.getByText("Contenido Privado")).toBeInTheDocument();
  });
});