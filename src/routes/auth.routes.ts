import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authRateLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/security";
import {
  loginSchema,
  registerSchema,
  socialAuthSchema,
} from "../validation/schemas";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register)
);
router.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login)
);
router.post(
  "/google",
  authRateLimiter,
  validateBody(socialAuthSchema),
  asyncHandler(authController.authGoogle)
);
router.post(
  "/facebook",
  authRateLimiter,
  validateBody(socialAuthSchema),
  asyncHandler(authController.authFacebook)
);

export default router;
