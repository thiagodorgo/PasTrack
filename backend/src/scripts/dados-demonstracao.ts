import { PerfilUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { validarPoliticaDeSenha } from "../services/politica-senha";

export const USUARIOS_DEMONSTRACAO: { nome: string; email: string; perfil: PerfilUsuario }[] = [
  { nome: "Gestão (demonstração)", email: "gestor@pastrack.local", perfil: "GESTOR" },
  { nome: "Operação (demonstração)", email: "operador@pastrack.local", perfil: "OPERADOR" },
  { nome: "Compras (demonstração)", email: "comprador@pastrack.local", perfil: "COMPRADOR" },
];

const PASTILHAS_DEMONSTRACAO = [
  {
    codigo: "CNMG 120408-PM",
    descricao: "Pastilha de torneamento CNMG",
    modelo: "120408",
    aplicacao: "Torneamento de aço",
    estoqueMinimo: 10,
    saldoAtual: 24,
    fabricante: "Sandvik Coromant",
  },
  {
    codigo: "WNMG 080408-TF",
    descricao: "Pastilha de torneamento WNMG",
    modelo: "080408",
    aplicacao: "Torneamento de inox",
    estoqueMinimo: 8,
    saldoAtual: 6,
    fabricante: "Iscar",
  },
  {
    codigo: "APMT 1604 PDER",
    descricao: "Pastilha de fresamento APMT",
    modelo: "1604",
    aplicacao: "Fresamento de topo",
    estoqueMinimo: 12,
    saldoAtual: 30,
    fabricante: "Iscar",
  },
];

/**
 * Carrega dados de demonstração: um usuário por perfil, fabricantes, fornecedores e pastilhas,
 * com alerta aberto para o que já nasce no estoque mínimo. Idempotente.
 */
export async function criarDadosDeDemonstracao(senhaUsuarios: string): Promise<void> {
  const problemas = validarPoliticaDeSenha(senhaUsuarios);
  if (problemas.length > 0) {
    throw new Error(
      `A senha dos usuários de demonstração não atende à política de senha: ${problemas.join("; ")}.`
    );
  }

  const senhaHash = await bcrypt.hash(senhaUsuarios, env.BCRYPT_CUSTO);
  for (const usuario of USUARIOS_DEMONSTRACAO) {
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      update: {},
      create: { ...usuario, senhaHash },
    });
  }

  const fabricantes = new Map<string, number>();
  for (const nome of ["Sandvik Coromant", "Iscar"]) {
    const fabricante = await prisma.fabricante.upsert({ where: { nome }, update: {}, create: { nome } });
    fabricantes.set(nome, fabricante.id);
  }

  await prisma.fornecedor.createMany({
    data: [
      {
        nome: "Ferramentaria Sul Ltda",
        cnpj: "11.222.333/0001-81",
        contato: "vendas@ferramentariasul.com.br",
      },
      { nome: "TecCorte Suprimentos", cnpj: "55.666.777/0001-81", contato: "(47) 3333-2222" },
    ],
    skipDuplicates: true,
  });

  for (const { fabricante, ...dados } of PASTILHAS_DEMONSTRACAO) {
    const pastilha = await prisma.pastilha.upsert({
      where: { codigo: dados.codigo },
      update: {},
      create: { ...dados, fabricanteId: fabricantes.get(fabricante)! },
    });
    if (pastilha.saldoAtual <= pastilha.estoqueMinimo) {
      const aberto = await prisma.alerta.findFirst({
        where: { pastilhaId: pastilha.id, situacao: "ABERTO" },
      });
      if (!aberto) {
        await prisma.alerta.create({ data: { pastilhaId: pastilha.id } });
      }
    }
  }
}
