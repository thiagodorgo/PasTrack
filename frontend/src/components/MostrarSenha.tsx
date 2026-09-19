interface MostrarSenhaProps {
  /** Verdadeiro quando a senha está visível como texto. */
  visivel: boolean;
  aoAlternar(): void;
  /** Como o campo é chamado na frase do botão, em minúsculas: "a senha atual", "a nova senha". */
  rotulo: string;
  /** id do campo que o botão controla. */
  controla: string;
}

/**
 * Botão que revela e esconde a senha digitada. O ASVS pede isso no nível 1 (V2.1.12): sem ver o que
 * digitou, o usuário tende a escolher senhas curtas e fáceis para não errar.
 */
export function MostrarSenha({ visivel, aoAlternar, rotulo, controla }: MostrarSenhaProps) {
  return (
    <button
      type="button"
      className="botao-texto"
      aria-pressed={visivel}
      aria-controls={controla}
      onClick={aoAlternar}
    >
      {visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
    </button>
  );
}
