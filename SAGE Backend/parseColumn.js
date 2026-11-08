'use strict';

/**
 * parseColumn.js
 *
 * Reads an uploaded CSV / Excel file for all 5 Manage Data tabs:
 *  - faculty:   faculty_id, name, employment_type, official_time_start, official_time_end, expertise_tags, seniority_level, preferred_shift, max_preparations
 *  - rooms:     room_id, room_type, capacity
 *  - sections:  section_id, program, year_level, semester, student_count
 *  - courses:   course_code, description, lec_hours, lab_hours, program_owner, year_level, semester, department_owner
 *  - timeslots: timeslot_id, day, start_time, end_time, modality_rule
 */

const XLSX = require('xlsx');

const COLUMN_BY_TAB = {
  faculty:
    'faculty_id, name, employment_type, official_time_start, official_time_end, expertise_tags, seniority_level, preferred_shift, max_preparations',
  rooms: 'room_id, room_type, capacity',
  sections: 'section_id, program, year_level, semester, student_count',
  courses:
    'Course_Code, Description, Lec_Hours, Lab_Hours, Program_Owner, Year_Level, Semester, Department_Owner',
  timeslots: 'timeslot_id, day, start_time, end_time, modality_rule',
};

const SINGLE_COLUMN_FALLBACK = {
  faculty: 'Faculty',
  rooms: 'Rooms',
  sections: 'Sections',
  courses: 'Courses',
  timeslots: 'Timeslots',
};

// Header aliases for the 9 columns of the `faculty` table
const FACULTY_HEADER_ALIASES = {
  faculty_id: ['facultyid', 'id', 'empid', 'employeeid', 'facultycode', 'profid'],
  name: ['name', 'facultyname', 'fullname', 'professor', 'instructor', 'faculty'],
  employment_type: ['employmenttype', 'type', 'status', 'empstatus', 'employment'],
  official_time_start: ['officialtimestart', 'timestart', 'starttime', 'shiftstart', 'officialstart'],
  official_time_end: ['officialtimeend', 'timeend', 'endtime', 'shiftend', 'officialend'],
  expertise_tags: ['expertisetags', 'expertise', 'specialization', 'tags', 'skills'],
  seniority_level: ['senioritylevel', 'seniority', 'rank', 'level'],
  preferred_shift: ['preferredshift', 'shift', 'prefshift', 'timepreference'],
  max_preparations: ['maxpreparations', 'maxpreps', 'preparations', 'preps', 'maxprep'],
};

// Header aliases for the 3 columns of the `rooms` table
const ROOMS_HEADER_ALIASES = {
  room_id: ['roomid', 'room', 'rooms', 'roomnumber', 'roomno', 'roomcode', 'id'],
  room_type: ['roomtype', 'type', 'category', 'classification'],
  capacity: ['capacity', 'maxcapacity', 'seats', 'roomcapacity', 'size'],
};

// Header aliases for the 5 columns of the `sections` table
const SECTIONS_HEADER_ALIASES = {
  section_id: ['sectionid', 'section', 'sections', 'sectioncode', 'block', 'id'],
  program: ['program', 'programowner', 'course', 'degree', 'prog'],
  year_level: ['yearlevel', 'year', 'yrlevel', 'yr'],
  semester: ['semester', 'sem', 'term'],
  student_count: ['studentcount', 'students', 'population', 'size', 'count', 'enrolled'],
};

// Header aliases for the 8 columns of the `courses` table
const COURSE_HEADER_ALIASES = {
  course_code: ['coursecode', 'code', 'courseid', 'subjectcode', 'courses'],
  description: ['description', 'coursedescription', 'coursename', 'title', 'subjectdescription'],
  lec_hours: ['lechours', 'lecturehours', 'lec', 'lechrs'],
  lab_hours: ['labhours', 'laboratoryhours', 'lab', 'labhrs'],
  program_owner: ['programowner', 'program', 'prog', 'courseprogram'],
  year_level: ['yearlevel', 'year', 'yrlevel', 'yr'],
  semester: ['semester', 'sem'],
  department_owner: ['departmentowner', 'department', 'dept'],
};

// Header aliases for the 5 columns of the `timeslots` table
const TIMESLOTS_HEADER_ALIASES = {
  timeslot_id: ['timeslotid', 'blockid', 'slotid', 'timeslot', 'timeslots', 'id', 'code'],
  day: ['day', 'weekday', 'days'],
  start_time: ['starttime', 'timestart', 'start', 'from'],
  end_time: ['endtime', 'timeend', 'end', 'to'],
  modality_rule: ['modalityrule', 'modality', 'mode', 'type', 'deliverymode'],
};

const REQUIRED_SHEET = 'Compile';
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const HEADER_SCAN_ROWS = 15;

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

const normalize = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/**
 * Parses and preserves 12-hour time WITH "AM" or "PM" (e.g., "9:30 AM", "4:30 PM", "12:00 PM")
 * or "N/A" if the cell is N/A.
 */
function format12HourAmPm(raw, fallback = 'N/A', timeslotIdHint = '') {
  const s = clean(raw);
  if (!s || /^n\/?a$/i.test(s) || /^none$/i.test(s) || s === '-' || s === '00:00:00') {
    return fallback;
  }

  // Match hours, minutes, optional seconds, and optional AM/PM
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i.exec(s);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = String(m[2]).padStart(2, '0');
    let mer = (m[4] || '').toUpperCase().replace(/\./g, '');

    if (!mer) {
      // If AM/PM wasn't explicitly in the string, infer from 24h hour or timeslot_id
      if (hh >= 12) {
        mer = 'PM';
        if (hh > 12) hh -= 12;
      } else if (timeslotIdHint && timeslotIdHint.includes('-')) {
        const slotNum = parseInt(timeslotIdHint.split('-')[1], 10);
        if (!isNaN(slotNum) && slotNum >= 1200) {
          mer = 'PM';
        } else {
          mer = hh >= 7 && hh <= 11 ? 'AM' : 'PM';
        }
      } else {
        mer = hh >= 7 && hh <= 11 ? 'AM' : 'PM';
      }
    } else {
      // Convert 13..23 to 1..11 if someone wrote "16:30 PM"
      if (hh > 12) hh -= 12;
      if (hh === 0) hh = 12;
    }

    return `${hh}:${mm} ${mer}`;
  }

  return s;
}

const extensionOf = (name) => {
  const m = /\.[^.\\/]+$/.exec(name || '');
  return m ? m[0].toLowerCase() : '';
};

const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);
const isZip = (buf) => startsWith(buf, [0x50, 0x4b, 0x03, 0x04]); // .xlsx
const isOle = (buf) => startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // .xls
const isPdf = (buf) => startsWith(buf, [0x25, 0x50, 0x44, 0x46]); // %PDF

const NOT_ALLOWED = 'Only CSV or Excel files (.csv, .xlsx, .xls) are allowed.';

function detectKind(buffer, fileName) {
  const ext = extensionOf(fileName);
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new UploadError(NOT_ALLOWED);
  if (!buffer || buffer.length === 0) throw new UploadError('The uploaded file is empty.');

  if (ext === '.csv') {
    const looksBinary =
      isZip(buffer) || isOle(buffer) || isPdf(buffer) || buffer.subarray(0, 8192).includes(0x00);
    if (looksBinary) throw new UploadError(NOT_ALLOWED);
    return 'csv';
  }

  if (!isZip(buffer) && !isOle(buffer)) throw new UploadError(NOT_ALLOWED);
  return 'excel';
}

function decodeCsv(buffer) {
  let buf = buffer;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.subarray(3);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(buf);
    } catch {
      return buf.toString('latin1');
    }
  }
}

function loadSheets(buffer, kind) {
  const workbook =
    kind === 'csv'
      ? XLSX.read(decodeCsv(buffer), { type: 'string', raw: true })
      : XLSX.read(buffer, { type: 'buffer' });

  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: true,
    }),
  }));
}

function readColumn(rows, wanted) {
  const target = normalize(wanted);
  const limit = Math.min(HEADER_SCAN_ROWS, rows.length);

  for (let r = 0; r < limit; r++) {
    const col = rows[r].findIndex((cell) => normalize(cell) === target);
    if (col === -1) continue;

    const values = [];
    for (let i = r + 1; i < rows.length; i++) {
      const v = clean(rows[i][col]);
      if (v) values.push(v);
    }
    return { found: true, values };
  }
  return { found: false, values: [] };
}

function findHeaderColMap(rows, aliasesObj) {
  const limit = Math.min(HEADER_SCAN_ROWS, rows.length);
  for (let r = 0; r < limit; r++) {
    const normalizedCells = (rows[r] || []).map((cell) => normalize(cell));
    const colMap = {};
    for (const [dbCol, aliases] of Object.entries(aliasesObj)) {
      const idx = normalizedCells.findIndex((cellText) => aliases.includes(cellText));
      if (idx !== -1) colMap[dbCol] = idx;
    }
    if (Object.keys(colMap).length >= 2) {
      return { headerRow: r, colMap };
    }
  }
  return null;
}

// 1. Read structured `faculty` rows (preserves '9:30 AM', '4:30 PM', and 'N/A')
function readFacultyTable(rows) {
  const match = findHeaderColMap(rows, FACULTY_HEADER_ALIASES);
  if (!match || (match.colMap.faculty_id === undefined && match.colMap.name === undefined)) {
    return { found: false, records: [] };
  }
  const { headerRow, colMap } = match;
  const records = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const faculty_id = colMap.faculty_id !== undefined ? clean(row[colMap.faculty_id]) : '';
    const name = colMap.name !== undefined ? clean(row[colMap.name]) : '';
    if (!faculty_id && !name) continue;

    const empType = colMap.employment_type !== undefined ? clean(row[colMap.employment_type]) : 'Regular';
    const timeStartRaw = colMap.official_time_start !== undefined ? row[colMap.official_time_start] : 'N/A';
    const timeEndRaw = colMap.official_time_end !== undefined ? row[colMap.official_time_end] : 'N/A';
    const tags = colMap.expertise_tags !== undefined ? clean(row[colMap.expertise_tags]) : '';
    const seniorityRaw = colMap.seniority_level !== undefined ? row[colMap.seniority_level] : '1';
    const shiftRaw = colMap.preferred_shift !== undefined ? clean(row[colMap.preferred_shift]) : null;
    const prepsRaw = colMap.max_preparations !== undefined ? row[colMap.max_preparations] : '3';

    const normalizedShift =
      shiftRaw && shiftRaw.toLowerCase().startsWith('m')
        ? 'Morning'
        : shiftRaw && shiftRaw.toLowerCase().startsWith('a')
        ? 'Afternoon'
        : null;

    records.push({
      faculty_id,
      name: name || faculty_id,
      employment_type: empType || 'Regular',
      official_time_start: format12HourAmPm(timeStartRaw, 'N/A'),
      official_time_end: format12HourAmPm(timeEndRaw, 'N/A'),
      expertise_tags: tags,
      seniority_level: parseInt(String(seniorityRaw).replace(/[^0-9]/g, ''), 10) || 0,
      preferred_shift: normalizedShift,
      max_preparations: parseInt(String(prepsRaw).replace(/[^0-9]/g, ''), 10) || 3,
    });
  }
  return { found: true, records };
}

// 2. Read structured `rooms` rows
function readRoomsTable(rows) {
  const match = findHeaderColMap(rows, ROOMS_HEADER_ALIASES);
  if (!match || match.colMap.room_id === undefined) {
    return { found: false, records: [] };
  }
  const { headerRow, colMap } = match;
  const records = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const room_id = clean(row[colMap.room_id]);
    if (!room_id) continue;

    const typeRaw = colMap.room_type !== undefined ? clean(row[colMap.room_type]) : '';
    const capRaw = colMap.capacity !== undefined ? row[colMap.capacity] : '40';

    const room_type =
      typeRaw.toLowerCase().includes('lab') || room_id.toUpperCase().includes('LB') || room_id.toUpperCase().includes('LAB')
        ? 'Laboratory'
        : 'Lecture';

    records.push({
      room_id,
      room_type,
      capacity: parseInt(String(capRaw).replace(/[^0-9]/g, ''), 10) || 40,
    });
  }
  return { found: true, records };
}

// 3. Read structured `sections` rows
function readSectionsTable(rows) {
  const match = findHeaderColMap(rows, SECTIONS_HEADER_ALIASES);
  if (!match || match.colMap.section_id === undefined) {
    return { found: false, records: [] };
  }
  const { headerRow, colMap } = match;
  const records = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const section_id = clean(row[colMap.section_id]);
    if (!section_id) continue;

    const progRaw = colMap.program !== undefined ? clean(row[colMap.program]) : '';
    const yearRaw = colMap.year_level !== undefined ? row[colMap.year_level] : '1';
    const semRaw = colMap.semester !== undefined ? row[colMap.semester] : '1';
    const countRaw = colMap.student_count !== undefined ? row[colMap.student_count] : '35';

    let inferredProg = progRaw.toUpperCase();
    if (!inferredProg) {
      if (section_id.toUpperCase().includes('CS')) inferredProg = 'BSCS';
      else if (section_id.toUpperCase().includes('IS')) inferredProg = 'BSIS';
      else inferredProg = 'BSIT';
    }

    records.push({
      section_id,
      program: inferredProg,
      year_level: parseInt(String(yearRaw).replace(/[^0-9]/g, ''), 10) || 1,
      semester: parseInt(String(semRaw).replace(/[^0-9]/g, ''), 10) || 1,
      student_count: parseInt(String(countRaw).replace(/[^0-9]/g, ''), 10) || 35,
    });
  }
  return { found: true, records };
}

// 4. Read structured `courses` rows
function readCoursesTable(rows) {
  const match = findHeaderColMap(rows, COURSE_HEADER_ALIASES);
  if (!match || match.colMap.course_code === undefined || match.colMap.description === undefined) {
    return { found: false, records: [] };
  }
  const { headerRow, colMap } = match;
  const records = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const course_code = clean(row[colMap.course_code]);
    const description = clean(row[colMap.description]);
    if (!course_code) continue;

    const lecRaw = colMap.lec_hours !== undefined ? row[colMap.lec_hours] : '0';
    const labRaw = colMap.lab_hours !== undefined ? row[colMap.lab_hours] : '0';
    const progRaw = colMap.program_owner !== undefined ? row[colMap.program_owner] : 'BSIT';
    const yearRaw = colMap.year_level !== undefined ? row[colMap.year_level] : '1';
    const semRaw = colMap.semester !== undefined ? row[colMap.semester] : '1';
    const deptRaw = colMap.department_owner !== undefined ? row[colMap.department_owner] : '';

    records.push({
      course_code,
      description: description || course_code,
      lec_hours: Math.round(parseFloat(String(lecRaw).replace(/[^0-9.-]/g, '')) || 0),
      lab_hours: Math.round(parseFloat(String(labRaw).replace(/[^0-9.-]/g, '')) || 0),
      program_owner: clean(progRaw).toUpperCase() || 'BSIT',
      year_level: parseInt(String(yearRaw).replace(/[^0-9]/g, ''), 10) || 1,
      semester: parseInt(String(semRaw).replace(/[^0-9]/g, ''), 10) || 1,
      department_owner: clean(deptRaw) || '',
    });
  }
  return { found: true, records };
}

// 5. Read structured `timeslots` rows (preserves '7:00 AM', '1:00 PM', '8:00 PM')
function readTimeslotsTable(rows) {
  const match = findHeaderColMap(rows, TIMESLOTS_HEADER_ALIASES);
  if (!match || (match.colMap.timeslot_id === undefined && match.colMap.day === undefined)) {
    return { found: false, records: [] };
  }
  const { headerRow, colMap } = match;
  const records = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const timeslot_id = colMap.timeslot_id !== undefined ? clean(row[colMap.timeslot_id]) : '';
    const day = colMap.day !== undefined ? clean(row[colMap.day]) : 'Monday';
    if (!timeslot_id && !day) continue;

    const startRaw = colMap.start_time !== undefined ? row[colMap.start_time] : '7:00 AM';
    const endRaw = colMap.end_time !== undefined ? row[colMap.end_time] : '8:00 AM';
    const start_time = format12HourAmPm(startRaw, '7:00 AM', timeslot_id);
    const end_time = format12HourAmPm(endRaw, '8:00 AM', timeslot_id);

    const modality_rule =
      colMap.modality_rule !== undefined
        ? clean(row[colMap.modality_rule])
        : day.toLowerCase() === 'friday'
        ? 'Online'
        : 'F2F';

    records.push({
      timeslot_id: timeslot_id || `${day.substring(0, 3).toUpperCase()}-${start_time.replace(/[^0-9]/g, '').padStart(4, '0')}`,
      day,
      start_time,
      end_time,
      modality_rule: modality_rule || 'F2F',
    });
  }
  return { found: true, records };
}

function headersSeen(rows) {
  for (const row of rows.slice(0, HEADER_SCAN_ROWS)) {
    const names = row.map(clean).filter(Boolean);
    if (names.length) return names.slice(0, 9);
  }
  return [];
}

function readTabColumn({ buffer, fileName, tab }) {
  const label = COLUMN_BY_TAB[tab];
  if (!label) throw new UploadError(`Unknown data type "${tab}".`);

  const kind = detectKind(buffer, fileName);

  let sheets;
  try {
    sheets = loadSheets(buffer, kind);
  } catch {
    throw new UploadError('The file could not be read. Make sure it is a valid CSV or Excel file.');
  }

  if (kind === 'excel') {
    const compile = sheets.filter((s) => s.name.trim().toLowerCase() === REQUIRED_SHEET.toLowerCase());
    if (compile.length > 0) {
      sheets = compile;
    }
  }

  // =========================================================
  // TRY MULTI-COLUMN STRUCTURED TABLE PARSER FIRST
  // =========================================================
  const tableReaderMap = {
    faculty: readFacultyTable,
    rooms: readRoomsTable,
    sections: readSectionsTable,
    courses: readCoursesTable,
    timeslots: readTimeslotsTable,
  };

  const readerFn = tableReaderMap[tab];
  if (readerFn) {
    let foundStructured = false;
    const allRecords = [];

    for (const sheet of sheets) {
      const { found, records } = readerFn(sheet.rows);
      if (found) {
        foundStructured = true;
        allRecords.push(...records);
      }
    }

    if (foundStructured && allRecords.length > 0) {
      const uniqueMap = new Map();
      let duplicatesInFile = 0;

      for (const item of allRecords) {
        let key = '';
        if (tab === 'courses') {
          key = `${item.course_code.toLowerCase()}__${item.program_owner.toLowerCase()}`;
        } else if (tab === 'faculty') {
          key = (item.faculty_id || item.name).toLowerCase();
        } else if (tab === 'rooms') {
          key = item.room_id.toLowerCase();
        } else if (tab === 'sections') {
          key = item.section_id.toLowerCase();
        } else if (tab === 'timeslots') {
          key = item.timeslot_id.toLowerCase();
        }

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        } else {
          duplicatesInFile++;
          if (tab === 'courses') {
            const prev = uniqueMap.get(key);
            if (!prev.department_owner && item.department_owner) {
              prev.department_owner = item.department_owner;
            }
          }
        }
      }

      return {
        label: SINGLE_COLUMN_FALLBACK[tab] || tab,
        isStructured: true,
        values: Array.from(uniqueMap.values()),
        duplicatesInFile,
      };
    }
  }

  // =========================================================
  // FALLBACK: SINGLE-COLUMN HANDLER
  // =========================================================
  const fallbackHeader = SINGLE_COLUMN_FALLBACK[tab] || label;
  let foundAnywhere = false;
  const all = [];
  for (const sheet of sheets) {
    const { found, values } = readColumn(sheet.rows, fallbackHeader);
    if (found) {
      foundAnywhere = true;
      all.push(...values);
    }
  }

  if (!foundAnywhere) {
    const seen = sheets.length ? headersSeen(sheets[0].rows) : [];
    const hint = seen.length ? ` Columns found: ${seen.join(', ')}.` : '';
    throw new UploadError(`Required columns (${label}) not found in the file.${hint}`);
  }

  const seenKeys = new Set();
  const values = [];
  for (const v of all) {
    const key = v.toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      values.push(v);
    }
  }

  if (values.length === 0) throw new UploadError(`The uploaded file has no data rows.`);

  return {
    label: fallbackHeader,
    isStructured: false,
    values,
    duplicatesInFile: all.length - values.length,
  };
}

module.exports = {
  readTabColumn,
  UploadError,
  COLUMN_BY_TAB,
  ALLOWED_EXTENSIONS,
  REQUIRED_SHEET,
  extensionOf,
};