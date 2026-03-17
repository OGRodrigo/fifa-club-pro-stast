import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import JoinRequests from "../JoinRequests";

const mockGet = vi.fn();
const mockPut = vi.fn();

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

let mockAuthValue = {
  clubContext: {g
    clubId: "club-1",
    role: "admin",
  },
};

vi.mock("../../api/client", () => ({
  api: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args),
  },
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock("../../ui/ToastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe("JoinRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthValue = {
      clubContext: {
        clubId: "club-1",
        role: "admin",
      },
    };
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <JoinRequests />
      </MemoryRouter>
    );
  }

  it("muestra no autorizado si el rol no es admin ni captain", () => {
    mockAuthValue = {
      clubContext: {
        clubId: "club-1",
        role: "member",
      },
    };

    renderPage();

    expect(screen.getByText(/solicitudes de ingreso/i)).toBeInTheDocument();
    expect(screen.getByText(/no autorizado/i)).toBeInTheDocument();
  });

  it("carga y muestra solicitudes pendientes", async () => {
    mockGet.mockResolvedValue({
      data: {
        requests: [
          {
            _id: "r1",
            createdAt: "2026-03-15T12:00:00.000Z",
            user: {
              _id: "u1",
              username: "rodrigo",
              gamerTag: "Rodri",
              platform: "PS",
              country: "Chile",
            },
          },
        ],
      },
    });

    renderPage();

    expect(
      await screen.findByText(/rodri/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/@rodrigo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aceptar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument();
  });

  it("muestra estado vacío si no hay solicitudes", async () => {
    mockGet.mockResolvedValue({
      data: {
        requests: [],
      },
    });

    renderPage();

    expect(
      await screen.findByText(/no hay solicitudes pendientes por revisar/i)
    ).toBeInTheDocument();
  });

  it("acepta una solicitud correctamente", async () => {
    const user = userEvent.setup();

    mockGet
      .mockResolvedValueOnce({
        data: {
          requests: [
            {
              _id: "r1",
              createdAt: "2026-03-15T12:00:00.000Z",
              user: {
                _id: "u1",
                username: "rodrigo",
                gamerTag: "Rodri",
                platform: "PS",
                country: "Chile",
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          requests: [],
        },
      });

    mockPut.mockResolvedValue({ data: { ok: true } });

    renderPage();

    const acceptButton = await screen.findByRole("button", { name: /aceptar/i });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/clubs/club-1/join-requests/u1",
        { action: "accept" }
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Solicitud aceptada correctamente."
    );
  });

  it("rechaza una solicitud correctamente", async () => {
    const user = userEvent.setup();

    mockGet
      .mockResolvedValueOnce({
        data: {
          requests: [
            {
              _id: "r1",
              createdAt: "2026-03-15T12:00:00.000Z",
              user: {
                _id: "u1",
                username: "rodrigo",
                gamerTag: "Rodri",
                platform: "PS",
                country: "Chile",
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          requests: [],
        },
      });

    mockPut.mockResolvedValue({ data: { ok: true } });

    renderPage();

    const rejectButton = await screen.findByRole("button", { name: /rechazar/i });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        "/clubs/club-1/join-requests/u1",
        { action: "reject" }
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Solicitud rechazada correctamente."
    );
  });

  it("muestra error si falla la carga inicial", async () => {
    mockGet.mockRejectedValue({
      response: {
        data: {
          message: "Error cargando solicitudes",
        },
      },
    });

    renderPage();

    expect(
      await screen.findByText(/error cargando solicitudes/i)
    ).toBeInTheDocument();
  });

  it("muestra error si falla resolver solicitud", async () => {
    const user = userEvent.setup();

    mockGet.mockResolvedValue({
      data: {
        requests: [
          {
            _id: "r1",
            createdAt: "2026-03-15T12:00:00.000Z",
            user: {
              _id: "u1",
              username: "rodrigo",
              gamerTag: "Rodri",
              platform: "PS",
              country: "Chile",
            },
          },
        ],
      },
    });

    mockPut.mockRejectedValue({
      response: {
        data: {
          message: "Error resolviendo solicitud",
        },
      },
    });

    renderPage();

    const acceptButton = await screen.findByRole("button", { name: /aceptar/i });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Error resolviendo solicitud"
      );
    });

    expect(
      await screen.findByText(/error resolviendo solicitud/i)
    ).toBeInTheDocument();
  });
});