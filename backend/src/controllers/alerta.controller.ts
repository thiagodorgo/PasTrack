import { Request, Response } from "express";
import { ConsultaAlertas, ParametroAlerta } from "../schemas/alerta.schema";
import { alertaService } from "../services/alerta.service";

/** Alertas de reposição. Query e params chegam validados e convertidos pela rota. */
export const alertaController = {
  /** GET /api/alertas: lista os alertas da situação pedida, com ou sem página. */
  async listar(req: Request, res: Response) {
    const consulta = req.query as unknown as ConsultaAlertas;
    return res.json(await alertaService.listar(consulta));
  },

  /** PATCH /api/alertas/:id/resolver: resolve o alerta e grava o usuário logado como quem resolveu. */
  async resolver(req: Request, res: Response) {
    const { id } = req.params as unknown as ParametroAlerta;
    return res.json(await alertaService.resolver(id, req.usuario!.id));
  },
};
