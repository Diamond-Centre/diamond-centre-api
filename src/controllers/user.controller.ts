import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { userService } from "../services/user.service";
import { dashboardService } from "../services/dashboard.service";

export class UserController {
  list = async (_req: AuthRequest, res: Response): Promise<void> => {
    const users = await userService.list();
    res.json(users);
  };

  stats = async (_req: AuthRequest, res: Response): Promise<void> => {
    const stats = await userService.stats();
    res.json(stats);
  };

  dashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
    const stats = await dashboardService.adminStats();
    res.json(stats);
  };

  analytics = async (_req: AuthRequest, res: Response): Promise<void> => {
    const stats = await dashboardService.analytics();
    res.json(stats);
  };

  createAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await userService.createAdmin(req.body);
    res.status(201).json(user);
  };
}

export const userController = new UserController();
