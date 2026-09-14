-- AlterTable
ALTER TABLE "alerta" ADD COLUMN     "data_resolucao" TIMESTAMP(3),
ADD COLUMN     "id_resolvido_por" INTEGER;

-- AlterTable
ALTER TABLE "fabricante" ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "fornecedor" ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "pastilha" ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deve_trocar_senha" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "versao_token" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "id_entidade" INTEGER NOT NULL,
    "antes" JSONB,
    "depois" JSONB,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_entidade_id_entidade_idx" ON "auditoria"("entidade", "id_entidade");

-- CreateIndex
CREATE INDEX "auditoria_data_hora_idx" ON "auditoria"("data_hora");

-- CreateIndex
CREATE INDEX "alerta_situacao_data_geracao_idx" ON "alerta"("situacao", "data_geracao");

-- CreateIndex
CREATE INDEX "alerta_id_pastilha_idx" ON "alerta"("id_pastilha");

-- CreateIndex
CREATE INDEX "movimentacao_id_pastilha_data_hora_idx" ON "movimentacao"("id_pastilha", "data_hora");

-- CreateIndex
CREATE INDEX "movimentacao_id_usuario_idx" ON "movimentacao"("id_usuario");

-- CreateIndex
CREATE INDEX "movimentacao_data_hora_idx" ON "movimentacao"("data_hora");

-- CreateIndex
CREATE INDEX "pastilha_id_fabricante_idx" ON "pastilha"("id_fabricante");

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_id_resolvido_por_fkey" FOREIGN KEY ("id_resolvido_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Regras de integridade que o Prisma não representa no schema.
ALTER TABLE "pastilha" ADD CONSTRAINT "pastilha_saldo_nao_negativo" CHECK ("saldo_atual" >= 0);
ALTER TABLE "pastilha" ADD CONSTRAINT "pastilha_estoque_minimo_nao_negativo" CHECK ("estoque_minimo" >= 0);
ALTER TABLE "movimentacao" ADD CONSTRAINT "movimentacao_quantidade_positiva" CHECK ("quantidade" > 0);

-- Dados antigos: se houver mais de um alerta ABERTO para a mesma pastilha, mantém aberto só o mais recente.
UPDATE "alerta" AS antigo
SET "situacao" = 'RESOLVIDO', "data_resolucao" = CURRENT_TIMESTAMP
WHERE antigo."situacao" = 'ABERTO'
  AND EXISTS (
    SELECT 1 FROM "alerta" AS recente
    WHERE recente."id_pastilha" = antigo."id_pastilha" AND recente."situacao" = 'ABERTO' AND recente."id" > antigo."id"
  );

-- No máximo um alerta ABERTO por pastilha.
CREATE UNIQUE INDEX "alerta_aberto_por_pastilha" ON "alerta"("id_pastilha") WHERE "situacao" = 'ABERTO';
