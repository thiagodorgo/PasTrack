import { Link } from "react-router-dom";

export function SemPermissao() {
  return (
    <>
      <h1>Acesso não permitido</h1>
      <p className="texto-suave">
        O seu perfil não tem permissão para abrir esta página. Se precisar dela, fale com um administrador.
      </p>
      <p>
        <Link to="/">Voltar ao painel</Link>
      </p>
    </>
  );
}
