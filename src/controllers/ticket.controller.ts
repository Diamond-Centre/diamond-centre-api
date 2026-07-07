import { Request, Response } from "express";
import { ticketService } from "../services/ticket.service";
import { parseIdParam } from "../utils/params";

export class TicketController {
  reserve = async (req: Request, res: Response): Promise<void> => {
    const ticket = await ticketService.reserve(req.body);
    res.status(201).json(ticket);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ticket = await ticketService.getById(parseIdParam(req.params.id));
    res.json(ticket);
  };
}

export const ticketController = new TicketController();
