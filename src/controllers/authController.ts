import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import clerkClient from "../config/clerkConfig";
import { AppError } from "../middlewares/error";
import { User } from "../models/User";
import { generateToken } from "../utils/jwt";
import logger from "../utils/logger";

export class AuthController {
  // User Registration
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    logger.info("POST /api/v1/auth/register", {
      email: req.body.email,
      role: req.body.role,
    });

    const { email, password, role } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create Clerk user first
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [email],
          password: password,
        });
      } catch (clerkError: any) {
        // Handle Clerk-specific errors
        if (clerkError.status === 422) {
          logger.warn("Invalid input for Clerk registration", {
            error: clerkError,
          });

          next(
            new AppError("Invalid registration details", clerkError.errors, 422)
          );
        }
        throw clerkError; // Re-throw other clerk errors to be caught by outer catch
      }

      // If Clerk user created successfully, create local user
      try {
        const user = new User({
          email,
          password: hashedPassword,
          role,
          clerkId: clerkUser.id,
        });
        await user.save();
      } catch (dbError: any) {
        // If local user creation fails, cleanup Clerk user
        await clerkClient.users.deleteUser(clerkUser.id);

        if (dbError.code === 11000) {
          // MongoDB duplicate key error
          logger.warn("Email already registered", { email });
          next(new AppError("Email already registered", null, 409));
        }
        throw dbError; // Re-throw other DB errors
      }

      logger.info("User registered successfully");
      res.status(201).json({
        trace_id: req.headers["x-trace-id"],
        message: "User registered successfully",
        success: true,
        data: {
          email,
          role,
        },
      });
    } catch (error) {
      logger.error("Error registering user", { error });
      next(
        new AppError(
          "An unexpected error occurred during registration",
          null,
          500
        )
      );
    }
  }

  // User Login
  static async login(req: Request, res: Response, next: NextFunction) {
    logger.info("POST /api/v1/auth/login", { email: req.body.email });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      const isPasswordValid = await bcrypt.compare(
        password,
        user?.password as string
      );

      if (!user || !isPasswordValid) {
        logger.warn("Invalid login attempt", { email });

        res.status(401).json({
          trace_id: req.headers["x-trace-id"],
          message: "Invalid credentials",
        });
        return;
      }

      const token = generateToken(user.id, user.role);
      console.log("token", token);
      logger.info("User logged in successfully", { email });

      // Set the token in a cookie
      res
        .cookie(process.env.COOKIE_NAME as string, token, {
          httpOnly: true, // Helps prevent XSS attacks
          secure: process.env.NODE_ENV === "production", // Use secure cookies in production
          sameSite: "strict", // Helps prevent CSRF attacks
          maxAge: parseInt(process.env.COOKIE_MAX_AGE as string), // 7 days
        })
        .json({
          success: true,
          trace_id: req.headers["x-trace-id"],
          message: "Authentication successful",
          data: {
            email: user.email,
            role: user.role,
          },
        });
    } catch (error) {
      logger.error("Error during login", { error });
      next(
        new AppError("An unexpected error occurred during login", null, 500)
      );
    }
  }

  // Password Reset
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    logger.info("POST /api/v1/auth/reset-password", { email: req.body.email });

    const { email, newPassword, oldPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Password reset attempted for non-existent user", { email });
      next(new AppError("User not found", null, 404));
    } else {
      try {
        const isPasswordValid = await bcrypt.compare(
          oldPassword,
          user?.password as string
        );
        if (!isPasswordValid) {
          res.status(401).json({
            trace_id: req.headers["x-trace-id"],
            message: "Invalid credentials",
          });
          return;
        }
        // Update password in MongoDB
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Update password in Clerk
        try {
          await clerkClient.users.updateUser(user.clerkId, {
            password: newPassword,
          });
        } catch (clerkError: any) {
          logger.error("Failed to update password in Clerk", {
            error: clerkError,
          });
          next(
            new AppError(
              "Failed to update external auth provider",
              clerkError.errors,
              500
            )
          );
          return;
        }

        logger.info("Password reset successful", { email });
        res.json({
          success: true,
          trace_id: req.headers["x-trace-id"],
          message: "Password reset successful",
        });
      } catch (error) {
        logger.error("Error during password reset", { error });
        next(
          new AppError("An error occurred during password reset", null, 500)
        );
      }
    }
  }
}
