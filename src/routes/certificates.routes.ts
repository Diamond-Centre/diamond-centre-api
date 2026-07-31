import { Router } from "express";
import { certificateController } from "../controllers/certificate.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Admin
router.get(
  "/eligible",
  authenticate,
  requireAdmin,
  asyncHandler(certificateController.listEligible)
);
router.post(
  "/issue",
  authenticate,
  requireAdmin,
  asyncHandler(certificateController.issue)
);
router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(certificateController.listByEvent)
);

// Authenticated user
router.get(
  "/me",
  authenticate,
  asyncHandler(certificateController.listMine)
);
router.get(
  "/me/:code",
  authenticate,
  asyncHandler(certificateController.getMineByCode)
);
router.get(
  "/me/:code/html",
  authenticate,
  asyncHandler(certificateController.renderHtml)
);
router.get(
  "/me/:code/pdf",
  authenticate,
  asyncHandler(certificateController.downloadPdf)
);

// Public verify + HTML/PDF template render
router.get("/:code", asyncHandler(certificateController.getByCode));
router.get("/:code/html", asyncHandler(certificateController.renderHtml));
router.get("/:code/pdf", asyncHandler(certificateController.downloadPdf));

export default router;
