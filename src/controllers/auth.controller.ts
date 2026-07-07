import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    res.json(result);
  };
}

export const authController = new AuthController();
