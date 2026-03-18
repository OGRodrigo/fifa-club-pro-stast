// src/pages/home/__tests__/HomeAdmin.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HomeAdmin from "../HomeAdmin";
import { api } from "../../../api/client";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../ui/ToastContext";

const mockNavigate = vi.fn();
const mockClearClubContext = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../../api/client", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../ui/ToastContext", () => ({
  useToast: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage({ clubId = "club-1", role = "admin" } = {}) {
  useAuth.mockReturnValue({
    clubContext: {
      clubId,
      role,
    },
    clearClubContext: mockClearClubContext,
  });

  useToast.mockReturnValue({
    success: mockToastSuccess,
    error: mockToastError,
  });

  return render(<HomeAdmin />);
}

function makeSummary() {
  return {
    overall: {
      played: 10,
      wins: 7,
      draws: 2,
      losses: 1,
      goalsFor: 20,
      goalsAgainst: 8,
      points: 23,
    },
    averages: {
      pointsPerMatch: 2.3,
      goalsForPerMatch: 2.0,
    },
    streaks: {
      maxUnbeaten: 6,
    },
  };
}

function makeLeaderboards() {
  return {
    leaderboards: {
      topScorers: [
        {
          username: "rodrigo",
          gamerTag: "Rodri",
          goals: 9,
          played: 10,
        },
      ],
      topAssists: [
        {
          username: "juanito",
          gamerTag: "Juan",
          assists: 7,
          played: 10,
        },
      ],
      mvpSeason: {
        username: "rodrigo",
        gamerTag: "Rodri",
        points: 18,
        goals: 9,
        assists: 7,
        played: 10,
      },
      notes: {
        topScorers: "Máximo goleador",
        topAssists: "Máximo asistidor",
        mvpSeason: "Mejor jugador global",
      },
    },
  };
}

function makeRecentMatches() {
  return [
    {
      _id: "m1",
      date: "2026-03-17T18:30:00.000Z",
      homeClub: { _id: "club-1", name: "Club One" },
      awayClub: { _id: "club-2", name: "Club Two" },
      scoreHome: 2,
      scoreAway: 1,
      stadium: "Monumental",
    },
    {
      _id: "m2",
      date: "2026-03-18T18:30:00.000Z",
      homeClub: { _id: "club-3", name: "Club Three" },
      awayClub: { _id: "club-1", name: "Club One" },
      scoreHome: 0,
      scoreAway: 0,
      stadium: "Nacional",
    },
  ];
}

function mockHomeAdminLoad({
  seasons = ["2026", "2025"],
  summary = makeSummary(),
  leaderboards = makeLeaderboards(),
  recentMatches = makeRecentMatches(),
} = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === "/league/seasons") {
      return Promise.resolve({
        data: { seasons },
      });
    }

    if (url === "/stats/club/club-1/summary") {
      return Promise.resolve({
        data: summary,
      });
    }

    if (url === "/clubs/club-1/players/leaderboards") {
      return Promise.resolve({
        data: leaderboards,
      });
    }

    if (url === "/matches") {
      if (
        config?.params?.season &&
        config?.params?.club === "club-1" &&
        config?.params?.page === 1 &&
        config?.params?.limit === 5
      ) {
        return Promise.resolve({
          data: {
            data: recentMatches,
          },
        });
      }
    }

    return Promise.reject(new Error(`GET no mockeado: ${url}`));
  });
}

describe("HomeAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockClearClubContext.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    window.confirm = vi.fn(() => true);
  });

  it("muestra guard si no hay club activo", async () => {
    renderPage({ clubId: "", role: "admin" });

    expect(
      await screen.findByText(/No tienes un club activo seleccionado\./i)
    ).toBeInTheDocument();
  });

  it("carga temporadas y dashboard del club", async () => {
    mockHomeAdminLoad();
    renderPage({ clubId: "club-1", role: "admin" });

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/league/seasons");
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/stats/club/club-1/summary", {
        params: { season: "2026" },
      });
      expect(api.get).toHaveBeenCalledWith(
        "/clubs/club-1/players/leaderboards",
        {
          params: { season: "2026", limit: 10 },
        }
      );
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: {
          season: "2026",
          club: "club-1",
          page: 1,
          limit: 5,
        },
      });
    });

    expect(screen.getByText(/Administrador/i)).toBeInTheDocument();
    expect(screen.getByText(/ACCESOS RÁPIDOS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ÚLTIMOS PARTIDOS DEL CLUB/i)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("usa año actual como fallback si seasons falla", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.reject(new Error("fallo seasons"));
      }

      if (url === "/stats/club/club-1/summary") {
        return Promise.resolve({ data: makeSummary() });
      }

      if (url === "/clubs/club-1/players/leaderboards") {
        return Promise.resolve({ data: makeLeaderboards() });
      }

      if (url === "/matches") {
        return Promise.resolve({
          data: { data: makeRecentMatches() },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    const currentYear = String(new Date().getFullYear());

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/stats/club/club-1/summary", {
        params: { season: currentYear },
      });
    });
  });

  it("muestra loading mientras carga", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: { seasons: ["2026"] },
        });
      }

      return new Promise(() => {});
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(await screen.findByText(/Cargando dashboard…/i)).toBeInTheDocument();
  });

  it("muestra error si falla la carga del dashboard", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: { seasons: ["2026"] },
        });
      }

      if (url === "/stats/club/club-1/summary") {
        return Promise.reject({
          response: {
            data: {
              message: "Error cargando HomeAdmin backend",
            },
          },
        });
      }

      if (url === "/clubs/club-1/players/leaderboards") {
        return Promise.resolve({ data: makeLeaderboards() });
      }

      if (url === "/matches") {
        return Promise.resolve({
          data: { data: makeRecentMatches() },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByText(/Error cargando HomeAdmin backend/i)
    ).toBeInTheDocument();
  });

  it("permite cambiar temporada y recargar datos", async () => {
    mockHomeAdminLoad({
      seasons: ["2026", "2025"],
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    const seasonSelect = screen.getByRole("combobox");
    fireEvent.change(seasonSelect, { target: { value: "2025" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/stats/club/club-1/summary", {
        params: { season: "2025" },
      });
      expect(api.get).toHaveBeenCalledWith(
        "/clubs/club-1/players/leaderboards",
        {
          params: { season: "2025", limit: 10 },
        }
      );
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: {
          season: "2025",
          club: "club-1",
          page: 1,
          limit: 5,
        },
      });
    });
  });

  it("navega usando accesos rápidos", async () => {
    mockHomeAdminLoad();
    renderPage({ clubId: "club-1", role: "admin" });

    expect(await screen.findByText(/ACCESOS RÁPIDOS/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Partidos\s+Registrar, editar y revisar matches/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/matches");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Solicitudes\s+Revisar ingresos al club/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/clubs/join-requests");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Miembros\s+Ver rendimiento del plantel/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/club/members-stats");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Club Analytics\s+Vista ejecutiva del equipo/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/club/analytics");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Liga\s+Ver tabla y premios/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/league");
  });

  it("navega al detalle de un partido reciente", async () => {
    mockHomeAdminLoad();
    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByText(/ÚLTIMOS PARTIDOS DEL CLUB/i)
    ).toBeInTheDocument();

    let matchButtons = [];

    await waitFor(() => {
      matchButtons = screen.getAllByRole("button").filter((btn) => {
        const text = btn.textContent || "";
        return (
          text.includes("Club One") &&
          text.includes("Club Two") &&
          text.includes("2") &&
          text.includes("1")
        );
      });

      expect(matchButtons.length).toBeGreaterThan(0);
    });

    fireEvent.click(matchButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/matches/m1");
  });

  it("muestra fallback cuando no hay partidos recientes", async () => {
    mockHomeAdminLoad({
      recentMatches: [],
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByText(/No hay partidos registrados para esta temporada\./i)
    ).toBeInTheDocument();
  });

  it("permite eliminar club siendo admin", async () => {
    mockHomeAdminLoad();
    api.delete.mockResolvedValueOnce({ data: { ok: true } });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByRole("button", { name: /Eliminar club/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Eliminar club/i }));

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/clubs/club-1");
    });

    expect(mockClearClubContext).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith("Club eliminado correctamente.");
    expect(mockNavigate).toHaveBeenCalledWith("/clubs", { replace: true });
  });

  it("si no es admin no muestra botón eliminar club", async () => {
    mockHomeAdminLoad();
    renderPage({ clubId: "club-1", role: "captain" });

    expect(await screen.findByText(/Capitán/i)).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /Eliminar club/i })
    ).not.toBeInTheDocument();
  });

  it("muestra error toast si falla eliminar club", async () => {
    mockHomeAdminLoad();
    api.delete.mockRejectedValueOnce({
      response: {
        data: {
          message: "No se pudo eliminar el club backend",
        },
      },
    });

    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByRole("button", { name: /Eliminar club/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Eliminar club/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/clubs/club-1");
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "No se pudo eliminar el club backend"
    );
  });

  it("si cancela confirmación no elimina club", async () => {
    mockHomeAdminLoad();
    window.confirm = vi.fn(() => false);

    renderPage({ clubId: "club-1", role: "admin" });

    expect(
      await screen.findByRole("button", { name: /Eliminar club/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Eliminar club/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});