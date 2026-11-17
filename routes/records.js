const router = require("express").Router();

const db = require("../db");

const validStatuses = [
  "Pending",
  "In progress",
  "Completed"
];

// Validate IDs before accessing the database.
function validateId(req, res, next) {
  const value = req.params.id;

  if (!/^[0-9]+$/.test(value)) {
    return res.status(400).json({
      message: "ID must be a positive whole number."
    });
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "ID must be a positive whole number."
    });
  }

  req.recordId = id;

  next();
}

// Validate all four editable fields.
function validateRecord(req, res, next) {
  const body = req.body;

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return res.status(400).json({
      message: "Send a JSON object containing all four editable fields."
    });
  }

  const fields = [
    "title",
    "category",
    "description",
    "status"
  ];

  // Check types before trimming.
  for (const field of fields) {
    if (typeof body[field] !== "string") {
      return res.status(400).json({
        message: `${field} is required and must be a string.`
      });
    }
  }

  const record = {
    title: body.title.trim(),
    category: body.category.trim(),
    description: body.description.trim(),
    status: body.status.trim()
  };

  if (
    record.title.length < 3 ||
    record.title.length > 80
  ) {
    return res.status(400).json({
      message: "Title must have 3 to 80 characters."
    });
  }

  if (
    record.category.length < 2 ||
    record.category.length > 40
  ) {
    return res.status(400).json({
      message: "Category must have 2 to 40 characters."
    });
  }

  if (
    record.description.length < 5 ||
    record.description.length > 300
  ) {
    return res.status(400).json({
      message: "Description must have 5 to 300 characters."
    });
  }

  if (!validStatuses.includes(record.status)) {
    return res.status(400).json({
      message:
        "Status must be Pending, In progress, or Completed."
    });
  }

  // Ignore any client-supplied ID.
  req.validatedRecord = record;

  next();
}

// GET /api/records
router.get("/", (req, res, next) => {
  try {
    const records = db.prepare(`
      SELECT
        id,
        title,
        category,
        description,
        status
      FROM records
      ORDER BY id
    `).all();

    return res.status(200).json(records);
  } catch (error) {
    next(error);
  }
});

// GET /api/records/:id
router.get("/:id", validateId, (req, res, next) => {
  try {
    const record = db.prepare(`
      SELECT
        id,
        title,
        category,
        description,
        status
      FROM records
      WHERE id = ?
    `).get(req.recordId);

    if (!record) {
      return res.status(404).json({
        message: "Record not found."
      });
    }

    return res.status(200).json(record);
  } catch (error) {
    next(error);
  }
});

// POST /api/records
router.post("/", validateRecord, (req, res, next) => {
  try {
    const record = req.validatedRecord;

    const savedRecord = db.prepare(`
      INSERT INTO records (
        title,
        category,
        description,
        status
      )
      VALUES (?, ?, ?, ?)
      RETURNING id, title, category, description, status
    `).get(
      record.title,
      record.category,
      record.description,
      record.status
    );

    return res.status(201).json(savedRecord);
  } catch (error) {
    next(error);
  }
});

// PUT /api/records/:id
router.put(
  "/:id",
  validateId,
  validateRecord,
  (req, res, next) => {
    try {
      const record = req.validatedRecord;

      const updatedRecord = db.prepare(`
        UPDATE records
        SET
          title = ?,
          category = ?,
          description = ?,
          status = ?
        WHERE id = ?
        RETURNING id, title, category, description, status
      `).get(
        record.title,
        record.category,
        record.description,
        record.status,
        req.recordId
      );

      if (!updatedRecord) {
        return res.status(404).json({
          message: "Record not found."
        });
      }

      return res.status(200).json(updatedRecord);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/records/:id
router.delete("/:id", validateId, (req, res, next) => {
  try {
    const deletedRecord = db.prepare(`
      DELETE FROM records
      WHERE id = ?
      RETURNING id
    `).get(req.recordId);

    if (!deletedRecord) {
      return res.status(404).json({
        message: "Record not found."
      });
    }

    return res.status(200).json({
      message: "Record deleted."
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;