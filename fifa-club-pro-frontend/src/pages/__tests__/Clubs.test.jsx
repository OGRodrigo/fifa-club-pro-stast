import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Clubs from "../Clubs";

const mockRequestJoinClub = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../api/clubs", () => ({
  requestJoinClub: (...args) => mockRequestJoinClub(...args),
}));

vi.mock("../../ui/ToastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "rodrigo" },
    clubContext: null,
    isLoggedIn: true,
  }),
}));

describe("Clubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Clubs />
      </MemoryRouter>
    );
  }

  it("renderiza formulario para unirse a club", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /unirse a club/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/id del club/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /solicitar ingreso/i })
    ).toBeInTheDocument();
  });

  it("muestra error si no se ingresa clubId", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /solicitar ingreso/i }));

    expect(mockToastError).toHaveBeenCalledWith(
      "Debes ingresar un ID de club."
    );
  });

  it("envía solicitud correctamente", async () => {
    const user = userEvent.setup();

    mockRequestJoinClub.mockResolvedValue({});

    renderPage();

    const input = screen.getByLabelText(/id del club/i);
    await user.type(input, "club-123");
    await user.click(screen.getByRole("button", { name: /solicitar ingreso/i }));

    expect(mockRequestJoinClub).toHaveBeenCalledWith("club-123");
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Solicitud enviada correctamente."
    );
  });

  it("muestra error si requestJoinClub falla", async () => {
    const user = userEvent.setup();

    mockRequestJoinClub.mockRejectedValue({
      response: {
        data: {
          message: "No se pudo enviar la solicitud",
        },
      },
    });

    renderPage();

    await user.type(screen.getByLabelText(/id del club/i), "club-123");
    await user.click(screen.getByRole("button", { name: /solicitar ingreso/i }));

    expect(mockToastError).toHaveBeenCalledWith(
      "No se pudo enviar la solicitud"
    );
  });
});