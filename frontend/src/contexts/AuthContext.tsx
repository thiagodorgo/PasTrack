import { createContext, ReactNode, useContext, useState } from "react";
import * as authService from "../services/auth";
import { Usuario } from "../types";

interface AuthContexto {
  usuario: Usuario | null;
  entrar(email: string, senha: string): Promise<void>;
  sair(): void;
}

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(authService.usuarioSalvo());

  async function entrar(email: string, senha: string) {
    const logado = await authService.login(email, senha);
    setUsuario(logado);
  }

  function sair() {
    authService.sair();
    setUsuario(null);
  }

  return <Contexto.Provider value={{ usuario, entrar, sair }}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return contexto;
}
