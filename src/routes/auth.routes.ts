import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";

import { logRequest } from "../middlewares/logRequest.middleware";
import { resetPasswordZodSchema, userZodSchema } from "../schemas/user.schema";

const router = Router();

router.post(
  "/register",
  logRequest({ fields: ["email", "role"] }),
  validateRequest(userZodSchema),
  AuthController.register
);
router.post(
  "/login",
  logRequest({ fields: ["email"] }),
  validateRequest(userZodSchema),
  AuthController.login
);
router.patch(
  "/reset-password",
  authenticate,
  logRequest({ fields: ["email"] }),
  validateRequest(resetPasswordZodSchema),
  AuthController.resetPassword
);

router.post("/logout", authenticate, AuthController.logout);

export default router;
