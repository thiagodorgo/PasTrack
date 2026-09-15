import { http, HttpResponse } from "msw";
import type { DadosFabricante } from "../../../src/services/cadastros";
import type { Fabricante } from "../../../src/types";
import { proximoId, recusarAcesso, responderDadosInvalidos, responderErro } from "../acesso";

/** Fabricantes de exemplo: o estado em que cada teste começa. */
export const fabricantes: Fabricante[] = [
  { id: 1, nome: "Sandvik Coromant" },
  { id: 2, nome: "Iscar" },
];

// cópia alterável: criações e edições valem até o fim do teste (setup.ts reinicia depois de cada um)
let registros: Fabricante[] = [];

export function reiniciarFabricantes() {
  registros = fabricantes.map((fabricante) => ({ ...fabricante }));
}
reiniciarFabricantes();

/** Fabricante no estado atual do teste, incluindo os criados nele. */
export function fabricanteRegistrado(id: number): Fabricante | undefined {
  return registros.find((fabricante) => fabricante.id === id);
}

function nomeEmUso(nome: string, ignorarId?: number) {
  return registros.some((f) => f.id !== ignorarId && f.nome.toLowerCase() === nome.toLowerCase());
}

async function lerNome(request: Request): Promise<string> {
  const { nome } = (await request.json()) as Partial<DadosFabricante>;
  return typeof nome === "string" ? nome.trim() : "";
}

const naoEncontrado = () =>
  responderErro(404, { erro: "Fabricante não encontrado", codigo: "NAO_ENCONTRADO" });
const duplicado = () =>
  responderErro(409, { erro: "Já existe um fabricante com este nome", codigo: "DUPLICADO" });

export const fabricantesHandlers = [
  http.get("*/api/fabricantes", () =>
    HttpResponse.json([...registros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
  ),

  http.get("*/api/fabricantes/:id", ({ params }) => {
    const fabricante = fabricanteRegistrado(Number(params.id));
    return fabricante ? HttpResponse.json(fabricante) : naoEncontrado();
  }),

  http.post("*/api/fabricantes", async ({ request }) => {
    const recusa = recusarAcesso(request, "gerenciarFabricantes");
    if (recusa) return recusa;
    const nome = await lerNome(request);
    if (!nome) return responderDadosInvalidos({ nome: "Informe o nome do fabricante" });
    if (nomeEmUso(nome)) return duplicado();
    const criado: Fabricante = { id: proximoId(registros), nome };
    registros.push(criado);
    return HttpResponse.json(criado, { status: 201 });
  }),

  http.put("*/api/fabricantes/:id", async ({ request, params }) => {
    const recusa = recusarAcesso(request, "gerenciarFabricantes");
    if (recusa) return recusa;
    const fabricante = fabricanteRegistrado(Number(params.id));
    if (!fabricante) return naoEncontrado();
    const nome = await lerNome(request);
    if (!nome) return responderDadosInvalidos({ nome: "Informe o nome do fabricante" });
    if (nomeEmUso(nome, fabricante.id)) return duplicado();
    fabricante.nome = nome;
    return HttpResponse.json(fabricante);
  }),
];
