interface CarregandoProps {
  texto?: string;
}

/** Aviso de carregamento, anunciado aos leitores de tela. */
export function Carregando({ texto = "Carregando..." }: CarregandoProps) {
  return (
    <p className="texto-suave" role="status">
      {texto}
    </p>
  );
}
