import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { userService } from "../services/user.service";
import { sessionService } from "../services/session.service";
import { dashboardService } from "../services/dashboard.service";
import { parseIdParam } from "../utils/params";
import { UnauthorizedError } from "../errors/AppError";

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

  getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const user = await userService.getById(req.user.id);
    res.json(user);
  };

  updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const user = await userService.updateMe(req.user.id, req.body);
    res.json(user);
  };

  changeMyPassword = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const result = await userService.changeMyPassword(
      req.user.id,
      req.body,
      req.user.sid
    );
    res.json(result);
  };

  listMySessions = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const sessions = await sessionService.listMine(req.user.id, req.user.sid);
    res.json({ sessions });
  };

  revokeOtherSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const result = await sessionService.revokeOthers(req.user.id, req.user.sid);
    res.json(result);
  };

  deleteMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const result = await userService.deleteMe(req.user.id);
    res.json(result);
  };

  createAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await userService.createAdmin(req.body);
    res.status(201).json(user);
  };

  updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    const user = await userService.updateClient(id, req.body);
    res.json(user);
  };

  updateAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    const user = await userService.updateAdmin(id, req.body);
    res.json(user);
  };

  deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    const result = await userService.deleteClient(id);
    res.json(result);
  };

  deleteAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id);
    if (!req.user?.id) {
      throw new UnauthorizedError("Unauthorized");
    }
    const result = await userService.deleteAdmin(id, req.user.id);
    res.json(result);
  };
}

export const userController = new UserController();
