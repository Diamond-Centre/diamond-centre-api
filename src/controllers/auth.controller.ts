import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);
    res.json(result);
  };

  authGoogle = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.authGoogle(req.body);
    res.json(result);
  };

  authFacebook = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.authFacebook(req.body);
    res.json(result);
  };
}

export const authController = new AuthController();
