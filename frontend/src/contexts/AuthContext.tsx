import {
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { EVENTO_SESSAO_EXPIRADA, EVENTO_TROCA_SENHA_OBRIGATORIA } from "../services/api";
import * as authService from "../services/auth";
import type { Usuario } from "../types";
import { type Acao, pode as perfilPode } from "../utils/permissoes";

/** Motivo da saída, repassado à tela de login em location.state.motivo. */
export type MotivoSaida = "sessao-expirada";

interface AuthContexto {
  usuario: Usuario | null;
  /** Faz o login e devolve o usuário, para a tela decidir o destino. */
  entrar(email: string, senha: string): Promise<Usuario>;
  /** Encerra a sessão e leva ao login, com o motivo (quando houver) em location.state. */
  sair(motivo?: MotivoSaida): void;
  /** Troca o token e o usuário da sessão, como depois da troca de senha. */
  atualizarSessao(token: string, usuario: Usuario): void;
  /** O usuário logado pode executar a ação? Serve só para a interface: quem decide é a API. */
  pode(acao: Acao): boolean;
}

const Contexto = createContext<AuthContexto | null>(null);

/**
 * Sessão do usuário. Precisa ficar dentro do Router: ao ouvir os eventos disparados pela camada da API,
 * leva ao login (sessão expirada) ou à troca de senha (troca obrigatória) sem recarregar a página.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => authService.usuarioSalvo());
  const navegar = useNavigate();

  const sair = useCallback(
    (motivo?: MotivoSaida) => {
      authService.sair();
      navegar("/login", { replace: true, state: motivo ? { motivo } : null });
      // O roteador aplica a navegação como transição. Limpar o usuário na mesma transição evita que a rota
      // protegida atual renderize sem usuário antes da troca de rota e redirecione de novo, sem o motivo.
      startTransition(() => setUsuario(null));
    },
    [navegar]
  );

  useEffect(() => {
    function aoExpirarSessao() {
      sair("sessao-expirada");
    }

    function aoExigirTrocaDeSenha() {
      const marcado = authService.marcarTrocaDeSenhaObrigatoria();
      if (marcado) setUsuario(marcado);
      navegar("/alterar-senha", { replace: true });
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
    window.addEventListener(EVENTO_TROCA_SENHA_OBRIGATORIA, aoExigirTrocaDeSenha);
    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
      window.removeEventListener(EVENTO_TROCA_SENHA_OBRIGATORIA, aoExigirTrocaDeSenha);
    };
  }, [sair, navegar]);

  async function entrar(email: string, senha: string) {
    const logado = await authService.login(email, senha);
    setUsuario(logado);
    return logado;
  }

  function atualizarSessao(token: string, novoUsuario: Usuario) {
    authService.gravarSessao(token, novoUsuario);
    setUsuario(novoUsuario);
  }

  function pode(acao: Acao) {
    return perfilPode(usuario?.perfil, acao);
  }

  return (
    <Contexto.Provider value={{ usuario, entrar, sair, atualizarSessao, pode }}>{children}</Contexto.Provider>
  );
}

export function useAuth(): AuthContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return contexto;
}
