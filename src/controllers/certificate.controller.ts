import { Response } from "express";
import { certificateService } from "../services/certificate.service";
import { AuthRequest } from "../middleware/auth";
import { parseIdParam } from "../utils/params";
import { renderCertificateHtml } from "../templates/certificateHtml";
import { renderCertificatePdf } from "../templates/certificatePdf";

export class CertificateController {
  listEligible = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = parseIdParam(req.query.event_id as string);
    const result = await certificateService.listEligible(eventId);
    res.json(result);
  };

  issue = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await certificateService.issue(req.body, req.user!.id);
    res.status(201).json(result);
  };

  listByEvent = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventId = parseIdParam(req.query.event_id as string);
    const certificates = await certificateService.listByEvent(eventId);
    res.json(certificates);
  };

  listMine = async (req: AuthRequest, res: Response): Promise<void> => {
    const certificates = await certificateService.listMine(req.user!.email);
    res.json(certificates);
  };

  getByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const isAdmin = req.user?.role === "admin";
    const certificate = await certificateService.getByCode(
      code,
      req.user?.email,
      isAdmin
    );
    res.json(certificate);
  };

  getMineByCode = async (req: AuthRequest, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const certificate = await certificateService.getMineByCode(
      code,
      req.user!.email
    );
    res.json(certificate);
  };

  renderHtml = async (req: AuthRequest, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const isAdmin = req.user?.role === "admin";
    const certificate =
      isAdmin || !req.user
        ? await certificateService.getByCode(code)
        : await certificateService.getMineByCode(code, req.user.email);

    const html = renderCertificateHtml(certificate);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  };

  downloadPdf = async (req: AuthRequest, res: Response): Promise<void> => {
    const code = String(req.params.code);
    const isAdmin = req.user?.role === "admin";
    const certificate =
      isAdmin || !req.user
        ? await certificateService.getByCode(code)
        : await certificateService.getMineByCode(code, req.user.email);

    const pdfBytes = await renderCertificatePdf(certificate);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificat-${certificate.code}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  };
}

export const certificateController = new CertificateController();
