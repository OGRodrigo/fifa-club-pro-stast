import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Register from "../Register";

const mockNavigate = vi.fn();
const mockSetSessionFromLogin = vi.fn();
const mockSetClubContext = vi.fn();
const mockApiRegister = vi.fn();
const mockApiMe = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    setSessionFromLogin: mockSetSessionFromLogin,
    setClubContext: mockSetClubContext,
  }),
}));

vi.mock("../../api/auth", () => ({
  register: (...args) => mockApiRegister(...args),
  me: (...args) => mockApiMe(...args),
}));

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
  }

  it("renderiza formulario de registro", () => {
    renderPage();

    expect(screen.getByText(/crear cuenta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gamertag/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plataforma/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();
  });

  it("muestra error si faltan campos", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /registrarme/i }));

    expect(screen.getByText(/debes ingresar username/i)).toBeInTheDocument();
  });

  it("muestra error si password tiene menos de 6 caracteres", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/username/i), "rodrigo");
    await user.type(screen.getByLabelText(/^email$/i), "test@mail.com");
    await user.type(screen.getByLabelText(/^password$/i), "123");
    await user.type(screen.getByLabelText(/gamertag/i), "Rodri");
    await user.selectOptions(screen.getByLabelText(/plataforma/i), "PS");
    await user.type(screen.getByLabelText(/país/i), "Chile");

    await user.click(screen.getByRole("button", { name: /registrarme/i }));

    expect(
      screen.getByText(/la password debe tener al menos 6 caracteres/i)
    ).toBeInTheDocument();
  });

  it("hace autologin si backend devuelve token y user", async () => {
    const user = userEvent.setup();

    mockApiRegister.mockResolvedValue({
      token: "token-123",
      user: { _id: "u1", username: "rodrigo" },
      clubContext: null,
    });

    mockApiMe.mockResolvedValue({
      clubContext: { clubId: "club-7", role: "member" },
    });

    renderPage();

    await user.type(screen.getByLabelText(/username/i), "rodrigo");
    await user.type(screen.getByLabelText(/^email$/i), "test@mail.com");
    await user.type(screen.getByLabelText(/^password$/i), "123456");
    await user.type(screen.getByLabelText(/gamertag/i), "Rodri");
    await user.selectOptions(screen.getByLabelText(/plataforma/i), "PS");
    await user.type(screen.getByLabelText(/país/i), "Chile");

    await user.click(screen.getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(mockApiRegister).toHaveBeenCalled();
    });

    expect(mockSetSessionFromLogin).toHaveBeenCalledWith({
      token: "token-123",
      user: { _id: "u1", username: "rodrigo" },
      clubContext: null,
    });

    expect(mockSetClubContext).toHaveBeenCalledWith({
      clubId: "club-7",
      role: "member",
    });

    expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("redirige a login si backend registra pero no devuelve token", async () => {
    const user = userEvent.setup();

    mockApiRegister.mockResolvedValue({
      message: "Usuario creado",
    });

    renderPage();

    await user.type(screen.getByLabelText(/username/i), "rodrigo");
    await user.type(screen.getByLabelText(/^email$/i), "test@mail.com");
    await user.type(screen.getByLabelText(/^password$/i), "123456");
    await user.type(screen.getByLabelText(/gamertag/i), "Rodri");
    await user.selectOptions(screen.getByLabelText(/plataforma/i), "PS");
    await user.type(screen.getByLabelText(/país/i), "Chile");

    await user.click(screen.getByRole("button", { name: /registrarme/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  it("muestra error 409 si el backend responde conflicto", async () => {
    const user = userEvent.setup();

    mockApiRegister.mockRejectedValue({
      response: {
        status: 409,
        data: {
          message: "Ya existe un usuario con esos datos.",
        },
      },
    });

    renderPage();

    await user.type(screen.getByLabelText(/username/i), "rodrigo");
    await user.type(screen.getByLabelText(/^email$/i), "test@mail.com");
    await user.type(screen.getByLabelText(/^password$/i), "123456");
    await user.type(screen.getByLabelText(/gamertag/i), "Rodri");
    await user.selectOptions(screen.getByLabelText(/plataforma/i), "PS");
    await user.type(screen.getByLabelText(/país/i), "Chile");

    await user.click(screen.getByRole("button", { name: /registrarme/i }));

    expect(
      await screen.findByText(/ya existe un usuario con esos datos/i)
    ).toBeInTheDocument();
  });
});