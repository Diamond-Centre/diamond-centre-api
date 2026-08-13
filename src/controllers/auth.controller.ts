import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { getClientIp, getUserAgent } from "../utils/requestMeta";

function sessionContext(req: Request) {
  return {
    userAgent: getUserAgent(req),
    ip: getClientIp(req),
  };
}

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body, sessionContext(req));
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body, sessionContext(req));
    res.json(result);
  };

  authGoogle = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.authGoogle(req.body, sessionContext(req));
    res.json(result);
  };

  authFacebook = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.authFacebook(req.body, sessionContext(req));
    res.json(result);
  };
}

export const authController = new AuthController();
