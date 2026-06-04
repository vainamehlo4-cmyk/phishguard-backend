import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import phishingRouter from "./phishing";
import trainingRouter from "./training";
import riskRouter from "./risk";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/phishing", phishingRouter);
router.use("/training", trainingRouter);
router.use("/risk", riskRouter);
router.use("/dashboard", dashboardRouter);
router.use("/campaigns", campaignsRouter);

export default router;
