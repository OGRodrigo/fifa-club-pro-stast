// src/pages/__tests__/JoinRequests.test.jsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import JoinRequests from "../JoinRequests";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../ui/ToastContext";

vi.mock("../../api/client", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../ui/ToastContext", () => ({
  useToast: vi.fn(),
}));

function renderAs(role = "admin", clubId = "club-1") {
  useAuth.mockReturnValue({
    clubContext: {
      clubId,
      role,
    },
  });

  return render(<JoinRequests />);
}

function makeRequests() {
  return [
    {
      _id: "jr1",
      createdAt: "2026-03-17T12:00:00.000Z",
      user: {
        _id: "u1",
        username: "rodrigo",
        gamerTag: "Rodri",
        platform: "PS5",
        country: "Chile",
      },
    },
    {
      _id: "jr2",
      createdAt: "2026-03-17T13:00:00.000Z",
      user: {
        _id: "u2",
        username: "juanito",
        gamerTag: "Juan",
        platform: "PC",
        country: "Argentina",
      },
    },
  ];
}

function mockRequestsResponse(items) {
  return {
    data: {
      requests: items,
    },
  };
}

describe("JoinRequests", () => {
  const success = vi.fn();
  const error = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ success, error });
  });

  it("muestra no autorizado si el rol no es admin ni captain", async () => {
    renderAs("member");

    expect(
      await screen.findByText(/No autorizado\./i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Solicitudes de ingreso/i })
    ).toBeInTheDocument();
  });

  it("carga y muestra solicitudes pendientes", async () => {
    api.get.mockResolvedValueOnce(mockRequestsResponse(makeRequests()));

    renderAs("admin");

    expect(
      await screen.findByRole("heading", { name: /Solicitudes de ingreso/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/clubs/club-1/join-requests");
    });

    expect(screen.getByText(/PENDIENTES \(2\)/i)).toBeInTheDocument();

    expect(screen.getByText(/^Rodri$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Juan$/i)).toBeInTheDocument();

    expect(
      screen.getByText(/@rodrigo\s*·\s*PS5\s*·\s*Chile/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/@juanito\s*·\s*PC\s*·\s*Argentina/i)
    ).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: /Aceptar/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Rechazar/i })).toHaveLength(2);
  });

  it("muestra estado vacío si no hay solicitudes", async () => {
    api.get.mockResolvedValueOnce(mockRequestsResponse([]));

    renderAs("captain");

    expect(
      await screen.findByText(/No hay solicitudes pendientes por revisar\./i)
    ).toBeInTheDocument();

    expect(screen.getByText(/PENDIENTES \(0\)/i)).toBeInTheDocument();
  });

  it("acepta una solicitud correctamente", async () => {
    api.get
      .mockResolvedValueOnce(mockRequestsResponse([makeRequests()[0]]))
      .mockResolvedValueOnce(mockRequestsResponse([]));

    api.put.mockResolvedValueOnce({
      data: { ok: true },
    });

    renderAs("admin");

    expect(await screen.findByText(/^Rodri$/i)).toBeInTheDocument();

    const acceptButtons = screen.getAllByRole("button", { name: /Aceptar/i });
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/clubs/club-1/join-requests/u1",
        { action: "accept" }
      );
    });

    expect(success).toHaveBeenCalledWith("Solicitud aceptada correctamente.");

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("rechaza una solicitud correctamente", async () => {
    api.get
      .mockResolvedValueOnce(mockRequestsResponse([makeRequests()[0]]))
      .mockResolvedValueOnce(mockRequestsResponse([]));

    api.put.mockResolvedValueOnce({
      data: { ok: true },
    });

    renderAs("admin");

    expect(await screen.findByText(/^Rodri$/i)).toBeInTheDocument();

    const rejectButtons = screen.getAllByRole("button", { name: /Rechazar/i });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/clubs/club-1/join-requests/u1",
        { action: "reject" }
      );
    });

    expect(success).toHaveBeenCalledWith("Solicitud rechazada correctamente.");

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("muestra error si falla la carga inicial", async () => {
    api.get.mockRejectedValueOnce({
      response: {
        data: {
          message: "Error cargando solicitudes backend",
        },
      },
    });

    renderAs("admin");

    expect(
      await screen.findByText(/Error cargando solicitudes backend/i)
    ).toBeInTheDocument();
  });

  it("muestra error si falla resolver solicitud", async () => {
    api.get.mockResolvedValueOnce(mockRequestsResponse([makeRequests()[0]]));

    api.put.mockRejectedValueOnce({
      response: {
        data: {
          message: "No se pudo resolver la solicitud",
        },
      },
    });

    renderAs("admin");

    expect(await screen.findByText(/^Rodri$/i)).toBeInTheDocument();

    const acceptButtons = screen.getAllByRole("button", { name: /Aceptar/i });
    fireEvent.click(acceptButtons[0]);

    expect(
      await screen.findByText(/No se pudo resolver la solicitud/i)
    ).toBeInTheDocument();

    expect(error).toHaveBeenCalledWith("No se pudo resolver la solicitud");
  });
});