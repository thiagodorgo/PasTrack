import { describe, expect, it } from "vitest";
import { api } from "../helpers/api";
import { entrarComo } from "../helpers/cadastros";
import { criarFabricante, criarFornecedor, criarPastilha, criarUsuario } from "../helpers/fabricas";

type Metodo = "get" | "post" | "put" | "patch";

interface Caso {
  rota: string;
  metodo: Metodo;
  /** Caminho da requisição, já com o id do registro criado. */
  caminho: () => Promise<string>;
  corpo?: Record<string, unknown>;
}

const CASOS: Caso[] = [
  { rota: "GET /api/pastilhas", metodo: "get", caminho: async () => "/api/pastilhas?extra=1" },
  {
    rota: "POST /api/pastilhas",
    metodo: "post",
    caminho: async () => "/api/pastilhas",
    corpo: { codigo: "EX-1", descricao: "Pastilha", fabricanteId: 1, extra: 1 },
  },
  {
    rota: "PUT /api/pastilhas/:id",
    metodo: "put",
    caminho: async () => `/api/pastilhas/${(await criarPastilha()).id}`,
    corpo: { descricao: "Nova", extra: 1 },
  },
  { rota: "GET /api/fabricantes", metodo: "get", caminho: async () => "/api/fabricantes?extra=1" },
  {
    rota: "POST /api/fabricantes",
    metodo: "post",
    caminho: async () => "/api/fabricantes",
    corpo: { nome: "Sandvik", extra: 1 },
  },
  {
    rota: "PUT /api/fabricantes/:id",
    metodo: "put",
    caminho: async () => `/api/fabricantes/${(await criarFabricante()).id}`,
    corpo: { nome: "Sandvik", extra: 1 },
  },
  { rota: "GET /api/fornecedores", metodo: "get", caminho: async () => "/api/fornecedores?extra=1" },
  {
    rota: "POST /api/fornecedores",
    metodo: "post",
    caminho: async () => "/api/fornecedores",
    corpo: { nome: "Distribuidora", extra: 1 },
  },
  {
    rota: "PUT /api/fornecedores/:id",
    metodo: "put",
    caminho: async () => `/api/fornecedores/${(await criarFornecedor()).id}`,
    corpo: { nome: "Distribuidora", extra: 1 },
  },
  {
    rota: "POST /api/usuarios",
    metodo: "post",
    caminho: async () => "/api/usuarios",
    corpo: { nome: "Ana", email: "ana@exemplo.com", perfil: "OPERADOR", extra: 1 },
  },
  {
    rota: "PUT /api/usuarios/:id",
    metodo: "put",
    caminho: async () => `/api/usuarios/${(await criarUsuario()).usuario.id}`,
    corpo: { nome: "Ana", extra: 1 },
  },
  {
    rota: "PATCH /api/usuarios/:id/ativo",
    metodo: "patch",
    caminho: async () => `/api/usuarios/${(await criarUsuario()).usuario.id}/ativo`,
    corpo: { ativo: false, extra: 1 },
  },
  {
    rota: "PATCH /api/auth/senha",
    metodo: "patch",
    caminho: async () => "/api/auth/senha",
    corpo: { senhaAtual: "SenhaForte123", novaSenha: "OutraSenha456", extra: 1 },
  },
  { rota: "GET /api/alertas", metodo: "get", caminho: async () => "/api/alertas?extra=1" },
  { rota: "GET /api/movimentacoes", metodo: "get", caminho: async () => "/api/movimentacoes?extra=1" },
];

describe("campos fora do esquema", () => {
  it.each(CASOS.map((caso) => [caso.rota, caso] as const))(
    "%s diz qual campo não é permitido",
    async (_rota, caso) => {
      const { cabecalho } = await entrarComo("ADMINISTRADOR");
      const caminho = await caso.caminho();

      let requisicao = api()[caso.metodo](caminho).set(cabecalho);
      if (caso.corpo) requisicao = requisicao.send(caso.corpo);
      const resposta = await requisicao;

      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe("DADOS_INVALIDOS");
      expect(resposta.body.campos).toContainEqual(
        expect.objectContaining({ mensagem: "Campo não permitido: extra" })
      );
    }
  );

  it("POST /api/auth/login diz qual campo não é permitido", async () => {
    const { usuario, senha } = await criarUsuario();

    const resposta = await api().post("/api/auth/login").send({ email: usuario.email, senha, extra: 1 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.campos).toContainEqual(
      expect.objectContaining({ mensagem: "Campo não permitido: extra" })
    );
  });
});
