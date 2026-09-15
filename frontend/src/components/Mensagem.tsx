import type { ReactNode } from "react";

export type TipoMensagem = "erro" | "sucesso" | "info";

interface MensagemProps {
  tipo: TipoMensagem;
  children: ReactNode;
  /** Permite ligar a mensagem a um campo por aria-describedby. */
  id?: string;
}

/**
 * Mensagem de retorno ao usuário. O erro usa role="alert" e é anunciado na hora;
 * sucesso e informação usam role="status" com aria-live="polite", anunciados sem interromper a leitura.
 */
export function Mensagem({ tipo, children, id }: MensagemProps) {
  if (tipo === "erro") {
    return (
      <div id={id} className="mensagem mensagem-erro" role="alert">
        {children}
      </div>
    );
  }
  return (
    <div id={id} className={`mensagem mensagem-${tipo}`} role="status" aria-live="polite">
      {children}
    </div>
  );
}
