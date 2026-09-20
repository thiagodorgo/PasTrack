import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Perfis que a suíte usa, com o e-mail de cada um no seed de demonstração. */
export const CONTAS = {
  ADMINISTRADOR: process.env.SEED_ADMIN_EMAIL ?? "admin@pastrack.local",
  GESTOR: "gestor@pastrack.local",
  OPERADOR: "operador@pastrack.local",
  COMPRADOR: "comprador@pastrack.local",
} as const;

export type Perfil = keyof typeof CONTAS;

/** Senha do administrador depois do preparo: ele nasce com troca obrigatória e a suíte a resolve. */
export const SENHA_ADMIN = "TrocadaNoPreparo2026";
export const SENHA_ADMIN_INICIAL = process.env.SEED_ADMIN_SENHA ?? "PrimeiroAcessoE2E2026";
export const SENHA_DEMO = process.env.SEED_DEMO_SENHA ?? "DemoTesteE2E2026";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PASTA_SESSOES = path.join(AQUI, "..", "sessoes");

export function senhaDoPerfil(perfil: Perfil): string {
  return perfil === "ADMINISTRADOR" ? SENHA_ADMIN : SENHA_DEMO;
}

export function arquivoDaSessao(perfil: Perfil): string {
  return path.join(PASTA_SESSOES, `${perfil.toLowerCase()}.json`);
}

interface RespostaLogin {
  token: string;
  usuario: { id: number; nome: string; perfil: string; deveTrocarSenha: boolean };
}

export async function entrarPelaApi(base: string, email: string, senha: string): Promise<RespostaLogin> {
  const resposta = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!resposta.ok) {
    throw new Error(`login de ${email} falhou com ${resposta.status}: ${await resposta.text()}`);
  }
  return (await resposta.json()) as RespostaLogin;
}

/**
 * Grava o estado da sessão como o navegador guarda: token, marca de recebimento e usuário.
 * Assim os casos já entram logados, sem repetir a tela de login em cada um.
 */
export function gravarSessao(perfil: Perfil, base: string, login: RespostaLogin): void {
  mkdirSync(PASTA_SESSOES, { recursive: true });
  const estado = {
    cookies: [],
    origins: [
      {
        origin: base,
        localStorage: [
          { name: "pastrack:token", value: login.token },
          { name: "pastrack:token-recebido-em", value: String(Date.now()) },
          { name: "pastrack:usuario", value: JSON.stringify(login.usuario) },
        ],
      },
    ],
  };
  writeFileSync(arquivoDaSessao(perfil), JSON.stringify(estado, null, 2), "utf8");
}
