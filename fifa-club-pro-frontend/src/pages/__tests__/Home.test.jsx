// src/pages/__tests__/Home.test.jsx
import { screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import Home from "../Home";
import { renderWithRouter } from "../../test/renderWithRouter";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../home/HomeNoClub", () => ({
  default: () => <div>Mock HomeNoClub</div>,
}));

vi.mock("../home/HomeAdmin", () => ({
  default: () => <div>Mock HomeAdmin</div>,
}));

vi.mock("../home/HomeMember", () => ({
  default: () => <div>Mock HomeMember</div>,
}));

import { useAuth } from "../../auth/AuthContext";

describe("Home", () => {
  it("muestra loader mientras booting=true", () => {
    useAuth.mockReturnValue({
      clubContext: null,
      booting: true,
      isLoggedIn: true,
    });

    renderWithRouter(<Home />);
    expect(screen.getByText(/cargando inicio/i)).toBeInTheDocument();
  });

  it("no renderiza dashboard si no está logeado", () => {
    useAuth.mockReturnValue({
      clubContext: null,
      booting: false,
      isLoggedIn: false,
    });

    const { container } = renderWithRouter(<Home />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza HomeNoClub si no hay club activo", () => {
    useAuth.mockReturnValue({
      clubContext: null,
      booting: false,
      isLoggedIn: true,
    });

    renderWithRouter(<Home />);
    expect(screen.getByText("Mock HomeNoClub")).toBeInTheDocument();
  });

  it("renderiza HomeAdmin si el rol es admin", () => {
    useAuth.mockReturnValue({
      clubContext: {
        clubId: "club-1",
        role: "admin",
      },
      booting: false,
      isLoggedIn: true,
    });

    renderWithRouter(<Home />);
    expect(screen.getByText("Mock HomeAdmin")).toBeInTheDocument();
  });

  it("renderiza HomeAdmin si el rol es captain", () => {
    useAuth.mockReturnValue({
      clubContext: {
        clubId: "club-1",
        role: "captain",
      },
      booting: false,
      isLoggedIn: true,
    });

    renderWithRouter(<Home />);
    expect(screen.getByText("Mock HomeAdmin")).toBeInTheDocument();
  });

  it("renderiza HomeMember si el rol es member", () => {
    useAuth.mockReturnValue({
      clubContext: {
        clubId: "club-1",
        role: "member",
      },
      booting: false,
      isLoggedIn: true,
    });

    renderWithRouter(<Home />);
    expect(screen.getByText("Mock HomeMember")).toBeInTheDocument();
  });
});