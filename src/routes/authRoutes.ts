import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/request-validator";

import { resetPasswordZodSchema, userZodSchema } from "../schemas/userSchema";
import { logRequest } from "../utils/log-request";

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
