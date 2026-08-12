import { Response } from "express";
import { paymentService } from "../services/payment.service";
import { parseIdParam } from "../utils/params";
import { AuthRequest } from "../middleware/auth";
import { UnauthorizedError } from "../errors/AppError";

export class PaymentController {
  initiate = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");
    const payment = await paymentService.initiate(req.body, req.user);
    res.status(201).json(payment);
  };

  mtnCallback = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await paymentService.processMtnCallback(req.body);
    res.json(result);
  };

  getStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");
    const status = await paymentService.getStatus(
      parseIdParam(req.params.id),
      req.user
    );
    res.json(status);
  };
}

export const paymentController = new PaymentController();
