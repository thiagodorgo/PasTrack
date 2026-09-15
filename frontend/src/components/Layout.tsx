import { type MouseEvent, Suspense, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { type Acao, ROTULOS_PERFIL } from "../utils/permissoes";
import { Carregando } from "./Carregando";
import { LimiteDeErro } from "./LimiteDeErro";

interface ItemDoMenu {
  caminho: string;
  rotulo: string;
  acao: Acao;
}

// cada item aparece só para os perfis que podem executar a ação correspondente
const ITENS_DO_MENU: ItemDoMenu[] = [
  { caminho: "/", rotulo: "Painel", acao: "consultar" },
  { caminho: "/pastilhas", rotulo: "Pastilhas", acao: "consultar" },
  { caminho: "/movimentacoes", rotulo: "Movimentações", acao: "consultar" },
  { caminho: "/alertas", rotulo: "Alertas", acao: "consultar" },
  { caminho: "/fabricantes", rotulo: "Fabricantes", acao: "consultar" },
  { caminho: "/fornecedores", rotulo: "Fornecedores", acao: "consultar" },
  { caminho: "/usuarios", rotulo: "Usuários", acao: "gerenciarUsuarios" },
];

/**
 * Estrutura das telas logadas: link para pular ao conteúdo, menu filtrado por perfil
 * (recolhido atrás de um botão em telas estreitas), cabeçalho com o usuário e a área da página.
 */
export function Layout() {
  const { usuario, pode, sair } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const conteudo = useRef<HTMLElement>(null);

  function pularParaConteudo(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault();
    conteudo.current?.focus();
  }

  return (
    <div className="layout">
      <a href="#conteudo" className="pular-conteudo" onClick={pularParaConteudo}>
        Pular para o conteúdo
      </a>

      <div className="menu-lateral">
        <div className="menu-cabecalho">
          <span className="logo">PasTrack</span>
          <button
            type="button"
            className="botao-menu"
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            Menu
          </button>
        </div>
        <nav
          id="menu-principal"
          aria-label="Menu principal"
          className={menuAberto ? "menu-navegacao aberto" : "menu-navegacao"}
        >
          <ul>
            {ITENS_DO_MENU.filter((item) => pode(item.acao)).map((item) => (
              <li key={item.caminho}>
                <NavLink
                  to={item.caminho}
                  end={item.caminho === "/"}
                  className={({ isActive }) => (isActive ? "ativo" : undefined)}
                  onClick={() => setMenuAberto(false)}
                >
                  {item.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="conteudo">
        <header className="topo">
          <span className="texto-suave">Controle de estoque de pastilhas industriais</span>
          {usuario && (
            <div className="topo-usuario">
              <p className="topo-identidade">
                <strong>{usuario.nome}</strong>{" "}
                <span className="texto-suave">
                  <span className="sr-only">Perfil: </span>
                  {ROTULOS_PERFIL[usuario.perfil]}
                </span>
              </p>
              <Link to="/alterar-senha" className="botao botao-secundario">
                Alterar senha
              </Link>
              <button type="button" className="botao botao-secundario" onClick={() => sair()}>
                Sair
              </button>
            </div>
          )}
        </header>
        <main id="conteudo" ref={conteudo} tabIndex={-1} className="pagina">
          {/* a chave pela rota zera o limite de erro ao navegar para outra página */}
          <LimiteDeErro key={pathname}>
            <Suspense fallback={<Carregando />}>
              <Outlet />
            </Suspense>
          </LimiteDeErro>
        </main>
      </div>
    </div>
  );
}
