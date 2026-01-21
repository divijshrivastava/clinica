import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { db } from '../database/pool';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * DEBUG: Check user in database
 */
router.get(
  '/check-user/:email',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;

    // Query user
    const result = await db.query(
      `SELECT id as user_id, hospital_id, email, password_hash, full_name, role, is_active
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({
        found: false,
        email,
      });
    }

    const user = result.rows[0];

    // Test password
    const testPassword = 'password123';
    const passwordValid = await bcrypt.compare(testPassword, user.password_hash);

    res.json({
      found: true,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      password_hash_preview: user.password_hash.substring(0, 20) + '...',
      password_test: {
        testing: testPassword,
        valid: passwordValid,
      },
    });
  })
);

export default router;
