import { Link } from "react-router-dom";

export function NaoEncontrado() {
  return (
    <>
      <h1>Página não encontrada</h1>
      <p className="texto-suave">O endereço acessado não existe no PasTrack.</p>
      <p>
        <Link to="/">Voltar ao painel</Link>
      </p>
    </>
  );
}
