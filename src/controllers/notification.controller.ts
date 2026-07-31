import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { notificationService } from "../services/notification.service";
import { BadRequestError } from "../errors/AppError";

export class NotificationController {
  list = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const rows = await notificationService.list(user.id);
    res.json(rows);
  };

  unreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const result = await notificationService.unreadCount(user.id);
    res.json(result);
  };

  sync = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const rows = await notificationService.syncForUser(user.id, user.email);
    res.json(rows);
  };

  markRead = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      throw new BadRequestError("Invalid notification id");
    }
    const row = await notificationService.markRead(user.id, id);
    res.json(row);
  };

  markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const result = await notificationService.markAllRead(user.id);
    res.json(result);
  };
}

export const notificationController = new NotificationController();
