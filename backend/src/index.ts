import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { logger } from "./utils/logger";
import { commandBus } from "./event-sourcing/command-bus";
import { eventStore } from "./event-sourcing/event-store";
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
import onboardingRouter from "./routes/onboarding";
import debugRouter from "./routes/debug";
import patientsRouter from "./routes/patients";
import visitsRouter from "./routes/visits";
import doctorsRouter from "./routes/doctors";
import prescriptionsRouter from "./routes/prescriptions";
import appointmentsRouter from "./routes/appointments";
import medicalNotesRouter from "./routes/medical-notes";
import documentsRouter from "./routes/documents";
import templatesRouter from "./routes/templates";
import doctorProfilesRouter from "./routes/doctor-profiles";
import doctorSchedulesRouter from "./routes/doctor-schedules";
import leaveRequestsRouter from "./routes/leave-requests";
import appointmentSlotsRouter from "./routes/appointment-slots";
// import { initMigrationRoutes } from "./routes/migrations";
// import { initBillingRoutes } from "./routes/billing";

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
import { registerHospitalHandler } from "./commands/register-hospital";
import { createUserHandler } from "./commands/create-user";
import { createDoctorProfileHandler } from "./commands/create-doctor-profile";
import { updateDoctorFeesHandler } from "./commands/update-doctor-fees";
import { createBaseScheduleHandler } from "./commands/create-base-schedule";
import { assignDoctorToDepartmentHandler } from "./commands/assign-doctor-to-department";
import { assignDoctorToLocationHandler } from "./commands/assign-doctor-to-location";
import { activateDoctorHandler } from "./commands/activate-doctor";
import { addScheduleOverrideHandler } from "./commands/add-schedule-override";
import { requestLeaveHandler } from "./commands/request-leave";
import { approveLeaveHandler } from "./commands/approve-leave";
import { rejectLeaveHandler } from "./commands/reject-leave";
import { addForcedBlockHandler } from "./commands/add-forced-block";
import { createTentativeHoldHandler } from "./commands/create-tentative-hold";
import { releaseTentativeHoldHandler } from "./commands/release-tentative-hold";
import { blockSlotHandler } from "./commands/block-slot";
import { createRoomHandler } from "./commands/create-room";
import { createEquipmentHandler } from "./commands/create-equipment";

// Projection Handlers
import { eventDispatcher } from "./projections/event-dispatcher";
import { patientProjectionHandler } from "./projections/handlers/patient-projection";
import { visitProjectionHandler } from "./projections/handlers/visit-projection";
import { prescriptionProjectionHandler } from "./projections/handlers/prescription-projection";
import { appointmentProjectionHandler } from "./projections/handlers/appointment-projection";
import { medicalNoteProjectionHandler } from "./projections/handlers/medical-note-projection";
import { documentProjectionHandler } from "./projections/handlers/document-projection";
import { HospitalProjectionHandler } from "./projections/handlers/hospital-projection";
import { UserProjectionHandler } from "./projections/handlers/user-projection";
// import { BillingProjectionHandler } from "./projections/handlers/billing-projection";
import { projectionWorker } from "./projections/projection-worker";

/**
 * Initialize Express application
 */
export function createApp(): Application {
  const app = express();

  // Security & Performance Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.env === 'production'
      ? [
          'https://frontend-chi-henna-22.vercel.app',
          'https://frontend-fd224p762-divijshrivastavas-projects.vercel.app',
          'https://mymedic.life',
          'https://www.mymedic.life'
        ]
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
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
  app.use("/debug", debugRouter);
  app.use("/onboarding", onboardingRouter);
  app.use("/commands", commandsRouter);
  app.use("/patients", patientsRouter);
  app.use("/visits", visitsRouter);
  app.use("/doctors", doctorsRouter);
  app.use("/prescriptions", prescriptionsRouter);
  app.use("/appointments", appointmentsRouter);
  app.use("/medical-notes", medicalNotesRouter);
  app.use("/documents", documentsRouter);
  app.use("/templates", templatesRouter);
  app.use("/doctor-profiles", doctorProfilesRouter);
  app.use("/doctor-schedules", doctorSchedulesRouter);
  app.use("/leave-requests", leaveRequestsRouter);
  app.use("/appointment-slots", appointmentSlotsRouter);
  // app.use("/migrations", initMigrationRoutes(db, eventStore));
  // app.use("/billing", initBillingRoutes(db, eventStore));

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
  commandBus.registerHandler(registerHospitalHandler);
  commandBus.registerHandler(createUserHandler);
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
  
  // Doctor scheduling command handlers
  commandBus.registerHandler(createDoctorProfileHandler);
  commandBus.registerHandler(updateDoctorFeesHandler);
  commandBus.registerHandler(createBaseScheduleHandler);
  commandBus.registerHandler(assignDoctorToDepartmentHandler);
  commandBus.registerHandler(assignDoctorToLocationHandler);
  commandBus.registerHandler(activateDoctorHandler);
  commandBus.registerHandler(addScheduleOverrideHandler);
  commandBus.registerHandler(requestLeaveHandler);
  commandBus.registerHandler(approveLeaveHandler);
  commandBus.registerHandler(rejectLeaveHandler);
  commandBus.registerHandler(addForcedBlockHandler);
  commandBus.registerHandler(createTentativeHoldHandler);
  commandBus.registerHandler(releaseTentativeHoldHandler);
  commandBus.registerHandler(blockSlotHandler);
  commandBus.registerHandler(createRoomHandler);
  commandBus.registerHandler(createEquipmentHandler);

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
  const hospitalProjectionHandler = new HospitalProjectionHandler();
  const userProjectionHandler = new UserProjectionHandler();
  // const billingProjectionHandler = new BillingProjectionHandler(db);

  eventDispatcher.registerHandler(hospitalProjectionHandler);
  eventDispatcher.registerHandler(userProjectionHandler);
  eventDispatcher.registerHandler(patientProjectionHandler);
  eventDispatcher.registerHandler(visitProjectionHandler);
  eventDispatcher.registerHandler(prescriptionProjectionHandler);
  eventDispatcher.registerHandler(appointmentProjectionHandler);
  eventDispatcher.registerHandler(medicalNoteProjectionHandler);
  eventDispatcher.registerHandler(documentProjectionHandler);
  // eventDispatcher.registerHandler(billingProjectionHandler);

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
      logger.warn("   Run: psql -U postgres -d mymedic_dev -f ../schema.sql");
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
      logger.info("🚀 MyMedic Backend Server Started");
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
