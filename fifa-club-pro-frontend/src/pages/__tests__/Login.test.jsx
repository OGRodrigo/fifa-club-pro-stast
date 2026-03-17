import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "../Login";

const mockNavigate = vi.fn();
const mockSetSessionFromLogin = vi.fn();
const mockSetClubContext = vi.fn();
const mockApiLogin = vi.fn();
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
  login: (...args) => mockApiLogin(...args),
  me: (...args) => mockApiMe(...args),
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  }

  it("renderiza formulario de login", () => {
    renderPage();

    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /entrar/i })
    ).toBeInTheDocument();
  });

  it("muestra error si faltan campos", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      screen.getByText(/debes completar email y password/i)
    ).toBeInTheDocument();
  });

  it("hace login y navega a /home cuando backend devuelve token y user", async () => {
    const user = userEvent.setup();

    mockApiLogin.mockResolvedValue({
      token: "token-123",
      user: { _id: "u1", username: "rodrigo" },
      clubContext: { clubId: "club-1", role: "admin" },
    });

    renderPage();

    await user.type(screen.getByLabelText(/email/i), "test@mail.com");
    await user.type(screen.getByLabelText(/password/i), "123456");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith("test@mail.com", "123456");
    });

    expect(mockSetSessionFromLogin).toHaveBeenCalledWith({
      token: "token-123",
      user: { _id: "u1", username: "rodrigo" },
      clubContext: { clubId: "club-1", role: "admin" },
    });

    expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("resuelve clubContext con /auth/me si login no lo trae", async () => {
    const user = userEvent.setup();

    mockApiLogin.mockResolvedValue({
      token: "token-123",
      user: { _id: "u1", username: "rodrigo" },
      clubContext: null,
    });

    mockApiMe.mockResolvedValue({
      clubContext: { clubId: "club-99", role: "member" },
    });

    renderPage();

    await user.type(screen.getByLabelText(/email/i), "test@mail.com");
    await user.type(screen.getByLabelText(/password/i), "123456");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(mockApiMe).toHaveBeenCalled();
    });

    expect(mockSetClubContext).toHaveBeenCalledWith({
      clubId: "club-99",
      role: "member",
    });

    expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
  });

  it("muestra error si login falla", async () => {
    const user = userEvent.setup();

    mockApiLogin.mockRejectedValue({
      response: {
        data: {
          message: "Credenciales inválidas",
        },
      },
    });

    renderPage();

    await user.type(screen.getByLabelText(/email/i), "test@mail.com");
    await user.type(screen.getByLabelText(/password/i), "123456");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      await screen.findByText(/credenciales inválidas/i)
    ).toBeInTheDocument();
  });
});