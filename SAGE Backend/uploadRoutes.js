'use strict';

/**
 * uploadRoutes.js
 *
 * POST /api/upload/:tab   (tab = faculty | rooms | sections | courses | timeslots)
 */

const express = require('express');
const multer = require('multer');
const { readTabColumn, UploadError, ALLOWED_EXTENSIONS, extensionOf } = require('./parseColumn');

const TABLES = {
  faculty:   { table: 'faculty',   idColumn: 'faculty_id',  nameColumn: 'name',        idPrefix: 'F0',  extraColumns: { employment_type: 'Full-Time' } },
  rooms:     { table: 'rooms',     idColumn: 'room_id',     isDirectId: true,                           extraColumns: { room_type: 'Lecture', capacity: 30 } },
  sections:  { table: 'sections',  idColumn: 'section_id',  nameColumn: 'program',     idPrefix: 'SEC', extraColumns: { year_level: 1 } },
  courses:   { table: 'courses',   idColumn: 'course_code', nameColumn: 'description', idPrefix: 'CRS', extraColumns: {} },
  timeslots: { table: 'timeslots', idColumn: 'timeslot_id', nameColumn: 'day',         idPrefix: 'TS',  extraColumns: {} },
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXTENSIONS.includes(extensionOf(file.originalname))) return cb(null, true);
    cb(new UploadError('Only CSV or Excel files (.csv, .xlsx, .xls) are allowed.'));
  },
});

function receiveFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof UploadError) return res.status(err.status).json({ error: err.message });
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).` });
    }
    return res.status(400).json({ error: err.message || 'Upload failed.' });
  });
}

async function ensureCompositeCoursePrimaryKey(conn) {
  try {
    const [pkRows] = await conn.query("SHOW KEYS FROM `courses` WHERE Key_name = 'PRIMARY'");
    const pkCols = pkRows.map((r) => r.Column_name.toLowerCase());

    if (pkCols.length === 1 && pkCols[0] === 'course_code') {
      const [idxRows] = await conn.query("SHOW KEYS FROM `courses` WHERE Key_name = 'idx_course_code'");
      if (idxRows.length === 0) {
        await conn.query('ALTER TABLE `courses` ADD INDEX `idx_course_code` (`course_code`)');
      }
      await conn.query(
        'ALTER TABLE `courses` DROP PRIMARY KEY, ADD PRIMARY KEY (`course_code`, `program_owner`)'
      );
    }
  } catch (err) {
    console.warn('[Upload courses] PK check warning:', err.message);
  }
}

/**
 * Ensures `faculty` and `timeslots` time columns are VARCHAR(25) so MySQL stores
 * 12-hour strings with "AM", "PM", and "N/A" (e.g., '9:30 AM', '4:30 PM', 'N/A') directly!
 */
async function ensureTimeColumnsSupportAmPm(conn, tab) {
  try {
    if (tab === 'faculty') {
      await conn.query(
        'ALTER TABLE `faculty` MODIFY COLUMN `official_time_start` VARCHAR(25) DEFAULT NULL, MODIFY COLUMN `official_time_end` VARCHAR(25) DEFAULT NULL'
      );
    } else if (tab === 'timeslots') {
      await conn.query(
        'ALTER TABLE `timeslots` MODIFY COLUMN `start_time` VARCHAR(25) NOT NULL, MODIFY COLUMN `end_time` VARCHAR(25) NOT NULL'
      );
    }
  } catch (err) {
    console.warn(`[Upload ${tab}] Column type check warning:`, err.message);
  }
}

/** Inserts or updates structured multi-column records for any of the 5 tables. */
async function upsertStructuredRecords(pool, tab, values) {
  const conn = await pool.getConnection();
  try {
    if (tab === 'courses') {
      await ensureCompositeCoursePrimaryKey(conn);
    } else if (tab === 'faculty' || tab === 'timeslots') {
      await ensureTimeColumnsSupportAmPm(conn, tab);
    }

    await conn.beginTransaction();

    let added = 0;
    let updated = 0;

    if (tab === 'courses') {
      const [existing] = await conn.query('SELECT `course_code`, `program_owner` FROM `courses` FOR UPDATE');
      const known = new Set(
        existing.map((r) => `${String(r.course_code).toLowerCase()}__${String(r.program_owner).toLowerCase()}`)
      );

      const rows = values.map((item) => {
        const key = `${item.course_code.toLowerCase()}__${item.program_owner.toLowerCase()}`;
        if (known.has(key)) updated++;
        else added++;
        return [
          item.course_code,
          item.description,
          item.lec_hours,
          item.lab_hours,
          item.program_owner,
          item.year_level,
          item.semester,
          item.department_owner,
        ];
      });

      if (rows.length > 0) {
        await conn.query(
          `INSERT INTO \`courses\`
            (\`course_code\`, \`description\`, \`lec_hours\`, \`lab_hours\`, \`program_owner\`, \`year_level\`, \`semester\`, \`department_owner\`)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            \`description\` = VALUES(\`description\`),
            \`lec_hours\` = VALUES(\`lec_hours\`),
            \`lab_hours\` = VALUES(\`lab_hours\`),
            \`program_owner\` = VALUES(\`program_owner\`),
            \`year_level\` = VALUES(\`year_level\`),
            \`semester\` = VALUES(\`semester\`),
            \`department_owner\` = VALUES(\`department_owner\`)`,
          [rows]
        );
      }
    } else if (tab === 'faculty') {
      const [existing] = await conn.query('SELECT `faculty_id` FROM `faculty` FOR UPDATE');
      const known = new Set(existing.map((r) => String(r.faculty_id).toLowerCase()));
      let maxNum = existing.length;

      const rows = values.map((item, idx) => {
        const fid = item.faculty_id || `F${String(maxNum + idx + 1).padStart(3, '0')}`;
        if (known.has(fid.toLowerCase())) updated++;
        else added++;
        return [
          fid,
          item.name,
          item.employment_type,
          item.official_time_start,
          item.official_time_end,
          item.expertise_tags,
          item.seniority_level,
          item.preferred_shift,
          item.max_preparations,
        ];
      });

      if (rows.length > 0) {
        await conn.query(
          `INSERT INTO \`faculty\`
            (\`faculty_id\`, \`name\`, \`employment_type\`, \`official_time_start\`, \`official_time_end\`, \`expertise_tags\`, \`seniority_level\`, \`preferred_shift\`, \`max_preparations\`)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`employment_type\` = VALUES(\`employment_type\`),
            \`official_time_start\` = VALUES(\`official_time_start\`),
            \`official_time_end\` = VALUES(\`official_time_end\`),
            \`expertise_tags\` = VALUES(\`expertise_tags\`),
            \`seniority_level\` = VALUES(\`seniority_level\`),
            \`preferred_shift\` = VALUES(\`preferred_shift\`),
            \`max_preparations\` = VALUES(\`max_preparations\`)`,
          [rows]
        );
      }
    } else if (tab === 'rooms') {
      const [existing] = await conn.query('SELECT `room_id` FROM `rooms` FOR UPDATE');
      const known = new Set(existing.map((r) => String(r.room_id).toLowerCase()));

      const rows = values.map((item) => {
        if (known.has(item.room_id.toLowerCase())) updated++;
        else added++;
        return [item.room_id, item.room_type, item.capacity];
      });

      if (rows.length > 0) {
        await conn.query(
          `INSERT INTO \`rooms\` (\`room_id\`, \`room_type\`, \`capacity\`)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            \`room_type\` = VALUES(\`room_type\`),
            \`capacity\` = VALUES(\`capacity\`)`,
          [rows]
        );
      }
    } else if (tab === 'sections') {
      const [existing] = await conn.query('SELECT `section_id` FROM `sections` FOR UPDATE');
      const known = new Set(existing.map((r) => String(r.section_id).toLowerCase()));

      const rows = values.map((item) => {
        if (known.has(item.section_id.toLowerCase())) updated++;
        else added++;
        return [item.section_id, item.program, item.year_level, item.semester, item.student_count];
      });

      if (rows.length > 0) {
        await conn.query(
          `INSERT INTO \`sections\` (\`section_id\`, \`program\`, \`year_level\`, \`semester\`, \`student_count\`)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            \`program\` = VALUES(\`program\`),
            \`year_level\` = VALUES(\`year_level\`),
            \`semester\` = VALUES(\`semester\`),
            \`student_count\` = VALUES(\`student_count\`)`,
          [rows]
        );
      }
    } else if (tab === 'timeslots') {
      const [existing] = await conn.query('SELECT `timeslot_id` FROM `timeslots` FOR UPDATE');
      const known = new Set(existing.map((r) => String(r.timeslot_id).toLowerCase()));

      const rows = values.map((item) => {
        if (known.has(item.timeslot_id.toLowerCase())) updated++;
        else added++;
        return [item.timeslot_id, item.day, item.start_time, item.end_time, item.modality_rule];
      });

      if (rows.length > 0) {
        await conn.query(
          `INSERT INTO \`timeslots\` (\`timeslot_id\`, \`day\`, \`start_time\`, \`end_time\`, \`modality_rule\`)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            \`day\` = VALUES(\`day\`),
            \`start_time\` = VALUES(\`start_time\`),
            \`end_time\` = VALUES(\`end_time\`),
            \`modality_rule\` = VALUES(\`modality_rule\`)`,
          [rows]
        );
      }
    }

    await conn.commit();
    return { added, updated, alreadyThere: 0 };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Fallback: Inserts single-column values. */
async function insertNew(pool, cfg, values) {
  const { table, idColumn, nameColumn, idPrefix, isDirectId, extraColumns = {} } = cfg;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (isDirectId) {
      const [existing] = await conn.query(`SELECT \`${idColumn}\` AS id FROM \`${table}\` FOR UPDATE`);
      const knownIds = new Set(existing.map((r) => String(r.id ?? '').trim().toLowerCase()));
      const freshRooms = values.filter((v) => !knownIds.has(String(v).trim().toLowerCase()));

      if (freshRooms.length > 0) {
        const extraKeys = Object.keys(extraColumns);
        const extraVals = Object.values(extraColumns);
        const cols = [`\`${idColumn}\``, ...extraKeys.map((k) => `\`${k}\``)].join(', ');
        const rows = freshRooms.map((roomNumber) => [String(roomNumber).trim(), ...extraVals]);
        await conn.query(`INSERT INTO \`${table}\` (${cols}) VALUES ?`, [rows]);
      }

      await conn.commit();
      return { added: freshRooms.length, updated: 0, alreadyThere: values.length - freshRooms.length };
    }

    const [existing] = await conn.query(
      `SELECT \`${idColumn}\` AS id, \`${nameColumn}\` AS name FROM \`${table}\` FOR UPDATE`
    );

    const known = new Set(existing.map((r) => String(r.name ?? '').trim().toLowerCase()));
    const fresh = values.filter((v) => !known.has(String(v).toLowerCase()));

    if (fresh.length > 0) {
      const extraKeys = Object.keys(extraColumns);
      const extraVals = Object.values(extraColumns);

      if (idPrefix) {
        let maxNumber = 0;
        for (const r of existing) {
          const match = String(r.id ?? '').match(/(\d+)(?!.*\d)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
          }
        }
        const next = maxNumber + 1;
        const formatId = (num) => (table === 'faculty' ? `F0${num}` : `${idPrefix}-${String(num).padStart(4, '0')}`);
        const cols = [`\`${idColumn}\``, `\`${nameColumn}\``, ...extraKeys.map((k) => `\`${k}\``)].join(', ');
        const rows = fresh.map((v, i) => [formatId(next + i), v, ...extraVals]);
        await conn.query(`INSERT INTO \`${table}\` (${cols}) VALUES ?`, [rows]);
      } else {
        const cols = [`\`${nameColumn}\``, ...extraKeys.map((k) => `\`${k}\``)].join(', ');
        const rows = fresh.map((v) => [v, ...extraVals]);
        await conn.query(`INSERT INTO \`${table}\` (${cols}) VALUES ?`, [rows]);
      }
    }

    await conn.commit();
    return { added: fresh.length, updated: 0, alreadyThere: values.length - fresh.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function createUploadRouter(pool) {
  const router = express.Router();

  router.post('/:tab', receiveFile, async (req, res) => {
    const tab = req.params.tab;
    const cfg = TABLES[tab];
    if (!cfg) return res.status(400).json({ error: `Unknown data type "${tab}".` });
    if (!req.file) return res.status(400).json({ error: 'No file received.' });

    try {
      const { label, isStructured, values, duplicatesInFile } = readTabColumn({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        tab,
      });

      const { added, updated = 0, alreadyThere = 0 } = isStructured
        ? await upsertStructuredRecords(pool, tab, values)
        : await insertNew(pool, cfg, values);

      const skipped = alreadyThere + duplicatesInFile;

      let message;
      if (added === 0 && updated === 0) {
        message = `No new ${label} entries: all ${values.length} in the file already exist.`;
      } else if (updated > 0) {
        message = `${label} imported: ${added} added, ${updated} updated` + (skipped > 0 ? ` (${skipped} skipped).` : '.');
      } else {
        message =
          `Added ${added} new ${label} ${added === 1 ? 'entry' : 'entries'}` +
          (skipped > 0 ? ` (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped).` : '.');
      }

      res.json({ message });
    } catch (err) {
      if (err instanceof UploadError) return res.status(err.status).json({ error: err.message });
      console.error('Upload failed:', err);
      res.status(500).json({ error: err.sqlMessage || 'Upload failed on the server. Please try again.' });
    }
  });

  return router;
}

module.exports = createUploadRouter;