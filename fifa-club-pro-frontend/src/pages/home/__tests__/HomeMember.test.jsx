// src/pages/home/__tests__/HomeMember.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import HomeMember from "../HomeMember";
import { api } from "../../../api/client";
import { useAuth } from "../../../auth/AuthContext";

const mockNavigate = vi.fn();

vi.mock("../../../api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage({
  clubId = "club-1",
  user = {
    username: "rodrigo",
    gamerTag: "Rodri",
  },
} = {}) {
  useAuth.mockReturnValue({
    user,
    clubContext: {
      clubId,
      role: "member",
    },
  });

  return render(<HomeMember />);
}

function makeSeasons() {
  return ["2026", "2025"];
}

function makeMyStats(overrides = {}) {
  return {
    played: 10,
    goals: 4,
    assists: 2,
    goalContrib: 6,
    goalPerMatch: 0.4,
    assistPerMatch: 0.2,
    contribPerMatch: 0.6,
    ...overrides,
  };
}

function makeMatches() {
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

function mockHomeMemberLoad({
  seasons = makeSeasons(),
  myStats = makeMyStats(),
  matches = makeMatches(),
  seasonsFails = false,
  statsFails = false,
} = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === "/league/seasons") {
      if (seasonsFails) {
        return Promise.reject(new Error("Error seasons"));
      }

      return Promise.resolve({
        data: { seasons },
      });
    }

    if (url === "/clubs/club-1/players/me/stats") {
      if (statsFails) {
        return Promise.reject({
          response: {
            data: {
              message: "Error cargando HomeMember backend",
            },
          },
        });
      }

      return Promise.resolve({
        data: myStats,
      });
    }

    if (url === "/matches") {
      if (
        config?.params?.club === "club-1" &&
        config?.params?.page === 1 &&
        config?.params?.limit === 5
      ) {
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

function getStatCardByLabel(label) {
  const labelNodes = screen.getAllByText(new RegExp(`^${label}$`, "i"));

  const card = labelNodes
    .map((node) => node.closest(".rounded-xl"))
    .find((candidate) => {
      if (!candidate) return false;

      return Boolean(
        candidate.querySelector(".text-2xl.font-extrabold") ||
          candidate.querySelector(".text-lg.font-extrabold")
      );
    });

  expect(card).toBeTruthy();
  return card;
}

describe("HomeMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("muestra guard si no hay club activo", async () => {
    renderPage({ clubId: "" });

    expect(await screen.findByText(/INICIO/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No tienes un club activo seleccionado\./i)
    ).toBeInTheDocument();
  });

  it("carga temporadas, stats del miembro y partidos recientes", async () => {
    mockHomeMemberLoad();
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/league/seasons");
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/players/me/stats", {
        params: { season: "2026" },
      });
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: {
          season: "2026",
          club: "club-1",
          page: 1,
          limit: 5,
        },
      });
    });

    await waitFor(() => {
      expect(within(getStatCardByLabel("Partidos")).getByText(/^10$/)).toBeInTheDocument();
      expect(within(getStatCardByLabel("Goles")).getByText(/^4$/)).toBeInTheDocument();
      expect(within(getStatCardByLabel("Asistencias")).getByText(/^2$/)).toBeInTheDocument();
      expect(within(getStatCardByLabel("Contribución")).getByText(/^6$/)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
  });

  it("usa año actual como fallback si seasons falla", async () => {
    mockHomeMemberLoad({ seasonsFails: true });
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    const currentYear = String(new Date().getFullYear());
    expect(screen.getByDisplayValue(currentYear)).toBeInTheDocument();
  });

  it("muestra loading mientras carga", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: { seasons: ["2026"] },
        });
      }

      if (url === "/clubs/club-1/players/me/stats") {
        return new Promise(() => {});
      }

      if (url === "/matches") {
        return new Promise(() => {});
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage();

    expect(await screen.findByText(/Cargando tus stats/i)).toBeInTheDocument();
  });

  it("muestra error si falla la carga", async () => {
    mockHomeMemberLoad({ statsFails: true });
    renderPage();

    expect(
      await screen.findByText(/Error cargando HomeMember backend/i)
    ).toBeInTheDocument();
  });

  it("permite cambiar temporada y recargar datos", async () => {
    mockHomeMemberLoad();
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "2025" },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/players/me/stats", {
        params: { season: "2025" },
      });
    });
  });

  it("navega usando accesos rápidos", async () => {
    mockHomeMemberLoad();
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Partidos\s+Ver los partidos recientes del club/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/matches");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Liga\s+Ver tabla y panorama competitivo/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/league");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Inicio\s+Mantenerte en tu panel personal/i,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  it("navega al detalle de un partido reciente", async () => {
    mockHomeMemberLoad();
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Monumental/i)).toBeInTheDocument();
    });

    const matchButtons = screen.getAllByRole("button").filter((btn) =>
      btn.textContent?.includes("Monumental")
    );

    expect(matchButtons.length).toBeGreaterThan(0);

    fireEvent.click(matchButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/matches/m1");
  });

  it("muestra fallback cuando no hay partidos recientes", async () => {
    mockHomeMemberLoad({ matches: [] });
    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No hay partidos registrados para esta temporada\./i)
    ).toBeInTheDocument();
  });

  it("usa username si no existe gamerTag", async () => {
    mockHomeMemberLoad();
    renderPage({
      user: {
        username: "rodrigo_only",
      },
    });

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rodrigo_only/i).length).toBeGreaterThan(0);
  });

  it("usa 'usuario' como fallback si no hay gamerTag ni username", async () => {
    mockHomeMemberLoad();
    renderPage({
      user: {},
    });

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/usuario/i).length).toBeGreaterThan(0);
  });

  it("calcula acciones gol como goles + asistencias", async () => {
    mockHomeMemberLoad({
      myStats: {
        played: 8,
        goals: 5,
        assists: 3,
        goalContrib: 8,
        goalPerMatch: 0.63,
        assistPerMatch: 0.38,
        contribPerMatch: 1.01,
      },
    });

    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(within(getStatCardByLabel("Contribución")).getByText(/^8$/)).toBeInTheDocument();
      expect(within(getStatCardByLabel("Acciones gol")).getByText(/^8$/)).toBeInTheDocument();
    });
  });

  it("usa contrib como fallback si no existe goalContrib", async () => {
    mockHomeMemberLoad({
      myStats: {
        played: 12,
        goals: 4,
        assists: 5,
        contrib: 9,
        goalPerMatch: 0.33,
        assistPerMatch: 0.42,
        contribPerMatch: 0.75,
      },
    });

    renderPage();

    expect(await screen.findByText(/Estado:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(within(getStatCardByLabel("Contribución")).getByText(/^9$/)).toBeInTheDocument();
      expect(within(getStatCardByLabel("Acciones gol")).getByText(/^9$/)).toBeInTheDocument();
    });
  });
});