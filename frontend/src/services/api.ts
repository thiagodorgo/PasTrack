import axios from "axios";
import type { CampoInvalido, CodigoErro, ErroApi } from "../types";
import { lerToken, limparSessao } from "./sessao";

/** Disparado no window quando a API recusa a sessão (401). O AuthContext encerra a sessão e leva ao login. */
export const EVENTO_SESSAO_EXPIRADA = "pastrack:sessao-expirada";

/** Disparado no window quando a API exige a troca da senha temporária (403 TROCA_SENHA_OBRIGATORIA). */
export const EVENTO_TROCA_SENHA_OBRIGATORIA = "pastrack:troca-senha-obrigatoria";

// no login, o 401 é credencial recusada, não sessão expirada
const ROTA_DE_LOGIN = "/auth/login";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = lerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro: unknown) => {
    if (axios.isAxiosError(erro) && erro.response) {
      const { status } = erro.response;
      if (status === 401 && erro.config?.url !== ROTA_DE_LOGIN) {
        // sem recarregar a página: quem navega até o login é o AuthContext, ao ouvir o evento
        limparSessao();
        window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
      } else if (status === 403 && codigoDoErro(erro) === "TROCA_SENHA_OBRIGATORIA") {
        window.dispatchEvent(new Event(EVENTO_TROCA_SENHA_OBRIGATORIA));
      }
    }
    return Promise.reject(erro);
  }
);

/** Corpo de erro da API, quando a resposta trouxe um objeto JSON. */
function corpoDoErro(erro: unknown): Partial<ErroApi> | undefined {
  if (!axios.isAxiosError(erro)) return undefined;
  const corpo: unknown = erro.response?.data;
  return typeof corpo === "object" && corpo !== null ? (corpo as Partial<ErroApi>) : undefined;
}

/**
 * Mensagem para mostrar ao usuário. Distingue o tempo esgotado, a falta de conexão,
 * a mensagem enviada pelo servidor e o erro inesperado, que não veio da comunicação com a API.
 */
export function mensagemDeErro(erro: unknown): string {
  if (!axios.isAxiosError(erro)) return "Ocorreu um erro inesperado";
  if (erro.code === "ECONNABORTED" || erro.code === "ETIMEDOUT") {
    return "O servidor demorou para responder. Tente de novo em instantes.";
  }
  if (!erro.response) {
    return erro.code === "ERR_NETWORK"
      ? "Sem conexão com o servidor. Verifique a rede e tente de novo."
      : "Falha na comunicação com o servidor";
  }
  const mensagem = corpoDoErro(erro)?.erro;
  return typeof mensagem === "string" && mensagem.trim() !== ""
    ? mensagem
    : "Falha na comunicação com o servidor";
}

/**
 * Erros por campo devolvidos pela validação da API, como { quantidade: "..." }.
 * Mais de um erro no mesmo campo vem unido por "; ". Sem erros por campo, devolve um objeto vazio.
 */
export function camposDoErro(erro: unknown): Record<string, string> {
  const campos: unknown = corpoDoErro(erro)?.campos;
  const porCampo: Record<string, string> = {};
  if (!Array.isArray(campos)) return porCampo;
  for (const campo of campos) {
    if (typeof campo !== "object" || campo === null) continue;
    const { caminho, mensagem } = campo as Partial<CampoInvalido>;
    if (typeof caminho !== "string" || typeof mensagem !== "string") continue;
    porCampo[caminho] = porCampo[caminho] ? `${porCampo[caminho]}; ${mensagem}` : mensagem;
  }
  return porCampo;
}

/** Código estável do erro da API, como DUPLICADO, quando a resposta trouxer um. */
export function codigoDoErro(erro: unknown): CodigoErro | undefined {
  const codigo = corpoDoErro(erro)?.codigo;
  return typeof codigo === "string" ? codigo : undefined;
}
