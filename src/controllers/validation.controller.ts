import { Response } from "express";
import { validationService } from "../services/validation.service";
import { AuthRequest } from "../middleware/auth";

export class ValidationController {
  scan = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await validationService.scan(req.body);
    res.json(result);
  };
}

export const validationController = new ValidationController();
