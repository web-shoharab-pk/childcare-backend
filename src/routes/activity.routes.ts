import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  activityAttendanceUpdateSchema,
  activityUpdateZodSchema,
  activityZodSchema,
} from "../schemas/activity.schema";
import { mongodbIdSchema } from "../schemas/mongodbId.schema";

const router = Router();

// router.use("/", activityService);
// All routes require authentication
router.use(authenticate);

router.post(
  "/",
  authorize(["admin"]),
  validateRequest(activityZodSchema),
  ActivityController.createActivity
);

router.get("/", authorize(["admin"]), ActivityController.getActivities);

router.patch(
  "/:id",
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  validateRequest(activityUpdateZodSchema),
  ActivityController.updateActivity
);

router.delete(
  "/:id",
  authorize(["admin"]),
  validateRequest(mongodbIdSchema, true),
  ActivityController.deleteActivity
);

router.post(
  "/:id/attendance",
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
