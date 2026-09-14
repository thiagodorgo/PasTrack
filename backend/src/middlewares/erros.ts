import { Prisma } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    /** Código estável para o frontend reagir sem depender do texto (ex.: TROCA_SENHA_OBRIGATORIA). */
    public codigo?: string
  ) {
    super(message);
  }
}

// envolve controllers assíncronos para que erros caiam no tratador
export const capturar =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

interface RespostaDeErro {
  status: number;
  erro: string;
  codigo?: string;
}

/** Erros do express.json(): corpo malformado ou grande demais. */
function erroDoCorpo(erro: Error): RespostaDeErro | null {
  const tipo = (erro as { type?: unknown }).type;
  if (tipo === "entity.parse.failed") return { status: 400, erro: "JSON malformado" };
  if (tipo === "entity.too.large") return { status: 413, erro: "Corpo da requisição grande demais" };
  return null;
}

const MENSAGENS_DE_DUPLICIDADE: Record<string, string> = {
  Usuario: "Já existe um usuário com este e-mail",
  Fabricante: "Já existe um fabricante com este nome",
  Fornecedor: "Já existe um fornecedor com este CNPJ",
  Pastilha: "Já existe uma pastilha com este código",
};

/** Erros conhecidos do Prisma que são culpa da requisição, não do servidor. */
function erroDoBanco(erro: Error): RespostaDeErro | null {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (erro.code) {
    case "P2002": {
      const modelo = typeof erro.meta?.modelName === "string" ? erro.meta.modelName : "";
      return {
        status: 409,
        erro: MENSAGENS_DE_DUPLICIDADE[modelo] ?? "Registro duplicado",
        codigo: "DUPLICADO",
      };
    }
    case "P2025":
      return { status: 404, erro: "Registro não encontrado", codigo: "NAO_ENCONTRADO" };
    case "P2003":
      return {
        status: 400,
        erro: "Referência inválida: o registro relacionado não existe",
        codigo: "REFERENCIA_INVALIDA",
      };
    default:
      return null;
  }
}

function responder(res: Response, resposta: RespostaDeErro) {
  const corpo: { erro: string; codigo?: string } = { erro: resposta.erro };
  if (resposta.codigo) corpo.codigo = resposta.codigo;
  return res.status(resposta.status).json(corpo);
}

export function tratarErros(erro: Error, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof AppError) {
    return responder(res, { status: erro.status, erro: erro.message, codigo: erro.codigo });
  }
  if (erro instanceof ZodError) {
    return res.status(400).json({
      erro: "Dados inválidos",
      codigo: "DADOS_INVALIDOS",
      campos: erro.issues.map((problema) => ({
        caminho: problema.path.map(String).join("."),
        mensagem: problema.message,
      })),
    });
  }
  const conhecido = erroDoBanco(erro) ?? erroDoCorpo(erro);
  if (conhecido) {
    return responder(res, conhecido);
  }
  console.error(erro);
  return res.status(500).json({ erro: "Erro interno no servidor" });
}
