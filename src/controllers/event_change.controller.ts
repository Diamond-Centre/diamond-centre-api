import { Response } from "express";
import { eventChangeService } from "../services/event_change.service";
import { AuthRequest } from "../middleware/auth";
import { parseIdParam } from "../utils/params";

export class EventChangeController {
  getChange = async (req: AuthRequest, res: Response): Promise<void> => {
    const changeId = parseIdParam(req.params.changeId);
    const email = req.user!.email;
    const change = await eventChangeService.getChange(changeId, email);
    res.json(change);
  };

  accept = async (req: AuthRequest, res: Response): Promise<void> => {
    const changeId = parseIdParam(req.params.changeId);
    const ticketId = parseIdParam(req.body.ticket_id);
    const result = await eventChangeService.accept(
      changeId,
      ticketId,
      req.user!.email
    );
    res.json(result);
  };

  alternatives = async (req: AuthRequest, res: Response): Promise<void> => {
    const changeId = parseIdParam(req.params.changeId);
    const ticketId = parseIdParam(req.query.ticket_id as string);
    const filter = (req.query.filter as string) ?? "all";
    const allowed = ["all", "category", "date", "price"];
    const safeFilter = allowed.includes(filter)
      ? (filter as "all" | "category" | "date" | "price")
      : "all";
    const result = await eventChangeService.getAlternatives(
      changeId,
      ticketId,
      req.user!.email,
      safeFilter
    );
    res.json(result);
  };

  swap = async (req: AuthRequest, res: Response): Promise<void> => {
    const changeId = parseIdParam(req.params.changeId);
    const ticketId = parseIdParam(req.body.ticket_id);
    const alternativeEventId = parseIdParam(req.body.alternative_event_id);
    const result = await eventChangeService.swap(
      changeId,
      ticketId,
      alternativeEventId,
      req.user!.email
    );
    res.json(result);
  };

  refund = async (req: AuthRequest, res: Response): Promise<void> => {
    const changeId = parseIdParam(req.params.changeId);
    const ticketId = parseIdParam(req.body.ticket_id);
    const result = await eventChangeService.refund(
      changeId,
      ticketId,
      req.user!.email
    );
    res.json(result);
  };
}

export const eventChangeController = new EventChangeController();
