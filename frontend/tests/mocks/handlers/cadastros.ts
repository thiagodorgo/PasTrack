import { http, HttpResponse } from "msw";
import type { Fabricante, Fornecedor } from "../../../src/types";

export const fabricantes: Fabricante[] = [
  { id: 1, nome: "Sandvik Coromant" },
  { id: 2, nome: "Iscar" },
];

export const fornecedores: Fornecedor[] = [
  { id: 1, nome: "Ferramentaria Sul Ltda", cnpj: "11.222.333/0001-44", contato: "(47) 3333-1111" },
  { id: 2, nome: "TecCorte Suprimentos", cnpj: "55.666.777/0001-88", contato: "(47) 3333-2222" },
];

export const cadastrosHandlers = [
  http.get("*/api/fabricantes", () => HttpResponse.json(fabricantes)),
  http.get("*/api/fornecedores", () => HttpResponse.json(fornecedores)),
];
