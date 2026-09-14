import { http } from "msw";
import { server } from "../mocks/server";

/** Espera a promessa falhar e devolve o erro; se ela der certo, o teste falha. */
export async function capturarErro(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error("a operação deveria ter falhado");
}

/** Guarda a URL de cada GET que casar com o caminho e deixa a resposta com os handlers padrão. */
export function capturarUrls(caminho: string): URL[] {
  const urls: URL[] = [];
  server.use(
    http.get(caminho, ({ request }) => {
      urls.push(new URL(request.url));
    })
  );
  return urls;
}

/** Guarda o corpo JSON de cada requisição que casar e deixa a resposta com os handlers padrão. */
export function capturarCorpos(metodo: "post" | "put" | "patch", caminho: string): unknown[] {
  const corpos: unknown[] = [];
  server.use(
    http[metodo](caminho, async ({ request }) => {
      corpos.push(await request.clone().json());
    })
  );
  return corpos;
}
