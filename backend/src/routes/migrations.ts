import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { MigrationService } from '../services/migration/MigrationService';
import { Pool } from 'pg';
import { EventStore } from '../event-sourcing/EventStore';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/migrations');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `migration-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedExts.join(', ')} are allowed.`));
    }
  }
});

// Initialize migration service (will be injected via middleware)
let migrationService: MigrationService;

export function initMigrationRoutes(db: Pool, eventStore: EventStore) {
  migrationService = new MigrationService(db, eventStore);
  return router;
}

// POST /api/migrations - Start new migration
router.post('/', async (req: Request, res: Response) => {
  try {
    const { hospital_id, entity_types, column_mapping } = req.body;
    const user_id = (req as any).user?.id; // From auth middleware

    if (!hospital_id || !entity_types || !Array.isArray(entity_types)) {
      return res.status(400).json({
        error: 'hospital_id and entity_types are required'
      });
    }

    const migrationId = uuidv4();

    res.status(201).json({
      migration_id: migrationId,
      message: 'Migration created. Upload file to proceed.'
    });
  } catch (error) {
    logger.error('Failed to create migration:', error);
    res.status(500).json({ error: 'Failed to create migration' });
  }
});

// POST /api/migrations/:id/upload - Upload file for migration
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id: migrationId } = req.params;
    const { entity_types, column_mapping, sheet_name } = req.body;
    const user_id = (req as any).user?.id;
    const hospital_id = (req as any).user?.hospital_id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const migrationType = fileExt === '.csv' ? 'csv' : 'excel';

    logger.info(`File uploaded for migration ${migrationId}: ${filePath}`);

    // Start migration processing
    await migrationService.startMigration({
      id: migrationId,
      hospital_id,
      initiated_by_user_id: user_id,
      migration_type: migrationType,
      file_path: filePath,
      entity_types: JSON.parse(entity_types || '["patient"]'),
      column_mapping: column_mapping ? JSON.parse(column_mapping) : undefined,
      sheet_name
    });

    res.status(200).json({
      message: 'File uploaded and migration started',
      migration_id: migrationId,
      file_name: req.file.originalname,
      file_size: req.file.size
    });
  } catch (error) {
    logger.error('File upload failed:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// GET /api/migrations/:id - Get migration status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const status = await migrationService.getMigrationStatus(id);

    if (!status) {
      return res.status(404).json({ error: 'Migration not found' });
    }

    res.status(200).json(status);
  } catch (error) {
    logger.error('Failed to get migration status:', error);
    res.status(500).json({ error: 'Failed to get migration status' });
  }
});

// GET /api/migrations/:id/errors - Get validation errors
router.get('/:id/errors', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { severity } = req.query;

    // This could be expanded to a separate method in MigrationService
    const status = await migrationService.getMigrationStatus(id);

    if (!status) {
      return res.status(404).json({ error: 'Migration not found' });
    }

    let errors = status.errors || [];

    if (severity) {
      errors = errors.filter(e => e.severity === severity);
    }

    res.status(200).json({
      migration_id: id,
      total_errors: errors.length,
      errors
    });
  } catch (error) {
    logger.error('Failed to get migration errors:', error);
    res.status(500).json({ error: 'Failed to get migration errors' });
  }
});

// PATCH /api/migrations/:id/errors/:errorId - Fix validation error
router.patch('/:id/errors/:errorId', async (req: Request, res: Response) => {
  try {
    const { id, errorId } = req.params;
    const { corrected_value } = req.body;

    if (corrected_value === undefined) {
      return res.status(400).json({ error: 'corrected_value is required' });
    }

    await migrationService.fixValidationError(id, errorId, corrected_value);

    res.status(200).json({
      message: 'Validation error fixed',
      error_id: errorId
    });
  } catch (error) {
    logger.error('Failed to fix validation error:', error);
    res.status(500).json({ error: 'Failed to fix validation error' });
  }
});

// GET /api/migrations - List all migrations for hospital
router.get('/', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const { status, limit = 50, offset = 0 } = req.query;

    // This would need to be implemented in MigrationService
    // For now, returning a placeholder
    res.status(200).json({
      migrations: [],
      total: 0
    });
  } catch (error) {
    logger.error('Failed to list migrations:', error);
    res.status(500).json({ error: 'Failed to list migrations' });
  }
});

export default router;
