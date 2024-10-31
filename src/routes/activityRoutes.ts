import { Router } from "express";
import { ActivityController } from "../controllers/ActivityController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/request-validator";
import {
  activityAttendanceUpdateSchema,
  activityUpdateZodSchema,
  activityZodSchema,
} from "../schemas/activitySchema";
import { mongodbIdSchema } from "../schemas/mongodbIdSchema";

const router = Router();

// router.use("/", activityService);

router.post(
  "/",
  authenticate,
  authorize(["admin"]),
  validateRequest(activityZodSchema),
  ActivityController.createActivity
);

router.get(
  "/",
  authenticate,
  authorize(["admin"]),
  ActivityController.getActivities
);

router.patch(
  "/:id",
  authenticate,
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  validateRequest(activityUpdateZodSchema),
  ActivityController.updateActivity
);

router.delete(
  "/:id",
  authenticate,
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  ActivityController.deleteActivity
);

router.post(
  "/:id/attendance",
  authenticate,
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  validateRequest(activityAttendanceUpdateSchema),
  ActivityController.trackAttendance
);

router.get(
  "/report",
  authenticate,
  authorize(["admin"]),
  ActivityController.generateReport
);

router.get(
  "/:id",
  authenticate,
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  ActivityController.getActivityById
);

export default router;
