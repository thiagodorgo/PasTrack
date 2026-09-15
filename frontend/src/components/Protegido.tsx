import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { estaAutenticado, sessaoExpirada } from "../services/auth";
import type { Acao } from "../utils/permissoes";

interface ProtegidoProps {
  children: ReactNode;
  /** Ação exigida para ver o conteúdo; quem não pode vai para /sem-permissao. */
  acao?: Acao;
}

/**
 * Guarda de rota. Sem sessão válida, leva ao login (avisando quando a sessão expirou);
 * com a troca de senha pendente, leva a /alterar-senha; sem permissão para a ação, leva a /sem-permissao.
 */
export function Protegido({ children, acao }: ProtegidoProps) {
  const { usuario, pode } = useAuth();
  const { pathname } = useLocation();

  if (!usuario || !estaAutenticado()) {
    return <Navigate to="/login" replace state={sessaoExpirada() ? { motivo: "sessao-expirada" } : null} />;
  }
  if (usuario.deveTrocarSenha && pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }
  if (acao && !pode(acao)) {
    return <Navigate to="/sem-permissao" replace />;
  }
  return <>{children}</>;
}
