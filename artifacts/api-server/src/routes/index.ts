import { Router } from "express";
import auth from "./auth";
import users from "./users";
import dashboard from "./dashboard";
import health from "./health";
import risk from "./risk";
import campaigns from "./campaigns";
import phishing from "./phishing";
import training from "./training";

const router = Router();

router.use("/auth", auth);
router.use("/users", users);
router.use("/dashboard", dashboard);
router.use("/health", health);
router.use("/risk", risk);
router.use("/campaigns", campaigns);
router.use("/phishing", phishing);
router.use("/training", training);

export default router;