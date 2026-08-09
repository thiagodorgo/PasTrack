import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@pastrack.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@pastrack.com",
      senhaHash,
      perfil: "ADMINISTRADOR",
    },
  });

  const sandvik = await prisma.fabricante.upsert({
    where: { nome: "Sandvik Coromant" },
    update: {},
    create: { nome: "Sandvik Coromant" },
  });

  const iscar = await prisma.fabricante.upsert({
    where: { nome: "Iscar" },
    update: {},
    create: { nome: "Iscar" },
  });

  await prisma.fornecedor.createMany({
    data: [
      { nome: "Ferramentaria Sul Ltda", cnpj: "11.222.333/0001-44", contato: "vendas@ferramentariasul.com.br" },
      { nome: "TecCorte Suprimentos", cnpj: "55.666.777/0001-88", contato: "(47) 3333-2222" },
    ],
    skipDuplicates: true,
  });

  const pastilhas = [
    { codigo: "CNMG 120408-PM", descricao: "Pastilha de torneamento CNMG", modelo: "120408", aplicacao: "Torneamento de aço", estoqueMinimo: 10, saldoAtual: 24, fabricanteId: sandvik.id },
    { codigo: "WNMG 080408-TF", descricao: "Pastilha de torneamento WNMG", modelo: "080408", aplicacao: "Torneamento de inox", estoqueMinimo: 8, saldoAtual: 6, fabricanteId: iscar.id },
    { codigo: "APMT 1604 PDER", descricao: "Pastilha de fresamento APMT", modelo: "1604", aplicacao: "Fresamento de topo", estoqueMinimo: 12, saldoAtual: 30, fabricanteId: iscar.id },
  ];

  for (const dados of pastilhas) {
    await prisma.pastilha.upsert({
      where: { codigo: dados.codigo },
      update: {},
      create: dados,
    });
  }

  console.log("Seed concluído. Login inicial: admin@pastrack.com / admin123");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
