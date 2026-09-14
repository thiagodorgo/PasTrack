import { Request, Response } from "express";
import { ConsultaAlertas } from "../schemas/alerta.schema";
import { idParam } from "../schemas/comum.schema";
import { alertaService } from "../services/alerta.service";

// query e params chegam validados e convertidos pela rota
export const alertaController = {
  async listar(req: Request, res: Response) {
    const { situacao } = req.query as unknown as ConsultaAlertas;
    return res.json(await alertaService.listar(situacao));
  },

  async resolver(req: Request, res: Response) {
    const { id } = req.params as unknown as ReturnType<typeof idParam.parse>;
    return res.json(await alertaService.resolver(id, req.usuario!.id));
  },
};
