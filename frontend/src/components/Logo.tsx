interface LogoProps {
  /** "claro" para fundo azul (menu); "escuro" para fundo branco (login). */
  tema?: "claro" | "escuro";
  /** Mostra "Controle de pastilhas" abaixo do nome. */
  comSubtitulo?: boolean;
}

/**
 * Símbolo do PasTrack: uma pastilha em perspectiva isométrica, com a face de cima, as duas
 * laterais mostrando a espessura, o rebaixo do quebra-cavaco e o furo central.
 */
export function SimboloPastilha({ tema = "claro" }: { tema?: "claro" | "escuro" }) {
  const cores =
    tema === "claro"
      ? { topo: "#FFFFFF", rebaixo: "#DCE6FF", esquerda: "#A9C2FF", direita: "#7C9EF0", furo: "#1E3A8A" }
      : { topo: "#E0E7FF", rebaixo: "#C7D2FE", esquerda: "#3B5BBF", direita: "#1E3A8A", furo: "#1E3A8A" };
  return (
    <svg className="simbolo-pastilha" viewBox="0 0 48 34" aria-hidden="true" focusable="false">
      {/* laterais: a espessura da pastilha */}
      <path d="M2 15 L24 26 L24 32 L2 21 Z" fill={cores.esquerda} />
      <path d="M24 26 L46 15 L46 21 L24 32 Z" fill={cores.direita} />
      {/* face de cima */}
      <path d="M24 4 L46 15 L24 26 L2 15 Z" fill={cores.topo} />
      {/* rebaixo do quebra-cavaco, acompanhando a borda */}
      <path d="M24 8.5 L37 15 L24 21.5 L11 15 Z" fill={cores.rebaixo} />
      {/* furo central */}
      <ellipse cx="24" cy="15" rx="5" ry="2.6" fill={cores.furo} />
    </svg>
  );
}

/** Marca completa: símbolo, nome em duas cores e, opcionalmente, o subtítulo. */
export function Logo({ tema = "claro", comSubtitulo = false }: LogoProps) {
  return (
    <span className={`marca marca-${tema}`}>
      <SimboloPastilha tema={tema} />
      <span className="marca-texto">
        <span className="marca-nome">
          Pas<span className="marca-destaque">Track</span>
        </span>
        {comSubtitulo && <span className="marca-subtitulo">Controle de pastilhas</span>}
      </span>
    </span>
  );
}
