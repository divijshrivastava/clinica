import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  user_id: string;
  hospital_id: string;
  role: "admin" | "doctor" | "nurse" | "receptionist";
  email?: string;
}

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication Middleware
 *
 * Verifies JWT token and attaches user info to request
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    const authHeader = req.get("Authorization");

    if (!authHeader) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authorization header is required",
        },
      });
      return;
    }

    // Check Bearer format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({
        error: {
          code: "INVALID_TOKEN_FORMAT",
          message: "Authorization header must be in format: Bearer <token>",
        },
      });
      return;
    }

    const token = parts[1];

    // Verify token
    try {
      const payload = jwt.verify(
        token,
        config.security.jwtSecret
      ) as JWTPayload;

      // Attach user info to request
      req.user = payload;

      // Also set X-User-ID and X-Hospital-ID headers for compatibility
      req.headers["x-user-id"] = payload.user_id;
      req.headers["x-hospital-id"] = payload.hospital_id;

      logger.debug("User authenticated", {
        user_id: payload.user_id,
        hospital_id: payload.hospital_id,
        role: payload.role,
      });

      next();
    } catch (jwtError: any) {
      if (jwtError.name === "TokenExpiredError") {
        res.status(401).json({
          error: {
            code: "TOKEN_EXPIRED",
            message: "JWT token has expired",
          },
        });
        return;
      }

      if (jwtError.name === "JsonWebTokenError") {
        res.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "JWT token is invalid",
          },
        });
        return;
      }

      throw jwtError;
    }
  } catch (error: any) {
    logger.error("Authentication error", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication",
      },
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Tries to authenticate but doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Token provided, try to authenticate
  authenticate(req, res, next);
}

/**
 * Role-based Authorization Middleware
 *
 * Ensures user has one of the required roles
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "User must be authenticated",
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `User role '${req.user.role}' is not authorized to access this resource`,
          required_roles: allowedRoles,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Generate JWT Token
 *
 * Helper function for generating JWT tokens (useful for testing)
 */
export function generateToken(payload: JWTPayload): string {
  const secret = config.security.jwtSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, secret, {
    expiresIn: config.security.jwtExpiresIn,
  } as jwt.SignOptions);
}
