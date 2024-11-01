import { NextFunction, Request, Response } from "express";
import { envConfig } from "../config/environment";
import { verifyToken } from "../utils/jwt";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies[envConfig.COOKIE_NAME as string];
  if (!token) {
    res.status(401).json({
      success: false,
      traceId: req.headers["x-trace-id"],
      message: "Authentication failed - No token provided",
    });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(403).json({
      success: false,
      traceId: req.headers["x-trace-id"],
      message: "Authentication failed - Invalid or expired token",
    });
    return;
  }

  // Extend Request type to include user property
  (req as any).user = decoded;
  next();
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({
        success: false,
        traceId: req.headers["x-trace-id"],
        message: `Access denied - User role '${
          (req as any).user.role
        }' is not authorized for this action`,
      });
      return;
    }
    next();
  };
};

export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        traceId: req.headers["x-trace-id"],
        message: "Authentication failed - User role not found in token",
      });
    }

    if (userRole !== requiredRole) {
      return res.status(403).json({
        success: false,
        traceId: req.headers["x-trace-id"],
        message: `Access denied - This action requires '${requiredRole}' role, but user has '${userRole}' role`,
      });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireUser = requireRole("user");
