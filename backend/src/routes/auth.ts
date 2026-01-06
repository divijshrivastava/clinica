import { Router, Request, Response } from 'express';
import { generateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

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
