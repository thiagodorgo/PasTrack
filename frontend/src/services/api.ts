import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333/api",
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pastrack:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("pastrack:token");
      localStorage.removeItem("pastrack:usuario");
      window.location.href = "/login";
    }
    return Promise.reject(erro);
  }
);

export function mensagemDeErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    return erro.response?.data?.erro ?? "Falha na comunicação com o servidor";
  }
  return "Ocorreu um erro inesperado";
}
