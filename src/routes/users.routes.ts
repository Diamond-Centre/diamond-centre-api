import { Router } from "express";
import { userController } from "../controllers/user.controller";
import {
  authenticate,
  requireAdmin,
  requireSuperAdmin,
} from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", asyncHandler(userController.list));
router.get("/stats", asyncHandler(userController.stats));
router.get("/dashboard", asyncHandler(userController.dashboard));
router.get("/analytics", asyncHandler(userController.analytics));

// Only super_admin may create / delete admins
router.post(
  "/admins",
  requireSuperAdmin,
  asyncHandler(userController.createAdmin)
);
router.put(
  "/admins/:id",
  requireSuperAdmin,
  asyncHandler(userController.updateAdmin)
);
router.delete(
  "/admins/:id",
  requireSuperAdmin,
  asyncHandler(userController.deleteAdmin)
);

router.put("/clients/:id", asyncHandler(userController.updateClient));
router.delete("/clients/:id", asyncHandler(userController.deleteClient));

export default router;
