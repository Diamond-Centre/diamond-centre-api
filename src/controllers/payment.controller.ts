import { Request, Response } from "express";
import { paymentService } from "../services/payment.service";
import { parseIdParam } from "../utils/params";

export class PaymentController {
  initiate = async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.initiate(req.body);
    res.status(201).json(payment);
  };

  mtnCallback = async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.processMtnCallback(req.body);
    res.json(result);
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const status = await paymentService.getStatus(parseIdParam(req.params.id));
    res.json(status);
  };
}

export const paymentController = new PaymentController();
