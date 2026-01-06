import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Template query endpoints require authentication
router.use(authenticate);

/**
 * GET /templates
 *
 * List note templates with filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.get("X-Hospital-ID");
    const category = req.query.category as string;
    const isActive = req.query.is_active !== undefined ? req.query.is_active === "true" : true;

    // Build query
    const conditions: string[] = ["deleted_at IS NULL", "is_active = $1"];
    const params: any[] = [isActive];
    let paramIndex = 2;

    // Filter by hospital (if provided)
    if (hospitalId) {
      conditions.push(`(hospital_id = $${paramIndex++} OR is_global = true)`);
      params.push(hospitalId);
    } else {
      // If no hospital ID, only show global templates
      conditions.push("is_global = true");
    }

    // Filter by category (if provided)
    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        name,
        category,
        description,
        template_content,
        is_global,
        is_active,
        usage_count,
        created_at,
        updated_at
      FROM note_templates
      ${whereClause}
      ORDER BY is_global DESC, usage_count DESC, name ASC`,
      params
    );

    res.json({
      data: result.rows.map((template) => ({
        ...template,
        template_content: typeof template.template_content === 'string' 
          ? JSON.parse(template.template_content) 
          : template.template_content,
      })),
    });
  })
);

export default router;

