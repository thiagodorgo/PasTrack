import { type MouseEvent, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BellRing,
  ChevronsUpDown,
  Factory,
  KeyRound,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Package,
  Truck,
  Users,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buscarResumo } from "../services/painel";
import { type Acao, ROTULOS_PERFIL } from "../utils/permissoes";
import { Carregando } from "./Carregando";
import { Logo } from "./Logo";
import { LimiteDeErro } from "./LimiteDeErro";

interface ItemDoMenu {
  caminho: string;
  rotulo: string;
  acao: Acao;
  icone: LucideIcon;
}

// cada item aparece só para os perfis que podem executar a ação correspondente
const ITENS_DO_MENU: ItemDoMenu[] = [
  { caminho: "/", rotulo: "Painel", acao: "consultar", icone: LayoutDashboard },
  { caminho: "/pastilhas", rotulo: "Pastilhas", acao: "consultar", icone: Package },
  { caminho: "/movimentacoes", rotulo: "Movimentações", acao: "consultar", icone: ArrowLeftRight },
  { caminho: "/alertas", rotulo: "Alertas", acao: "consultar", icone: BellRing },
  { caminho: "/fabricantes", rotulo: "Fabricantes", acao: "consultar", icone: Factory },
  { caminho: "/fornecedores", rotulo: "Fornecedores", acao: "consultar", icone: Truck },
  { caminho: "/usuarios", rotulo: "Usuários", acao: "gerenciarUsuarios", icone: Users },
];

/**
 * Estrutura das telas logadas: link para pular ao conteúdo, menu filtrado por perfil
 * (recolhido atrás de um botão em telas estreitas) com o usuário no rodapé, e a área da página.
 */
export function Layout() {
  const { usuario, pode, sair } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  // guarda em qual página o menu do usuário foi aberto: trocar de página já o fecha
  const [menuUsuarioAbertoEm, setMenuUsuarioAbertoEm] = useState<string | null>(null);
  const menuUsuarioAberto = menuUsuarioAbertoEm === pathname;
  const setMenuUsuarioAberto = (aberto: boolean) => setMenuUsuarioAbertoEm(aberto ? pathname : null);
  const conteudo = useRef<HTMLElement>(null);
  const areaUsuario = useRef<HTMLDivElement>(null);

  // fecha o menu do usuário ao clicar fora dele ou apertar Esc
  useEffect(() => {
    if (!menuUsuarioAberto) return;
    function cliqueFora(evento: globalThis.MouseEvent) {
      if (!areaUsuario.current?.contains(evento.target as Node)) setMenuUsuarioAbertoEm(null);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuUsuarioAbertoEm(null);
    }
    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menuUsuarioAberto]);

  // contagem de alertas abertos ao lado do item Alertas, atualizada a cada troca de página
  const [alertasAbertos, setAlertasAbertos] = useState(0);
  // a tela de alertas avisa quando um alerta é resolvido, para o contador acompanhar
  const [versaoAlertas, setVersaoAlertas] = useState(0);
  useEffect(() => {
    const aoMudar = () => setVersaoAlertas((v) => v + 1);
    window.addEventListener("pastrack:alertas-mudaram", aoMudar);
    return () => window.removeEventListener("pastrack:alertas-mudaram", aoMudar);
  }, []);
  const podeConsultar = pode("consultar");
  useEffect(() => {
    if (!podeConsultar) return;
    let ativo = true;
    buscarResumo()
      .then((resumo) => ativo && setAlertasAbertos(resumo.alertasAbertos))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [pathname, podeConsultar, versaoAlertas]);

  const inicial = usuario?.nome.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";

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
          <span className="logo">
            <Logo comSubtitulo />
          </span>
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
                  <item.icone size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="menu-rotulo">{item.rotulo}</span>
                  {item.caminho === "/alertas" && alertasAbertos > 0 && (
                    <span className="menu-contador">
                      {alertasAbertos}
                      <span className="sr-only"> abertos</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          {usuario && (
            <div className="menu-usuario" ref={areaUsuario}>
              {menuUsuarioAberto && (
                <ul id="opcoes-usuario" className="menu-usuario-opcoes">
                  <li>
                    <Link to="/alterar-senha" onClick={() => setMenuAberto(false)}>
                      <KeyRound size={16} aria-hidden="true" />
                      Alterar senha
                    </Link>
                  </li>
                  <li>
                    <button type="button" onClick={() => sair()}>
                      <LogOut size={16} aria-hidden="true" />
                      Sair
                    </button>
                  </li>
                </ul>
              )}
              <button
                type="button"
                className="menu-usuario-botao"
                aria-expanded={menuUsuarioAberto}
                aria-controls="opcoes-usuario"
                onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
              >
                <span className="avatar" aria-hidden="true">
                  {inicial}
                </span>
                <span className="menu-usuario-identidade">
                  <strong>{usuario.nome}</strong>
                  <span>
                    <span className="sr-only">Perfil: </span>
                    {ROTULOS_PERFIL[usuario.perfil]}
                  </span>
                </span>
                <ChevronsUpDown size={16} className="menu-usuario-seta" aria-hidden="true" />
              </button>
            </div>
          )}
        </nav>
      </div>

      <div className="conteudo">
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
