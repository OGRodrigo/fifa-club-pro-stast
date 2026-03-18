// src/pages/__tests__/ClubAnalytics.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ClubAnalytics from "../ClubAnalytics";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const mockNavigate = vi.fn();

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage(clubId = "club-1", role = "admin") {
  useAuth.mockReturnValue({
    clubContext: {
      clubId,
      role,
    },
  });

  return render(<ClubAnalytics />);
}

function makeMembers() {
  return [
    {
      user: {
        _id: "u1",
        username: "rodrigo",
        gamerTag: "Rodri",
        platform: "PS5",
        country: "Chile",
      },
      role: "admin",
    },
    {
      user: {
        _id: "u2",
        username: "juanito",
        gamerTag: "Juan",
        platform: "PC",
        country: "Argentina",
      },
      role: "captain",
    },
    {
      user: {
        _id: "u3",
        username: "pedro99",
        gamerTag: "Pedro",
        platform: "Xbox",
        country: "Peru",
      },
      role: "member",
    },
  ];
}

function makeMatches() {
  return [
    {
      _id: "m1",
      date: "2026-03-17T18:30:00.000Z",
      competition: "League",
      status: "played",
      homeClub: { _id: "club-1", name: "Club One" },
      awayClub: { _id: "club-2", name: "Club Two" },
      scoreHome: 2,
      scoreAway: 1,
      playerStats: [
        {
          user: { _id: "u1" },
          goals: 2,
          assists: 1,
          rating: 8.5,
        },
        {
          user: { _id: "u2" },
          goals: 0,
          assists: 1,
          rating: 7.2,
        },
      ],
    },
    {
      _id: "m2",
      date: "2026-03-18T18:30:00.000Z",
      competition: "Cup",
      status: "played",
      homeClub: { _id: "club-3", name: "Club Three" },
      awayClub: { _id: "club-1", name: "Club One" },
      scoreHome: 0,
      scoreAway: 0,
      playerStats: [
        {
          user: { _id: "u1" },
          goals: 1,
          assists: 0,
          rating: 9.0,
        },
        {
          user: { _id: "u3" },
          goals: 0,
          assists: 1,
          rating: 7.0,
        },
      ],
    },
    {
      _id: "m3",
      date: "2026-03-19T18:30:00.000Z",
      competition: "Friendly",
      status: "played",
      homeClub: { _id: "other-club", name: "Other Club" },
      awayClub: { _id: "club-x", name: "Club X" },
      scoreHome: 5,
      scoreAway: 2,
      playerStats: [
        {
          user: { _id: "u1" },
          goals: 99,
          assists: 99,
          rating: 10,
        },
      ],
    },
  ];
}

function mockAnalyticsLoad({
  members = makeMembers(),
  matches = makeMatches(),
} = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === "/clubs/club-1/members") {
      return Promise.resolve({
        data: {
          members,
        },
      });
    }

    if (url === "/matches") {
      if (config?.params?.limit === 100) {
        return Promise.resolve({
          data: {
            data: matches,
          },
        });
      }
    }

    return Promise.reject(new Error(`GET no mockeado: ${url}`));
  });
}

describe("ClubAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("bloquea acceso para member", async () => {
    renderPage("club-1", "member");

    expect(
      await screen.findByText(/No autorizado\. Solo admin o captain\./i)
    ).toBeInTheDocument();
  });

  it("muestra loading y luego carga la analítica", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "admin");

    expect(
      screen.getByText(/Cargando analítica del club\.\.\./i)
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/members");
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: { limit: 100 },
      });
    });

    expect(
      screen.getByText(/Resumen global del rendimiento del club actual\./i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Forma reciente del club/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Distribución del plantel/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Últimos partidos del club/i)
    ).toBeInTheDocument();
  });

  it("filtra solo los partidos del club actual para la analítica", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    // Rodri suma solo m1 y m2 del club actual:
    // goles = 3, asistencias = 1, rating promedio = 8.75
    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8\.75/i).length).toBeGreaterThan(0);

    // El partido m3 no pertenece al club-1 y no debe contaminar la analítica.
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  it("muestra error si falla la carga", async () => {
    api.get.mockRejectedValueOnce({
      response: {
        data: {
          message: "Error al cargar analítica del club backend",
        },
      },
    });

    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Error al cargar analítica del club backend/i)
    ).toBeInTheDocument();
  });

  it("permite volver a home", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a home/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  it("permite navegar al detalle de un partido reciente", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    const matchButtons = screen.getAllByRole("button", {
      name: /Ver partido/i,
    });

    fireEvent.click(matchButtons[0]);

    expect(mockNavigate).toHaveBeenCalled();
    expect(
      mockNavigate.mock.calls.some(([arg]) => String(arg).includes("/matches/"))
    ).toBe(true);
  });

  it("permite navegar al detalle de un líder del club", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();

    const playerButtons = screen.getAllByRole("button", {
      name: /Ver jugador/i,
    });

    fireEvent.click(playerButtons[0]);

    expect(mockNavigate).toHaveBeenCalled();
    expect(
      mockNavigate.mock.calls.some(([arg]) =>
        String(arg).includes("/club/members-stats/")
      )
    ).toBe(true);
  });

  it("también permite acceso a captain", async () => {
    mockAnalyticsLoad();
    renderPage("club-1", "captain");

    expect(
      await screen.findByRole("heading", { name: /Club Analytics/i })
    ).toBeInTheDocument();
  });
});