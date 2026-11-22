import { Request, Response } from "express";
import { painelService } from "../services/painel.service";

/** Painel inicial do sistema. */
export const painelController = {
  /** GET /api/painel/resumo: totais, itens críticos e últimas movimentações. */
  async resumo(_req: Request, res: Response) {
    return res.json(await painelService.resumo());
  },
};
