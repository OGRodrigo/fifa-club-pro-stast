// src/pages/__tests__/MemberDetail.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MemberDetail from "../MemberDetail";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

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
    useParams: () => mockUseParams(),
  };
});

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
      date: "2026-03-10T12:00:00.000Z",
      competition: "League",
      status: "played",
      homeClub: { _id: "club-1", name: "Club One" },
      awayClub: { _id: "club-x", name: "Club X" },
      scoreHome: 3,
      scoreAway: 1,
      playerStats: [
        {
          user: { _id: "u1" },
          club: { _id: "club-1" },
          goals: 2,
          assists: 1,
          rating: 8.5,
          minutesPlayed: 90,
          isMVP: true,
        },
        {
          user: { _id: "u2" },
          club: { _id: "club-1" },
          goals: 1,
          assists: 0,
          rating: 7.2,
          minutesPlayed: 90,
          isMVP: false,
        },
      ],
    },
    {
      _id: "m2",
      date: "2026-03-12T12:00:00.000Z",
      competition: "League",
      status: "played",
      homeClub: { _id: "club-y", name: "Club Y" },
      awayClub: { _id: "club-1", name: "Club One" },
      scoreHome: 2,
      scoreAway: 2,
      playerStats: [
        {
          user: { _id: "u1" },
          club: { _id: "club-1" },
          goals: 1,
          assists: 0,
          rating: 9.0,
          minutesPlayed: 90,
          isMVP: false,
        },
        {
          user: { _id: "u3" },
          club: { _id: "club-1" },
          goals: 0,
          assists: 1,
          rating: 7.0,
          minutesPlayed: 90,
          isMVP: false,
        },
      ],
    },
    {
      _id: "m3",
      date: "2026-03-14T12:00:00.000Z",
      competition: "Cup",
      status: "played",
      homeClub: { _id: "otro-club", name: "Otro Club" },
      awayClub: { _id: "club-z", name: "Club Z" },
      scoreHome: 5,
      scoreAway: 0,
      playerStats: [
        {
          user: { _id: "u1" },
          club: { _id: "otro-club" },
          goals: 99,
          assists: 99,
          rating: 10,
          minutesPlayed: 90,
          isMVP: true,
        },
      ],
    },
  ];
}

function mockDetailRequests({
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

function renderPage({
  role = "admin",
  clubId = "club-1",
  memberId = "u1",
} = {}) {
  useAuth.mockReturnValue({
    clubContext: {
      clubId,
      role,
    },
  });

  mockUseParams.mockReturnValue({ memberId });

  return render(<MemberDetail />);
}

describe("MemberDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("bloquea acceso para member", async () => {
    renderPage({ role: "member" });

    expect(
      await screen.findByText(/No autorizado\. Solo admin o captain\./i)
    ).toBeInTheDocument();
  });

  it("muestra error si no hay club activo", async () => {
    renderPage({ role: "admin", clubId: "", memberId: "u1" });

    expect(
      await screen.findByText(/No hay club activo seleccionado\./i)
    ).toBeInTheDocument();
  });

  it("muestra error si falta memberId", async () => {
    renderPage({ role: "admin", clubId: "club-1", memberId: "" });

    expect(
      await screen.findByText(/ID de miembro inválido\./i)
    ).toBeInTheDocument();
  });

  it("carga el detalle del miembro y sus partidos del club", async () => {
    mockDetailRequests();
    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByRole("heading", { name: /Rodri/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/members");
      expect(api.get).toHaveBeenCalledWith("/matches", {
        params: { limit: 100 },
      });
    });

    expect(screen.getByText(/Ficha individual/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Perfil estadístico del miembro dentro del club actual\./i)
    ).toBeInTheDocument();

    expect(screen.getAllByText(/Rodri/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Ver partido/i }).length
    ).toBeGreaterThan(0);
  });

  it("calcula stats usando solo partidos del club actual", async () => {
    mockDetailRequests();
    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByRole("heading", { name: /Rodri/i })
    ).toBeInTheDocument();

    expect(screen.getAllByText("8.75").length).toBeGreaterThan(0);
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  it("muestra error si el miembro no existe dentro del club", async () => {
    mockDetailRequests({
      members: makeMembers().filter((m) => m.user._id !== "u1"),
    });

    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByText(/No se encontró el miembro en este club\./i)
    ).toBeInTheDocument();
  });

  it("muestra error si falla la carga inicial", async () => {
    api.get.mockRejectedValueOnce({
      response: {
        data: {
          message: "Error backend detail",
        },
      },
    });

    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByText(/Error backend detail/i)
    ).toBeInTheDocument();
  });

  it("permite volver a la lista de miembros", async () => {
    mockDetailRequests();
    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByRole("heading", { name: /Rodri/i })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a miembros/i })
    );

    expect(mockNavigate).toHaveBeenCalledWith("/club/members-stats");
  });

  it("permite navegar al detalle de un partido", async () => {
    mockDetailRequests();
    renderPage({ role: "admin", memberId: "u1" });

    expect(
      await screen.findByRole("heading", { name: /Rodri/i })
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

  it("también permite acceso a captain", async () => {
    mockDetailRequests();
    renderPage({ role: "captain", memberId: "u1" });

    expect(
      await screen.findByRole("heading", { name: /Rodri/i })
    ).toBeInTheDocument();
  });
});