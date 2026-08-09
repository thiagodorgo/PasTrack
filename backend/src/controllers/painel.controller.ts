import { Request, Response } from "express";
import { painelService } from "../services/painel.service";

export const painelController = {
  async resumo(_req: Request, res: Response) {
    return res.json(await painelService.resumo());
  },
};
