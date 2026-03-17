import { screen } from "@testing-library/react";
import HomeNoClub from "../HomeNoClub";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { vi } from "vitest";

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "rodrigo",
    },
  }),
}));

describe("HomeNoClub", () => {
  it("muestra mensaje de usuario sin club", () => {
    renderWithRouter(<HomeNoClub />);

    expect(screen.getByText("INICIO")).toBeInTheDocument();
    expect(screen.getByText("Sin club")).toBeInTheDocument();
    expect(screen.getByText(/rodrigo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear club/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver clubes/i })).toBeInTheDocument();
  });
});