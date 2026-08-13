import { Response } from "express";
import { ticketService } from "../services/ticket.service";
import { parseIdParam } from "../utils/params";
import { AuthRequest } from "../middleware/auth";
import { UnauthorizedError } from "../errors/AppError";

export class TicketController {
  list = async (_req: AuthRequest, res: Response): Promise<void> => {
    const tickets = await ticketService.list();
    res.json(tickets);
  };

  reserve = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await ticketService.reserve(req.body);
    res.status(201).json(ticket);
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");
    const ticket = await ticketService.getById(
      parseIdParam(req.params.id),
      req.user
    );
    res.json(ticket);
  };

  remove = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");
    const result = await ticketService.remove(
      parseIdParam(req.params.id),
      req.user
    );
    res.json(result);
  };
}

export const ticketController = new TicketController();
