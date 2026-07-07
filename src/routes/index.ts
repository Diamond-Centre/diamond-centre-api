import { Router } from "express";
import authRoutes from "./auth.routes";
import eventsRoutes from "./events.routes";
import ticketsRoutes from "./tickets.routes";
import paymentsRoutes from "./payments.routes";
import validationRoutes from "./validation.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/events", eventsRoutes);
router.use("/tickets", ticketsRoutes);
router.use("/payments", paymentsRoutes);
router.use("/validation", validationRoutes);

export default router;
