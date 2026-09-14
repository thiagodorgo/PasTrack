-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMINISTRADOR', 'GESTOR', 'OPERADOR', 'COMPRADOR');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusAlerta" AS ENUM ('ABERTO', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabricante" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "fabricante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pastilha" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "modelo" TEXT,
    "aplicacao" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'un',
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "saldo_atual" INTEGER NOT NULL DEFAULT 0,
    "id_fabricante" INTEGER NOT NULL,

    CONSTRAINT "pastilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento" TEXT,
    "observacao" TEXT,
    "id_pastilha" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_fornecedor" INTEGER,

    CONSTRAINT "movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" SERIAL NOT NULL,
    "data_geracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situacao" "StatusAlerta" NOT NULL DEFAULT 'ABERTO',
    "id_pastilha" INTEGER NOT NULL,

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fabricante_nome_key" ON "fabricante"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_cnpj_key" ON "fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "pastilha_codigo_key" ON "pastilha"("codigo");

-- AddForeignKey
ALTER TABLE "pastilha" ADD CONSTRAINT "pastilha_id_fabricante_fkey" FOREIGN KEY ("id_fabricante") REFERENCES "fabricante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_id_pastilha_fkey" FOREIGN KEY ("id_pastilha") REFERENCES "pastilha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_id_fornecedor_fkey" FOREIGN KEY ("id_fornecedor") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_id_pastilha_fkey" FOREIGN KEY ("id_pastilha") REFERENCES "pastilha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

