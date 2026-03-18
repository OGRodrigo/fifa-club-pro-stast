// src/pages/__tests__/MatchDetail.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MatchDetail from "../MatchDetail";
import { api } from "../../api/client";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

function makeMatch() {
  return {
    _id: "m1",
    date: "2026-03-17T18:30:00.000Z",
    season: "S1",
    competition: "League",
    status: "played",
    stadium: "Monumental",
    homeClub: { _id: "club-1", name: "Club One" },
    awayClub: { _id: "club-2", name: "Club Two" },
    scoreHome: 2,
    scoreAway: 1,
    teamStats: {
      home: {
        possession: 55,
        shots: 10,
        shotsOnTarget: 6,
        passes: 120,
        passesCompleted: 100,
      },
      away: {
        possession: 45,
        shots: 8,
        shotsOnTarget: 3,
        passes: 110,
        passesCompleted: 90,
      },
    },
    lineups: {
      home: {
        formation: "4-3-3",
        players: [
          {
            user: { _id: "u1", username: "rodrigo", gamerTag: "Rodri" },
            shirtNumber: 10,
            position: "ST",
            starter: true,
          },
        ],
      },
      away: {
        formation: "4-4-2",
        players: [
          {
            user: { _id: "u2", username: "juanito", gamerTag: "Juan" },
            shirtNumber: 9,
            position: "ST",
            starter: true,
          },
        ],
      },
    },
    playerStats: [
      {
        user: { _id: "u1", username: "rodrigo", gamerTag: "Rodri" },
        club: { _id: "club-1", name: "Club One" },
        position: "ST",
        rating: 8.5,
        minutesPlayed: 90,
        goals: 2,
        assists: 1,
        shots: 5,
        shotsOnTarget: 3,
        passes: 20,
        passesCompleted: 16,
        dribbles: 4,
        dribblesWon: 2,
        tackles: 1,
        tacklesWon: 1,
        interceptions: 0,
        recoveries: 3,
        isMVP: true,
      },
      {
        user: { _id: "u2", username: "juanito", gamerTag: "Juan" },
        club: { _id: "club-2", name: "Club Two" },
        position: "ST",
        rating: 7.2,
        minutesPlayed: 90,
        goals: 1,
        assists: 0,
        shots: 4,
        shotsOnTarget: 2,
        passes: 18,
        passesCompleted: 12,
        dribbles: 3,
        dribblesWon: 1,
        tackles: 0,
        tacklesWon: 0,
        interceptions: 1,
        recoveries: 2,
        isMVP: false,
      },
    ],
  };
}

function renderPage(id = "m1") {
  mockUseParams.mockReturnValue({ id });
  return render(<MatchDetail />);
}

describe("MatchDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("muestra error si falta el id del partido", async () => {
    renderPage("");

    expect(
      await screen.findByText(/ID de partido inválido/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a partidos/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });

  it("muestra error si falla la carga del detalle", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/matches/m1/full") {
        return Promise.reject({
          response: {
            data: {
              message: "Error al cargar detalle backend",
            },
          },
        });
      }

      if (url === "/matches/m1/mvp") {
        return Promise.resolve({
          data: {
            mvp: {
              username: "rodrigo",
              gamerTag: "Rodri",
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage("m1");

    expect(
      await screen.findByText(/Error:\s*Error al cargar detalle backend/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a partidos/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });

  it("muestra mensaje si no se encuentra el partido", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/matches/m1/full") {
        return Promise.resolve({
          data: null,
        });
      }

      if (url === "/matches/m1/mvp") {
        return Promise.resolve({
          data: { mvp: null },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage("m1");

    expect(
      await screen.findByText(/No se encontró el partido\./i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a partidos/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });

  it("carga y muestra el detalle completo del partido", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/matches/m1/full") {
        return Promise.resolve({
          data: makeMatch(),
        });
      }

      if (url === "/matches/m1/mvp") {
        return Promise.resolve({
          data: {
            mvp: {
              username: "rodrigo",
              gamerTag: "Rodri",
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage("m1");

    expect(
      await screen.findByText(/DETALLE DEL PARTIDO/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/matches/m1/full");
      expect(api.get).toHaveBeenCalledWith("/matches/m1/mvp");
    });

    expect(
      screen.getByRole("heading", { name: /Club One\s*vs\s*Club Two/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/Monumental/i)).toBeInTheDocument();
    expect(screen.getByText(/TEAM STATS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MVP DEL PARTIDO/i).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Club One/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Club Two/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Juan/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/Marcador final/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^2$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^1$/).length).toBeGreaterThan(0);
  });

  it("si falla el endpoint de mvp igual muestra el detalle y deja mvp vacío", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/matches/m1/full") {
        return Promise.resolve({
          data: makeMatch(),
        });
      }

      if (url === "/matches/m1/mvp") {
        return Promise.reject({
          response: {
            data: {
              message: "No MVP",
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage("m1");

    expect(
      await screen.findByText(/DETALLE DEL PARTIDO/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/No hay MVP disponible para este partido\./i)
    ).toBeInTheDocument();
  });

  it("permite volver a la lista de partidos desde el detalle", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/matches/m1/full") {
        return Promise.resolve({
          data: makeMatch(),
        });
      }

      if (url === "/matches/m1/mvp") {
        return Promise.resolve({
          data: {
            mvp: {
              username: "rodrigo",
              gamerTag: "Rodri",
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    renderPage("m1");

    expect(
      await screen.findByText(/DETALLE DEL PARTIDO/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Ir a partidos/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });
});