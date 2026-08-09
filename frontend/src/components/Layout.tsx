import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Layout() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  function aoSair() {
    sair();
    navegar("/login");
  }

  return (
    <div className="layout">
      <aside className="menu-lateral">
        <div className="logo">PasTrack</div>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "ativo" : "")}>
          Painel
        </NavLink>
        <NavLink to="/pastilhas" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Pastilhas
        </NavLink>
        <NavLink to="/movimentacoes" className={({ isActive }) => (isActive ? "ativo" : "")}>
          Movimentações
        </NavLink>
      </aside>

      <div className="conteudo">
        <header className="topo">
          <span className="texto-suave">Controle de estoque de pastilhas industriais</span>
          <span>
            {usuario?.nome}{" "}
            <button className="botao botao-secundario" onClick={aoSair} style={{ marginLeft: 12 }}>
              Sair
            </button>
          </span>
        </header>
        <main className="pagina">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
