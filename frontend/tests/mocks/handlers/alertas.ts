import { http, HttpResponse } from "msw";
import type { Alerta, AlertaResolvido, Pastilha } from "../../../src/types";
import { recusarAcesso, responderDadosInvalidos, responderErro, usuarioDaRequisicao } from "../acesso";
import { usuarioGestor } from "./auth";
import { pastilhas } from "./pastilhas";

function resumoDaPastilha({ codigo, descricao, saldoAtual, estoqueMinimo }: Pastilha): Alerta["pastilha"] {
  return { codigo, descricao, saldoAtual, estoqueMinimo };
}

/** Alertas de exemplo, do mais novo para o mais antigo: um aberto para cada item crítico e um resolvido. */
export const alertas: Alerta[] = [
  {
    id: 3,
    dataGeracao: "2026-09-10T14:30:00.000Z",
    situacao: "ABERTO",
    dataResolucao: null,
    pastilhaId: pastilhas[1].id,
    pastilha: resumoDaPastilha(pastilhas[1]),
    resolvidoPor: null,
  },
  {
    id: 2,
    dataGeracao: "2026-09-09T09:15:00.000Z",
    situacao: "ABERTO",
    dataResolucao: null,
    pastilhaId: pastilhas[2].id,
    pastilha: resumoDaPastilha(pastilhas[2]),
    resolvidoPor: null,
  },
  {
    id: 1,
    dataGeracao: "2026-09-01T08:00:00.000Z",
    situacao: "RESOLVIDO",
    dataResolucao: "2026-09-02T15:30:00.000Z",
    pastilhaId: pastilhas[0].id,
    pastilha: resumoDaPastilha(pastilhas[0]),
    resolvidoPor: { id: usuarioGestor.id, nome: usuarioGestor.nome },
  },
];

// cópia alterável: resolver um alerta vale até o fim do teste (setup.ts reinicia depois de cada um)
let registros: Alerta[] = [];

export function reiniciarAlertas() {
  registros = alertas.map((alerta) => ({ ...alerta }));
}
reiniciarAlertas();

const SITUACOES = ["ABERTO", "RESOLVIDO", "TODAS"];

export const alertasHandlers = [
  http.get("*/api/alertas", ({ request }) => {
    const situacao = new URL(request.url).searchParams.get("situacao") ?? "ABERTO";
    if (!SITUACOES.includes(situacao)) {
      return responderDadosInvalidos({ situacao: "Use ABERTO, RESOLVIDO ou TODAS" });
    }
    return HttpResponse.json(
      situacao === "TODAS" ? registros : registros.filter((alerta) => alerta.situacao === situacao)
    );
  }),

  http.patch("*/api/alertas/:id/resolver", ({ request, params }) => {
    const recusa = recusarAcesso(request, "resolverAlerta");
    if (recusa) return recusa;
    const alerta = registros.find(({ id }) => id === Number(params.id));
    if (!alerta) {
      return responderErro(404, { erro: "Alerta não encontrado", codigo: "NAO_ENCONTRADO" });
    }
    if (alerta.situacao === "RESOLVIDO") {
      return responderErro(409, { erro: "Este alerta já foi resolvido", codigo: "ALERTA_JA_RESOLVIDO" });
    }
    const usuario = usuarioDaRequisicao(request);
    alerta.situacao = "RESOLVIDO";
    alerta.dataResolucao = new Date().toISOString();
    alerta.resolvidoPor = usuario && { id: usuario.id, nome: usuario.nome };
    const { id, dataGeracao, situacao, dataResolucao, pastilhaId } = alerta;
    const resolvido: AlertaResolvido = { id, dataGeracao, situacao, dataResolucao, pastilhaId };
    return HttpResponse.json(resolvido);
  }),
];
