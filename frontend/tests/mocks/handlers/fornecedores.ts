import { http, HttpResponse } from "msw";
import type { DadosFornecedor } from "../../../src/services/cadastros";
import type { Fornecedor } from "../../../src/types";
import { formatarCnpj, normalizarCnpj, validarCnpj } from "../../../src/utils/formato";
import { proximoId, recusarAcesso, responderDadosInvalidos, responderErro } from "../acesso";

/** Fornecedores de exemplo, com CNPJs válidos: o estado em que cada teste começa. */
export const fornecedores: Fornecedor[] = [
  { id: 1, nome: "Ferramentaria Sul Ltda", cnpj: "11.222.333/0001-81", contato: "(47) 3333-1111" },
  { id: 2, nome: "TecCorte Suprimentos", cnpj: "12.345.678/0001-95", contato: "(47) 3333-2222" },
];

// cópia alterável: criações e edições valem até o fim do teste (setup.ts reinicia depois de cada um)
let registros: Fornecedor[] = [];

export function reiniciarFornecedores() {
  registros = fornecedores.map((fornecedor) => ({ ...fornecedor }));
}
reiniciarFornecedores();

/** Fornecedor no estado atual do teste, incluindo os criados nele. */
export function fornecedorRegistrado(id: number): Fornecedor | undefined {
  return registros.find((fornecedor) => fornecedor.id === id);
}

const naoEncontrado = () =>
  responderErro(404, { erro: "Fornecedor não encontrado", codigo: "NAO_ENCONTRADO" });

/**
 * Valida o corpo como a API: nome obrigatório e CNPJ, numérico ou alfanumérico, conferido pelos dígitos
 * verificadores e gravado com máscara. Campo ausente mantém o valor atual; texto vazio apaga.
 */
type DadosLidos =
  | { dados: Omit<Fornecedor, "id">; campos?: undefined }
  | { dados?: undefined; campos: Record<string, string> };

async function lerDados(request: Request, atual?: Fornecedor): Promise<DadosLidos> {
  const dados = (await request.json()) as Partial<DadosFornecedor>;
  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
  if (!nome) return { campos: { nome: "Informe o nome do fornecedor" } };

  let cnpj = atual?.cnpj ?? null;
  if (typeof dados.cnpj === "string") {
    const informado = dados.cnpj.trim();
    if (informado && !validarCnpj(informado)) return { campos: { cnpj: "CNPJ inválido" } };
    cnpj = informado ? formatarCnpj(informado) : null;
  }
  let contato = atual?.contato ?? null;
  if (typeof dados.contato === "string") contato = dados.contato.trim() || null;
  return { dados: { nome, cnpj, contato } };
}

function cnpjEmUso(cnpj: string | null, ignorarId?: number) {
  if (!cnpj) return false;
  return registros.some(
    (f) => f.id !== ignorarId && f.cnpj !== null && normalizarCnpj(f.cnpj) === normalizarCnpj(cnpj)
  );
}

const duplicado = () =>
  responderErro(409, { erro: "Já existe um fornecedor com este CNPJ", codigo: "DUPLICADO" });

export const fornecedoresHandlers = [
  http.get("*/api/fornecedores", () =>
    HttpResponse.json([...registros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
  ),

  http.get("*/api/fornecedores/:id", ({ params }) => {
    const fornecedor = fornecedorRegistrado(Number(params.id));
    return fornecedor ? HttpResponse.json(fornecedor) : naoEncontrado();
  }),

  http.post("*/api/fornecedores", async ({ request }) => {
    const recusa = recusarAcesso(request, "gerenciarFornecedores");
    if (recusa) return recusa;
    const lido = await lerDados(request);
    if (!lido.dados) return responderDadosInvalidos(lido.campos);
    if (cnpjEmUso(lido.dados.cnpj)) return duplicado();
    const criado: Fornecedor = { id: proximoId(registros), ...lido.dados };
    registros.push(criado);
    return HttpResponse.json(criado, { status: 201 });
  }),

  http.put("*/api/fornecedores/:id", async ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarFornecedores");
    if (recusa) return recusa;
    const fornecedor = fornecedorRegistrado(Number(params.id));
    if (!fornecedor) return naoEncontrado();
    const lido = await lerDados(request, fornecedor);
    if (!lido.dados) return responderDadosInvalidos(lido.campos);
    if (cnpjEmUso(lido.dados.cnpj, fornecedor.id)) return duplicado();
    Object.assign(fornecedor, lido.dados);
    return HttpResponse.json(fornecedor);
  }),
];
