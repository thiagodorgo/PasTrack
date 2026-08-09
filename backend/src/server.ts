import "dotenv/config";
import { app } from "./app";

const porta = Number(process.env.PORT ?? 3333);

app.listen(porta, () => {
  console.log(`API do PasTrack rodando em http://localhost:${porta}`);
});
