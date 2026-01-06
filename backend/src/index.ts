import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { logger } from "./utils/logger";
import { commandBus } from "./event-sourcing/command-bus";
import { db } from "./database/pool";

// Middleware
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "./middleware/error-handler";

// Routes
import authRouter from "./routes/auth";
import commandsRouter from "./routes/commands";
import healthRouter from "./routes/health";
import patientsRouter from "./routes/patients";
import visitsRouter from "./routes/visits";
import prescriptionsRouter from "./routes/prescriptions";
import appointmentsRouter from "./routes/appointments";
import medicalNotesRouter from "./routes/medical-notes";
import documentsRouter from "./routes/documents";
import templatesRouter from "./routes/templates";

// Command Handlers
import { registerPatientHandler } from "./commands/register-patient";
import { updatePatientContactHandler } from "./commands/update-patient-contact";
import { updatePatientDemographicsHandler } from "./commands/update-patient-demographics";
import { scheduleVisitHandler } from "./commands/schedule-visit";
import { completeVisitHandler } from "./commands/complete-visit";
import { createPrescriptionHandler } from "./commands/create-prescription";
import { signPrescriptionHandler } from "./commands/sign-prescription";
import { dispensePrescriptionHandler } from "./commands/dispense-prescription";
import { scheduleAppointmentHandler } from "./commands/schedule-appointment";
import { confirmAppointmentHandler } from "./commands/confirm-appointment";
import { cancelAppointmentHandler } from "./commands/cancel-appointment";
import { rescheduleAppointmentHandler } from "./commands/reschedule-appointment";
import { createMedicalNoteHandler } from "./commands/create-medical-note";
import { uploadDocumentHandler } from "./commands/upload-document";

// Projection Handlers
import { eventDispatcher } from "./projections/event-dispatcher";
import { patientProjectionHandler } from "./projections/handlers/patient-projection";
import { visitProjectionHandler } from "./projections/handlers/visit-projection";
import { prescriptionProjectionHandler } from "./projections/handlers/prescription-projection";
import { appointmentProjectionHandler } from "./projections/handlers/appointment-projection";
import { medicalNoteProjectionHandler } from "./projections/handlers/medical-note-projection";
import { documentProjectionHandler } from "./projections/handlers/document-projection";
import { projectionWorker } from "./projections/projection-worker";

/**
 * Initialize Express application
 */
export function createApp(): Application {
  const app = express();

  // Security & Performance Middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/commands", limiter);

  // Routes
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/commands", commandsRouter);
  app.use("/patients", patientsRouter);
  app.use("/visits", visitsRouter);
  app.use("/prescriptions", prescriptionsRouter);
  app.use("/appointments", appointmentsRouter);
  app.use("/medical-notes", medicalNotesRouter);
  app.use("/documents", documentsRouter);
  app.use("/templates", templatesRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Register all command handlers
 */
function registerCommandHandlers(): void {
  logger.info("Registering command handlers...");

  // Register command handlers
  commandBus.registerHandler(registerPatientHandler);
  commandBus.registerHandler(updatePatientContactHandler);
  commandBus.registerHandler(updatePatientDemographicsHandler);
  commandBus.registerHandler(scheduleVisitHandler);
  commandBus.registerHandler(completeVisitHandler);
  commandBus.registerHandler(createPrescriptionHandler);
  commandBus.registerHandler(signPrescriptionHandler);
  commandBus.registerHandler(dispensePrescriptionHandler);
  commandBus.registerHandler(scheduleAppointmentHandler);
  commandBus.registerHandler(confirmAppointmentHandler);
  commandBus.registerHandler(cancelAppointmentHandler);
  commandBus.registerHandler(rescheduleAppointmentHandler);
  commandBus.registerHandler(createMedicalNoteHandler);
  commandBus.registerHandler(uploadDocumentHandler);

  // Log registered handlers
  const handlers = commandBus.getHandlers();
  logger.info(`Registered ${handlers.length} command handler(s)`, {
    handlers,
  });
}

/**
 * Register all projection handlers
 */
function registerProjectionHandlers(): void {
  logger.info("Registering projection handlers...");

  // Register projection handlers
  eventDispatcher.registerHandler(patientProjectionHandler);
  eventDispatcher.registerHandler(visitProjectionHandler);
  eventDispatcher.registerHandler(prescriptionProjectionHandler);
  eventDispatcher.registerHandler(appointmentProjectionHandler);
  eventDispatcher.registerHandler(medicalNoteProjectionHandler);
  eventDispatcher.registerHandler(documentProjectionHandler);

  // Log registered handlers
  const handlers = eventDispatcher.getHandlers();
  logger.info(`Registered ${handlers.length} projection handler(s)`, {
    handlers,
  });
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  try {
    // Test database connection
    logger.info("Testing database connection...");
    await db.query("SELECT 1");
    logger.info("Database connection successful");

    // Check database schema
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_name = 'event_store'
    `);

    if (result.rows[0].count === "0") {
      logger.warn(
        "⚠️  event_store table not found. Did you run the schema migration?"
      );
      logger.warn("   Run: psql -U postgres -d clinica_dev -f ../schema.sql");
    }

    // Register command handlers
    registerCommandHandlers();

    // Register projection handlers
    registerProjectionHandlers();

    // Start projection worker
    logger.info("Starting projection worker...");
    await projectionWorker.start();

    // Create Express app
    const app = createApp();

    // Export app for testing
    (global as any).__app = app;

    // Start listening
    const server = app.listen(config.port, () => {
      logger.info(
        "═══════════════════════════════════════════════════════════"
      );
      logger.info("🚀 Clinica Backend Server Started");
      logger.info(
        "═══════════════════════════════════════════════════════════"
      );
      logger.info(`Environment:        ${config.env}`);
      logger.info(`Port:               ${config.port}`);
      logger.info(
        `Database:           ${config.database.url.replace(/:[^:]*@/, ":***@")}`
      );
      logger.info(`Log Level:          ${config.logLevel}`);
      logger.info(`Command Handlers:   ${commandBus.getHandlers().length}`);
      logger.info(
        `Projection Handlers: ${eventDispatcher.getHandlers().length}`
      );
      logger.info(
        "═══════════════════════════════════════════════════════════"
      );
      logger.info("");
      logger.info("📡 Endpoints:");
      logger.info(
        `   POST http://localhost:${config.port}/commands/:commandType`
      );
      logger.info(`   GET  http://localhost:${config.port}/patients`);
      logger.info(`   GET  http://localhost:${config.port}/patients/:id`);
      logger.info(`   GET  http://localhost:${config.port}/visits`);
      logger.info(`   GET  http://localhost:${config.port}/visits/:id`);
      logger.info(`   GET  http://localhost:${config.port}/health`);
      logger.info(`   GET  http://localhost:${config.port}/health/detailed`);
      logger.info("");
      logger.info("💡 Try this:");
      logger.info(
        `   curl -X POST http://localhost:${config.port}/commands/register-patient \\`
      );
      logger.info('     -H "Content-Type: application/json" \\');
      logger.info('     -d \'{"payload": {"mrn": "MRN-2026-000001", ...}}\'');
      logger.info("");
      logger.info(
        "═══════════════════════════════════════════════════════════"
      );
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      projectionWorker.stop();
      server.close(async () => {
        await db.close();
        logger.info("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      projectionWorker.stop();
      server.close(async () => {
        await db.close();
        logger.info("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Start the server (skip in test environment)
if (process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID) {
  start();
}
