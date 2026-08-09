import { Request, Response } from "express";
import { alertaService } from "../services/alerta.service";

export const alertaController = {
  async listar(_req: Request, res: Response) {
    return res.json(await alertaService.listarAbertos());
  },

  async resolver(req: Request, res: Response) {
    return res.json(await alertaService.resolver(Number(req.params.id)));
  },
};
