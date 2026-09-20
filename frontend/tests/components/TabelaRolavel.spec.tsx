import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabelaRolavel } from "../../src/components/TabelaRolavel";

describe("TabelaRolavel", () => {
  it("expõe a tabela larga como região alcançável pelo teclado", () => {
    render(
      <TabelaRolavel nome="Pastilhas cadastradas">
        <table>
          <caption className="sr-only">Pastilhas cadastradas</caption>
          <tbody>
            <tr>
              <td>CNMG</td>
            </tr>
          </tbody>
        </table>
      </TabelaRolavel>
    );

    const regiao = screen.getByRole("region", { name: "Pastilhas cadastradas" });
    // sem tabIndex, quem navega pelo teclado não consegue rolar a tabela na horizontal
    expect(regiao).toHaveAttribute("tabindex", "0");
    expect(regiao).toContainElement(screen.getByRole("table", { name: "Pastilhas cadastradas" }));
  });
});
