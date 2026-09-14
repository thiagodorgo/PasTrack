import "dotenv/config";
import { z } from "zod";

/** Trechos que indicam um valor copiado do exemplo e nunca trocado. */
const VALORES_DE_EXEMPLO = ["troque-esta-chave", "troque", "changeme", "exemplo"];

const esquemaEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z
      .string({ error: "é obrigatória" })
      .regex(/^postgres(ql)?:\/\//, "deve ser uma URL postgresql://"),
    JWT_SECRET: z
      .string({ error: "é obrigatório" })
      .min(32, "precisa ter pelo menos 32 caracteres")
      .refine(
        (valor) => !VALORES_DE_EXEMPLO.some((exemplo) => valor.toLowerCase().includes(exemplo)),
        "não pode usar o valor de exemplo"
      ),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, "use um formato como 8h, 30m ou 1d")
      .default("8h"),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((lista) =>
        lista
          .split(",")
          .map((origem) => origem.trim())
          .filter(Boolean)
      ),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    BCRYPT_CUSTO: z.coerce.number().int().min(4).max(15).default(12),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    /** Falhas de login permitidas por IP e e-mail dentro da janela. */
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).max(1000).default(5),
    /** Janela do limite de login, em minutos. */
    RATE_LIMIT_LOGIN_JANELA_MIN: z.coerce.number().int().min(1).max(1440).default(15),
    /** Requisições por minuto permitidas por IP em /api. */
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).max(1_000_000).default(300),
  })
  .superRefine((valores, contexto) => {
    if (valores.NODE_ENV === "production" && valores.BCRYPT_CUSTO < 12) {
      contexto.addIssue({
        code: "custom",
        path: ["BCRYPT_CUSTO"],
        message: "precisa ser 12 ou mais em produção",
      });
    }
  });

export type Env = z.infer<typeof esquemaEnv>;

export class ErroDeConfiguracao extends Error {}

/** Valida as variáveis de ambiente e devolve a configuração tipada. Lança ErroDeConfiguracao listando o que corrigir. */
export function carregarEnv(fonte: NodeJS.ProcessEnv): Env {
  const resultado = esquemaEnv.safeParse(fonte);
  if (!resultado.success) {
    const linhas = resultado.error.issues.map(
      (problema) => `  - ${problema.path.map(String).join(".") || "(configuração)"}: ${problema.message}`
    );
    throw new ErroDeConfiguracao(
      `Configuração inválida. Corrija as variáveis de ambiente:\n${linhas.join("\n")}`
    );
  }
  return resultado.data;
}

function iniciar(): Env {
  try {
    return carregarEnv(process.env);
  } catch (erro) {
    if (erro instanceof ErroDeConfiguracao) {
      console.error(erro.message);
      process.exit(1);
    }
    throw erro;
  }
}

export const env = iniciar();
