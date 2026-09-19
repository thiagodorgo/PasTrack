import { PerfilUsuario } from "@prisma/client";
import { z } from "zod";
import { semCaracteresDeControle } from "./comum.schema";

/** Maior valor da coluna inteira do Postgres: acima disso, o id nem chega ao banco. */
const MAIOR_ID = 2_147_483_647;

export const usuarioIdParam = z.object({ id: z.coerce.number().int().positive().max(MAIOR_ID) });

const nome = z
  .string({ error: "informe o nome" })
  .trim()
  .min(2, "use pelo menos 2 caracteres")
  .max(120, "use no máximo 120 caracteres")
  .refine(semCaracteresDeControle, "o nome tem caracteres inválidos");

const email = z
  .string({ error: "informe o e-mail" })
  .trim()
  .toLowerCase()
  .pipe(z.email("e-mail inválido").max(254, "e-mail longo demais"));

const perfil = z.enum(PerfilUsuario, { error: "perfil inválido" });

/** A senha não entra no corpo: a API gera a senha temporária. */
export const criarUsuarioSchema = z.object({ nome, email, perfil }).strict();

export const atualizarUsuarioSchema = z
  .object({ nome: nome.optional(), perfil: perfil.optional() })
  .strict()
  .refine((dados) => dados.nome !== undefined || dados.perfil !== undefined, "informe o nome ou o perfil");

/** Rotas sem corpo ou sem filtros: qualquer campo enviado é recusado. */
export const semCampos = z.object({}).strict();

export const alterarAtivoSchema = z
  .object({ ativo: z.boolean({ error: "informe ativo como true ou false" }) })
  .strict();

export type CriarUsuarioEntrada = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioEntrada = z.infer<typeof atualizarUsuarioSchema>;
export type AlterarAtivoEntrada = z.infer<typeof alterarAtivoSchema>;
