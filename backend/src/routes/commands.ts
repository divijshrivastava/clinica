import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { commandBus } from "../event-sourcing/command-bus";
import { Command } from "../event-sourcing/types";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = Router();

// All command endpoints require authentication
router.use(authenticate);

/**
 * POST /commands/:commandType
 *
 * Execute a command
 */
router.post(
  "/:commandType",
  asyncHandler(async (req: Request, res: Response) => {
    const { commandType } = req.params;
    const body = req.body;

    // Build command from request
    const command: Command = {
      command_id: body.command_id || uuidv4(),
      command_type: commandType,
      aggregate_id: body.aggregate_id,
      aggregate_type: body.aggregate_type || inferAggregateType(commandType),
      expected_version: body.expected_version,
      idempotency_key: body.idempotency_key,
      payload: body.payload || body,
      metadata: {
        ...body.metadata,
        user_id: body.metadata?.user_id || req.get("X-User-ID"),
        hospital_id: body.metadata?.hospital_id || req.get("X-Hospital-ID"),
        client_ip: req.ip,
        user_agent: req.get("user-agent"),
        device_id: body.metadata?.device_id || req.get("X-Device-ID"),
      },
    };

    logger.debug("Received command", {
      command_type: commandType,
      command_id: command.command_id,
      has_idempotency_key: !!command.idempotency_key,
    });

    // Handle command via command bus
    const result = await commandBus.handle(command);

    // Return 202 Accepted
    res.status(202).json({
      command_id: result.command_id,
      aggregate_id: result.aggregate_id,
      aggregate_type: result.aggregate_type,
      aggregate_version: result.aggregate_version,
      events: result.events.map((e) => ({
        event_id: e.event_id,
        event_type: e.event_type,
        event_schema_version: e.event_schema_version,
        event_number: e.event_number,
        event_timestamp: e.event_timestamp,
      })),
      status: result.status,
      processed_at: result.processed_at,
    });
  })
);

/**
 * Infer aggregate type from command type
 */
function inferAggregateType(commandType: string): string {
  // Extract prefix from command-type
  // e.g., "register-patient" -> "patient"
  //       "schedule-visit" -> "visit"

  if (commandType.includes("patient")) return "patient";
  if (commandType.includes("visit")) return "visit";
  if (commandType.includes("appointment")) return "appointment";
  if (commandType.includes("prescription")) return "prescription";
  if (commandType.includes("note")) return "medical_note";
  if (commandType.includes("document")) return "document";
  if (commandType.includes("whatsapp")) return "whatsapp_message";
  if (commandType.includes("user")) return "user";
  if (commandType.includes("hospital")) return "hospital";

  throw new Error(`Cannot infer aggregate type from command: ${commandType}`);
}

export default router;
