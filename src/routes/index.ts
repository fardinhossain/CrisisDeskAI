import { Router } from "express";
import { healthRouter } from "./health.routes";
import { reportRouter } from "./report.routes";
import { authRouter } from "./auth.routes";

/** Root API router — mounts all feature routers under /api. */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/reports", reportRouter);

export default apiRouter;
