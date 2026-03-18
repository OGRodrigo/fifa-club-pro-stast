// src/pages/__tests__/Dashboard.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Dashboard from "../Dashboard";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

function makeDashboardData() {
  return {
    table: [
      {
        clubId: "club-1",
        clubName: "Club One",
        played: 10,
        wins: 7,
        draws: 2,
        losses: 1,
        goalsFor: 20,
        goalsAgainst: 8,
        goalDifference: 12,
        points: 23,
      },
      {
        clubId: "club-2",
        clubName: "Club Two",
        played: 10,
        wins: 6,
        draws: 1,
        losses: 3,
        goalsFor: 18,
        goalsAgainst: 11,
        goalDifference: 7,
        points: 19,
      },
    ],
    leaderboards: {
      topScorers: [
        { username: "rodrigo", gamerTag: "Rodri", goals: 9 },
        { username: "juanito", gamerTag: "Juan", goals: 6 },
      ],
      topAssists: [
        { username: "pedro99", gamerTag: "Pedro", assists: 7 },
      ],
      mvp: {
        username: "rodrigo",
        gamerTag: "Rodri",
      },
    },
    extras: {
      bestAttack: [
        { clubName: "Club One", goalsFor: 20 },
      ],
      bestDefense: [
        { clubName: "Club One", goalsAgainst: 8 },
      ],
      cleanSheets: [
        { clubName: "Club Two", cleanSheets: 4 },
      ],
    },
  };
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra loading al inicio", () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText(/Cargando liga\.\.\./i)).toBeInTheDocument();
  });

  it("carga temporadas y luego dashboard", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: ["S2", "S1"],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.resolve({
          data: makeDashboardData(),
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Liga/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/league/seasons");
      expect(api.get).toHaveBeenCalledWith("/league/dashboard", {
        params: { season: "S2" },
      });
    });

    expect(
      screen.getByText(/Tabla, premios y resumen competitivo por temporada/i)
    ).toBeInTheDocument();

    expect(screen.getAllByText(/Club One/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/TABLA DE POSICIONES/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MVP DE LA TEMPORADA/i).length).toBeGreaterThan(0);
  });

  it("carga dashboard sin season si no hay temporadas", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: [],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.resolve({
          data: {
            table: [],
            leaderboards: {},
            extras: {},
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Liga/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/league/seasons");
      expect(api.get).toHaveBeenCalledWith("/league/dashboard", {
        params: {},
      });
    });

    expect(screen.getByText(/No hay datos en la tabla\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Aún no hay MVP para esta temporada\./i)
    ).toBeInTheDocument();
  });

  it("permite cambiar la temporada y recargar el dashboard", async () => {
    api.get.mockImplementation((url, config) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: ["S2", "S1"],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.resolve({
          data: makeDashboardData(),
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Liga/i })
    ).toBeInTheDocument();

    const seasonSelect = screen.getByRole("combobox");
    fireEvent.change(seasonSelect, { target: { value: "S1" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/league/dashboard", {
        params: { season: "S1" },
      });
    });
  });

  it("muestra error si falla la carga del dashboard", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: ["S1"],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.reject({
          response: {
            data: {
              message: "Error backend dashboard",
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByText(/Error:\s*Error backend dashboard/i)
    ).toBeInTheDocument();
  });

  it("muestra fallback del mvp cuando no existe", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: ["S1"],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.resolve({
          data: {
            table: [],
            leaderboards: {
              topScorers: [],
              topAssists: [],
              mvp: null,
            },
            extras: {
              bestAttack: [],
              bestDefense: [],
              cleanSheets: [],
            },
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Liga/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Aún no hay MVP para esta temporada\./i)
    ).toBeInTheDocument();
  });

  it("muestra fallback de tabla vacía", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/league/seasons") {
        return Promise.resolve({
          data: {
            seasons: ["S1"],
          },
        });
      }

      if (url === "/league/dashboard") {
        return Promise.resolve({
          data: {
            table: [],
            leaderboards: {},
            extras: {},
          },
        });
      }

      return Promise.reject(new Error(`GET no mockeado: ${url}`));
    });

    render(<Dashboard />);

    expect(
      await screen.findByRole("heading", { name: /Liga/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/No hay datos en la tabla\./i)).toBeInTheDocument();
  });
});