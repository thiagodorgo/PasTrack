import type { ReactNode } from "react";

interface TabelaRolavelProps {
  /** Nome da tabela, o mesmo da legenda; anuncia a região e aparece no foco. */
  nome: string;
  children: ReactNode;
}

/**
 * Moldura das tabelas largas, que rolam na horizontal em telas estreitas.
 * A região recebe foco: sem `tabIndex`, quem navega pelo teclado não consegue rolar a tabela.
 */
export function TabelaRolavel({ nome, children }: TabelaRolavelProps) {
  return (
    <div className="tabela-rolavel" role="region" aria-label={nome} tabIndex={0}>
      {children}
    </div>
  );
}
