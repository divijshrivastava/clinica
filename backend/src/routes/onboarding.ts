import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { commandBus } from '../event-sourcing/command-bus';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /onboarding/register-hospital
 *
 * Register a new hospital/organization and create admin user
 */
router.post(
  '/register-hospital',
  asyncHandler(async (req: Request, res: Response) => {
    const { admin_user, ...hospitalData } = req.body;

    // Step 1: Register the hospital
    const hospital_command_id = uuidv4();
    const hospital_idempotency_key = `register-hospital-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Prepare hospital payload - use admin_user email if not provided
    const hospitalPayload = {
      ...hospitalData,
      email: hospitalData.email || admin_user?.email,
      subscription_tier: hospitalData.subscription_tier || 'starter',
    };

    const hospitalResult = await commandBus.handle({
      command_id: hospital_command_id,
      idempotency_key: hospital_idempotency_key,
      command_type: 'register-hospital',
      aggregate_type: 'hospital',
      aggregate_id: undefined, // Will be generated
      payload: hospitalPayload,
      metadata: {
        client_ip: req.ip,
        user_agent: req.get('user-agent'),
      },
    });

    const hospital_id = hospitalResult.aggregate_id;

    // Step 2: Create admin user if provided
    let user_id;
    if (admin_user) {
      const user_command_id = uuidv4();
      const user_idempotency_key = `create-user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const userResult = await commandBus.handle({
        command_id: user_command_id,
        idempotency_key: user_idempotency_key,
        command_type: 'create-user',
        aggregate_type: 'user',
        aggregate_id: undefined,
        payload: {
          hospital_id,
          email: admin_user.email,
          password: admin_user.password,
          full_name: admin_user.full_name,
          role: admin_user.role || 'admin',
          phone: admin_user.phone,
          registration_number: admin_user.registration_number,
          specialization: admin_user.specialization,
          department: admin_user.department,
        },
        metadata: {
          client_ip: req.ip,
          user_agent: req.get('user-agent'),
        },
      });

      user_id = userResult.aggregate_id;
    }

    res.status(201).json({
      hospital_id,
      user_id,
      command_id: hospital_command_id,
    });
  })
);

/**
 * POST /onboarding/create-user
 *
 * Create a new user account (for onboarding)
 */
router.post(
  '/create-user',
  asyncHandler(async (req: Request, res: Response) => {
    const command_id = uuidv4();
    const idempotency_key = `create-user-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const result = await commandBus.handle({
      command_id,
      idempotency_key,
      command_type: 'create-user',
      aggregate_type: 'user',
      aggregate_id: undefined, // Will be generated
      payload: req.body,
      metadata: {
        user_id: req.body.invited_by || null,
        client_ip: req.ip,
        user_agent: req.get('user-agent'),
      },
    });

    res.status(201).json({
      user_id: result.aggregate_id,
      command_id: result.command_id,
    });
  })
);

export default router;

