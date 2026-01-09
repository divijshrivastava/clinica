import { Router, Request, Response } from 'express';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { db } from '../database/pool';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * POST /auth/login
 *
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email and password are required',
        },
      });
    }

    // Query user from projection
    const result = await db.query(
      `SELECT id as user_id, hospital_id, email, password_hash, full_name, role, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'This account has been deactivated',
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Generate JWT token
    const token = generateToken({
      user_id: user.user_id,
      hospital_id: user.hospital_id,
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: {
        user_id: user.user_id,
        hospital_id: user.hospital_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  })
);

/**
 * POST /auth/generate-test-token
 *
 * Generate a test JWT token for development/testing
 * NOTE: This endpoint should be disabled in production!
 */
router.post(
  '/generate-test-token',
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id, hospital_id, role, email } = req.body;

    if (!user_id || !hospital_id || !role || !email) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'user_id, hospital_id, role, and email are required',
        },
      });
    }

    const token = generateToken({
      user_id,
      hospital_id,
      role,
      email,
    });

    res.json({ token });
  })
);

export default router;
