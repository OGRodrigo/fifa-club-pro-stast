import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CreateClub from "../CreateClub";

const mockNavigate = vi.fn();
const mockPost = vi.fn();
const mockSetClubContext = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api/client", () => ({
  api: {
    post: (...args) => mockPost(...args),
  },
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    setClubContext: mockSetClubContext,
  }),
}));

vi.mock("../../ui/ToastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe("CreateClub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <CreateClub />
      </MemoryRouter>
    );
  }

  it("renderiza formulario", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: /crear club/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/nombre del club/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /^crear club$/i })
    ).toBeInTheDocument();
  });

  it("muestra error si faltan campos", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^crear club$/i }));

    expect(
      await screen.findByText(/debes ingresar el nombre del club/i)
    ).toBeInTheDocument();

    expect(mockToastError).toHaveBeenCalledWith(
      "Debes ingresar el nombre del club."
    );
  });

  it("muestra error si nombre tiene menos de 3 caracteres", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/nombre del club/i), "FC");
    await user.type(screen.getByLabelText(/país/i), "Chile");
    await user.click(screen.getByRole("button", { name: /^crear club$/i }));

    expect(
      await screen.findByText(/debe tener al menos 3 caracteres/i)
    ).toBeInTheDocument();
  });

  it("crea club, guarda clubContext y navega a /home", async () => {
    const user = userEvent.setup();

    mockPost.mockResolvedValue({
      data: {
        club: {
          _id: "club-123",
          name: "FC Testing",
          country: "Chile",
        },
      },
    });

    renderPage();

    await user.type(screen.getByLabelText(/nombre del club/i), "FC Testing");
    await user.type(screen.getByLabelText(/país/i), "Chile");
    await user.click(screen.getByRole("button", { name: /^crear club$/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/clubs", {
        name: "FC Testing",
        country: "Chile",
      });
    });

    expect(mockSetClubContext).toHaveBeenCalledWith({
      clubId: "club-123",
      role: "admin",
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Club creado correctamente.");
    expect(mockNavigate).toHaveBeenCalledWith("/home");
  });

  it("muestra error 409 si el club ya existe", async () => {
    const user = userEvent.setup();

    mockPost.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: "Ya existe un club con ese nombre.",
        },
      },
    });

    renderPage();

    await user.type(screen.getByLabelText(/nombre del club/i), "FC Testing");
    await user.type(screen.getByLabelText(/país/i), "Chile");
    await user.click(screen.getByRole("button", { name: /^crear club$/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Ya existe un club con ese nombre."
      );
    });

    const matches = await screen.findAllByText(/ya existe un club con ese nombre/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});