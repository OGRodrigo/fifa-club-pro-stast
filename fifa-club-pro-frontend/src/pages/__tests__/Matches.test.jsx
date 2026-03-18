// src/pages/__tests__/Matches.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Matches from "../Matches";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const mockNavigate = vi.fn();

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

  return render(<Matches />);
}

function makeClubs() {
  return [
    { _id: "club-1", name: "Club One", country: "Chile" },
    { _id: "club-2", name: "Club Two", country: "Argentina" },
    { _id: "club-3", name: "Club Three", country: "Peru" },
  ];
}

function makeMembers() {
  return [
    {
      user: {
        _id: "u1",
        username: "rodrigo",
        gamerTag: "Rodri",
        platform: "PS5",
      },
    },
    {
      user: {
        _id: "u2",
        username: "juanito",
        gamerTag: "Juan",
        platform: "PC",
      },
    },
  ];
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
      competition: "League",
      status: "played",
    },
    {
      _id: "m2",
      date: "2026-03-18T18:30:00.000Z",
      homeClub: { _id: "club-3", name: "Club Three" },
      awayClub: { _id: "club-1", name: "Club One" },
      scoreHome: 0,
      scoreAway: 0,
      competition: "Cup",
      status: "scheduled",
    },
  ];
}

function mockBaseSuccess({
  clubs = makeClubs(),
  members = makeMembers(),
  matches = makeMatches(),
} = {}) {
  api.get.mockImplementation((url, config) => {
    if (url === "/clubs") {
      return Promise.resolve({
        data: clubs,
      });
    }

    if (url === "/clubs/club-1/members") {
      return Promise.resolve({
        data: {
          members,
        },
      });
    }

    if (url === "/matches") {
      if (
        config?.params?.club === "club-1" &&
        config?.params?.page === 1 &&
        config?.params?.limit === 50
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

describe("Matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    window.confirm = vi.fn(() => true);
  });

  it("muestra guard si no hay club activo", async () => {
    renderPage("", "admin");

    expect(
      await screen.findByRole("heading", { name: /Matches/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /No tienes club activo\. Selecciona o únete a un club para gestionar partidos\./i
      )
    ).toBeInTheDocument();
  });

  it("carga datos base y partidos al montar", async () => {
    mockBaseSuccess();
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Gestión de partidos/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/clubs");
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/members");
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: {
          club: "club-1",
          page: 1,
          limit: 50,
        },
      });
    });

    expect(
      screen.getByRole("heading", { name: /Crear partido/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Partidos del club/i })
    ).toBeInTheDocument();

    expect(screen.getAllByText(/Club One/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Club Two/i).length).toBeGreaterThan(0);
  });

  it("muestra error base si falla la carga inicial", async () => {
    api.get.mockRejectedValueOnce({
      response: {
        data: {
          message: "Error cargando datos base backend",
        },
      },
    });

    renderPage("club-1", "admin");

    expect(
      await screen.findByText(/Error cargando datos base backend/i)
    ).toBeInTheDocument();
  });

  it("muestra estado vacío si no hay partidos", async () => {
    mockBaseSuccess({ matches: [] });
    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Gestión de partidos/i })
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/No hay partidos para tu club\./i)
    ).toBeInTheDocument();
  });

  it("como member ve historial pero no el formulario de creación", async () => {
    mockBaseSuccess();
    renderPage("club-1", "member");

    expect(
      await screen.findByRole("heading", { name: /Historial de partidos/i })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", { name: /Crear partido/i })
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Partidos del club/i })
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: /Ver detalle/i }).length
    ).toBeGreaterThan(0);
  });

  it("como member puede navegar al detalle de un partido", async () => {
    mockBaseSuccess();
    renderPage("club-1", "member");

    expect(
      await screen.findByRole("heading", { name: /Historial de partidos/i })
    ).toBeInTheDocument();

    const detailButtons = screen.getAllByRole("button", {
      name: /Ver detalle/i,
    });

    fireEvent.click(detailButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/matches/m1");
  });

  it("crea un partido correctamente", async () => {
    mockBaseSuccess({ matches: [] });

    api.post.mockResolvedValueOnce({
      data: {
        _id: "match-123",
      },
    });

    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Gestión de partidos/i })
    ).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");

    fireEvent.change(selects[0], { target: { value: "club-1" } });
    fireEvent.change(selects[1], { target: { value: "club-2" } });

    const dateInput = document.querySelector('input[type="datetime-local"]');
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: "2026-03-17T18:30" } });

    fireEvent.change(screen.getByLabelText(/Estadio/i), {
      target: { value: "Monumental" },
    });

    fireEvent.change(screen.getByLabelText(/Competición/i), {
      target: { value: "League" },
    });

    fireEvent.change(screen.getByLabelText(/Score home/i), {
      target: { value: "3" },
    });

    fireEvent.change(screen.getByLabelText(/Score away/i), {
      target: { value: "1" },
    });

    fireEvent.change(screen.getByLabelText(/^Jugador$/i), {
      target: { value: "u1" },
    });

    fireEvent.change(screen.getByLabelText(/^Posición$/i), {
      target: { value: "ST" },
    });

    fireEvent.change(screen.getByLabelText(/^Goles$/i), {
      target: { value: "2" },
    });

    fireEvent.change(screen.getByLabelText(/^Asistencias$/i), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Crear partido/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    const [url, payload] = api.post.mock.calls[0];

    expect(url).toBe("/matches/clubs/club-1");
    expect(payload).toEqual(
      expect.objectContaining({
        homeClub: "club-1",
        awayClub: "club-2",
        date: "2026-03-17T18:30",
        stadium: "Monumental",
        competition: "League",
        status: "played",
        scoreHome: 3,
        scoreAway: 1,
        strictTotals: false,
      })
    );

    expect(Array.isArray(payload.playerStats)).toBe(true);
    expect(payload.playerStats.length).toBeGreaterThan(0);

    expect(
      await screen.findByText(/Partido creado correctamente\./i)
    ).toBeInTheDocument();
  });

  it("muestra error si falla la creación del partido", async () => {
    mockBaseSuccess({ matches: [] });

    api.post.mockRejectedValueOnce({
      response: {
        data: {
          message: "No se pudo crear el partido backend",
        },
      },
    });

    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Gestión de partidos/i })
    ).toBeInTheDocument();

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "club-1" } });
    fireEvent.change(selects[1], { target: { value: "club-2" } });

    const dateInput = document.querySelector('input[type="datetime-local"]');
    expect(dateInput).toBeTruthy();
    fireEvent.change(dateInput, { target: { value: "2026-03-17T18:30" } });

    fireEvent.change(screen.getByLabelText(/Estadio/i), {
      target: { value: "Monumental" },
    });

    fireEvent.change(screen.getByLabelText(/^Jugador$/i), {
      target: { value: "u1" },
    });

    fireEvent.change(screen.getByLabelText(/^Posición$/i), {
      target: { value: "ST" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Crear partido/i }));

    expect(
      await screen.findByText(/No se pudo crear el partido backend/i)
    ).toBeInTheDocument();
  });

  it("admin ve botón eliminar y puede eliminar un partido", async () => {
    mockBaseSuccess();
    api.delete.mockResolvedValueOnce({ data: { ok: true } });

    renderPage("club-1", "admin");

    expect(
      await screen.findByRole("heading", { name: /Gestión de partidos/i })
    ).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", {
      name: /Eliminar/i,
    });

    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/matches/m1/clubs/club-1");
    });
  });
});