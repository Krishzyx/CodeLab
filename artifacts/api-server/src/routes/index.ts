import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import problemsRouter from "./problems";
import submissionsRouter from "./submissions";
import contestsRouter from "./contests";
import leaderboardRouter from "./leaderboard";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(problemsRouter);
router.use(submissionsRouter);
router.use(contestsRouter);
router.use(leaderboardRouter);
router.use(statsRouter);

export default router;
