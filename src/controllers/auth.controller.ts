import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import clerkClient from "../config/clerk";
import { envConfig } from "../config/environment";
import { AppError } from "../middlewares/error.middleware";
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
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("Email already registered", { email });
      next(new AppError("Email already registered", null, 409));
      return;
    }

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
            new AppError(
              "Email or password is invalid. Please check your registration details and try again.",
              clerkError.errors,
              422
            )
          );
        }
        return;
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
        return;
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

    if (!email || !password) {
      logger.warn("Missing required fields");
      return next(new AppError("Email and password are required", null, 400));
    }

    try {
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        logger.warn("Invalid login attempt - user not found", { email });
        return next(new AppError("Invalid credentials", null, 401));
      }

      if (!user.password) {
        logger.error("User found but password is missing", { email });
        return next(new AppError("Invalid user data", null, 500));
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        logger.warn("Invalid login attempt - incorrect password", { email });
        return next(new AppError("Invalid credentials", null, 401));
      }

      const token = generateToken(user.id, user.role);

      logger.info("User logged in successfully", { email });

      // Set the token in a cookie
      res
        .cookie(envConfig.COOKIE_NAME, token, {
          httpOnly: true,
          secure: envConfig.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: envConfig.COOKIE_MAX_AGE,
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
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn("Password reset attempted for non-existent user", { email });
      next(new AppError("User not found", null, 404));
    } else {
      try {
        const isPasswordValid = await bcrypt.compare(
          oldPassword,
          user.password
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

  // Logout
  static async logout(req: Request, res: Response, next: NextFunction) {
    res.clearCookie(envConfig.COOKIE_NAME).json({
      success: true,
      trace_id: req.headers["x-trace-id"],
      message: "Logged out successfully",
    });
  }
}
