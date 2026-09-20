import { BASE_URL } from "../playwright.config";
import {
  CONTAS,
  entrarPelaApi,
  gravarSessao,
  type Perfil,
  SENHA_ADMIN,
  SENHA_ADMIN_INICIAL,
  senhaDoPerfil,
} from "./sessao";

async function esperarNoAr(base: string): Promise<void> {
  const limite = Date.now() + 120_000;
  for (;;) {
    try {
      const resposta = await fetch(`${base}/api/health`);
      if (resposta.ok) return;
    } catch {
      // o ambiente ainda está subindo
    }
    if (Date.now() > limite) throw new Error(`o sistema não respondeu em ${base} em 2 minutos`);
    await new Promise((pronto) => setTimeout(pronto, 1_000));
  }
}

/**
 * O administrador inicial nasce com a troca de senha obrigatória. A troca é resolvida aqui, uma vez,
 * para os casos não tropeçarem nela; quem exercita a troca é o caso do primeiro acesso, com um
 * usuário criado só para isso.
 */
async function prepararAdministrador(base: string): Promise<void> {
  const primeiro = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CONTAS.ADMINISTRADOR, senha: SENHA_ADMIN_INICIAL }),
  });
  if (primeiro.status !== 200) return; // a senha já foi trocada numa execução anterior
  const { token, usuario } = (await primeiro.json()) as {
    token: string;
    usuario: { deveTrocarSenha: boolean };
  };
  if (!usuario.deveTrocarSenha) return;

  const troca = await fetch(`${base}/api/auth/senha`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ senhaAtual: SENHA_ADMIN_INICIAL, novaSenha: SENHA_ADMIN }),
  });
  if (!troca.ok) {
    throw new Error(`a troca da senha do administrador falhou: ${await troca.text()}`);
  }
}

export default async function preparar(): Promise<void> {
  await esperarNoAr(BASE_URL);
  await prepararAdministrador(BASE_URL);

  for (const perfil of Object.keys(CONTAS) as Perfil[]) {
    const login = await entrarPelaApi(BASE_URL, CONTAS[perfil], senhaDoPerfil(perfil));
    gravarSessao(perfil, BASE_URL, login);
  }
}
