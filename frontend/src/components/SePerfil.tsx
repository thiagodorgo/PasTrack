import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Acao } from "../utils/permissoes";

interface SePerfilProps {
  /** Ação da matriz de permissões que o usuário logado precisa poder executar. */
  acao: Acao;
  children: ReactNode;
  /** O que mostrar a quem não pode; por padrão, nada. */
  senao?: ReactNode;
}

/** Mostra o conteúdo só a quem pode executar a ação. Esconder não protege nada: a API também recusa. */
export function SePerfil({ acao, children, senao = null }: SePerfilProps) {
  const { pode } = useAuth();
  return <>{pode(acao) ? children : senao}</>;
}
