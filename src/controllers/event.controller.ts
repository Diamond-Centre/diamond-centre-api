import { Response } from "express";
import { eventService } from "../services/event.service";
import { AuthRequest } from "../middleware/auth";
import { parseIdParam } from "../utils/params";

export class EventController {
  list = async (_req: AuthRequest, res: Response): Promise<void> => {
    const events = await eventService.listPublished();
    res.json(events);
  };

  listAll = async (_req: AuthRequest, res: Response): Promise<void> => {
    const events = await eventService.listAll();
    res.json(events);
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const event = await eventService.getById(parseIdParam(req.params.id));
    res.json(event);
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const event = await eventService.create(req.body);
    res.status(201).json(event);
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    const event = await eventService.update(
      parseIdParam(req.params.id),
      req.body,
      req.user?.id ?? null
    );
    res.json(event);
  };

  remove = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await eventService.remove(parseIdParam(req.params.id));
    res.json(result);
  };
}

export const eventController = new EventController();
