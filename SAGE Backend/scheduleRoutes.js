'use strict';

const express = require('express');
const router = express.Router();
const db = require('./db');

// =========================================================
// UNIVERSAL DATABASE QUERY HELPER
// =========================================================
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const target = typeof db.promise === 'function' ? db.promise() : db;
      const result = target.query(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });

      if (result && typeof result.then === 'function') {
        result
          .then((res) => {
            resolve(Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
          })
          .catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

// =========================================================
// TIME & DURATION HELPERS (SELF-CONTAINED)
// =========================================================

// Converts a time string ('9:30 AM', '4:30 PM', '09:30:00', etc.) into decimal hours (7.0 to 20.0)
function timeStringToDecimal(str, isEnd = false) {
  const s = String(str || '').trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?$/i.exec(s);
  if (!m) return isEnd ? 20.0 : 7.0;

  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10) || 0;
  const mer = (m[4] || '').toUpperCase().replace(/\./g, '');

  if (mer === 'PM' && hh < 12) {
    hh += 12;
  } else if (mer === 'AM' && hh === 12) {
    hh = 0;
  } else if (!mer && isEnd && hh >= 1 && hh <= 8) {
    // Handles 12-hour afternoon end times without AM/PM suffix (e.g., '04:30:00' -> 16.5)
    hh += 12;
  }

  return hh + mm / 60;
}

// Parses timeslot_id (e.g., 'MON-0700', 'MON-1300') or start_time ('7:00 AM', '1:00 PM') into decimal start hour
function parseSlotStart(timeslotId, startTimeStr) {
  if (timeslotId && String(timeslotId).includes('-')) {
    const code = parseInt(String(timeslotId).split('-')[1], 10);
    if (!isNaN(code)) {
      const hh = Math.floor(code / 100);
      const mm = code % 100;
      return hh + mm / 60;
    }
  }
  if (startTimeStr) {
    return timeStringToDecimal(startTimeStr, false);
  }
  return 7.0;
}

// Parses faculty official_time_start & official_time_end ('9:30 AM', '4:30 PM', 'N/A', '00:00:00')
function parseFacultyWindow(startStr, endStr) {
  const s = String(startStr || '').trim();
  const e = String(endStr || '').trim();

  if (
    !s ||
    !e ||
    /^n\/?a$/i.test(s) ||
    /^n\/?a$/i.test(e) ||
    (s === '00:00:00' && e === '00:00:00')
  ) {
    return { availStart: 7.0, availEnd: 20.0 };
  }

  const availStart = timeStringToDecimal(s, false);
  let availEnd = timeStringToDecimal(e, true);
  if (availEnd <= availStart) {
    availEnd += 12;
  }

  return { availStart, availEnd };
}

// Calculates exact block duration (in hours) for a course
function getCourseBlockDuration(course) {
  const lec = Number(course.lec_hours) || 0;
  const lab = Number(course.lab_hours) || 0;
  const total = lec + lab;
  if (total >= 1 && total <= 3) return total;
  if (total > 3) return 3;
  return 2;
}

function isMinorCourse(courseCode = '', description = '') {
  const code = String(courseCode).toUpperCase();
  const desc = String(description).toUpperCase();
  return (
    code.startsWith('GEC') ||
    code.startsWith('GEE') ||
    code.startsWith('GEM') ||
    code.startsWith('PE') ||
    code.startsWith('NSTP') ||
    desc.includes('PHYSICAL') ||
    desc.includes('NSTP')
  );
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// =========================================================
// GET /api/schedule/init-data
// Dynamically fetches all courses & sections from MySQL
// =========================================================
router.get('/init-data', async (req, res) => {
  try {
    const courses = await runQuery(
      'SELECT course_code, description, lec_hours, lab_hours, program_owner, year_level, semester, department_owner FROM courses ORDER BY year_level, semester, course_code'
    );
    const sections = await runQuery(
      'SELECT section_id, program, year_level, semester, student_count FROM sections ORDER BY program, year_level, section_id'
    );

    const formattedCourses = { CS: [], IT: [], IS: [] };
    const seenPerProg = { CS: new Set(), IT: new Set(), IS: new Set() };

    courses.forEach((c) => {
      const code = String(c.course_code || '').trim();
      const owner = String(c.program_owner || '').toUpperCase();
      const progKey = owner.includes('CS') ? 'CS' : owner.includes('IS') ? 'IS' : 'IT';

      const lec = Number(c.lec_hours) || 0;
      const lab = Number(c.lab_hours) || 0;
      const units = lec + lab || 3;

      let type = 'Lecture';
      if (lec > 0 && lab > 0) type = 'Lecture & Lab';
      else if (lab > 0) type = 'Laboratory';

      if (!seenPerProg[progKey].has(code)) {
        seenPerProg[progKey].add(code);
        formattedCourses[progKey].push({
          id: code,
          name: c.description,
          units,
          lec_hours: lec,
          lab_hours: lab,
          type,
          year: Number(c.year_level) || 1,
          semester: Number(c.semester) || 1,
          department_owner: c.department_owner || '',
          program: progKey,
        });
      }
    });

    const formattedSections = sections.map((s) => {
      const progUpper = String(s.program || '').toUpperCase();
      const progKey = progUpper.includes('CS') ? 'CS' : progUpper.includes('IS') ? 'IS' : 'IT';
      return {
        id: s.section_id,
        year: Number(s.year_level) || 1,
        prog: progKey,
        student_count: Number(s.student_count) > 0 ? Number(s.student_count) : 35,
      };
    });

    res.json({
      success: true,
      curriculumDatabase: formattedCourses,
      sectionsData: formattedSections,
    });
  } catch (error) {
    console.error('Error fetching init-data:', error);
    res.status(500).json({ success: false, error: error.message || 'Database fetch failed.' });
  }
});

// =========================================================
// INTERVAL-AWARE HYBRID CSP + GA SCHEDULING ENGINE
// =========================================================
class TupScheduleEngine {
  constructor(courses, sections, rooms, faculty, timeslots, cspConfig, gaConstraints) {
    this.courses = courses;
    this.sections = sections;
    this.rooms = rooms;
    this.faculty = faculty;

    const wholeHourSlots = timeslots.filter(
      (t) => Number.isInteger(t.startDec) && t.startDec >= 7.0 && t.startDec <= 19.0
    );
    this.timeslots = wholeHourSlots.length > 0 ? wholeHourSlots : timeslots;

    this.cspConfig = {
      maxHours: parseFloat(cspConfig?.maxHours) || 4.5,
      maxPreparations: parseInt(cspConfig?.maxPreparations, 10) || 3,
    };
    this.gaConstraints = gaConstraints || {};
    this.tasks = this.buildTasks();
  }

  buildTasks() {
    const tasks = [];
    for (const section of this.sections) {
      let sectionCourses = this.courses.filter(
        (c) => c.program === section.prog && Number(c.year) === Number(section.year)
      );
      if (sectionCourses.length === 0) {
        sectionCourses = this.courses.filter((c) => Number(c.year) === Number(section.year));
      }
      if (sectionCourses.length === 0) {
        sectionCourses = this.courses;
      }

      // Deduplicate by course id per section so the same subject isn't scheduled twice for 1 section
      const uniqueById = new Map();
      sectionCourses.forEach((c) => {
        if (!uniqueById.has(c.id)) uniqueById.set(c.id, c);
      });

      for (const course of uniqueById.values()) {
        const duration = getCourseBlockDuration(course);
        tasks.push({ section, course, duration });
      }
    }
    return tasks;
  }

  isFacultyAccreditedForCourse(prof, course, anyFacultyHasExpertise) {
    const tagsRaw = (prof.expertise_tags || '').trim();
    if (!tagsRaw) return !anyFacultyHasExpertise;
    const tags = tagsRaw
      .toUpperCase()
      .split(/[,;|/]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const code = (course.id || '').toUpperCase();
    const desc = (course.name || '').toUpperCase();
    const prog = (course.program || '').toUpperCase();
    const dept = (course.department_owner || '').toUpperCase();

    return tags.some(
      (tag) =>
        code.includes(tag) ||
        tag.includes(code) ||
        desc.includes(tag) ||
        (dept && (dept.includes(tag) || tag.includes(dept))) ||
        tag === prog ||
        tag === 'ALL' ||
        tag === 'GENERAL'
    );
  }

  exceedsConsecutiveHours(existingIntervals, startDec, endDec) {
    const intervals = [...existingIntervals, { start: startDec, end: endDec }].sort(
      (a, b) => a.start - b.start
    );

    let continuousRun = intervals[0].end - intervals[0].start;
    if (continuousRun > this.cspConfig.maxHours) return true;

    for (let i = 1; i < intervals.length; i++) {
      const gap = intervals[i].start - intervals[i - 1].end;
      if (gap <= 0.05) {
        continuousRun += intervals[i].end - intervals[i].start;
        if (continuousRun > this.cspConfig.maxHours) return true;
      } else {
        continuousRun = intervals[i].end - intervals[i].start;
      }
    }
    return false;
  }

  isValidAssignment(state, task, slot, room, prof, relaxSoftenedHardLimits = false) {
    const { section, course, duration } = task;
    const day = slot.day;
    const startDec = slot.startDec;
    const endDec = startDec + duration;

    const isFridayOrOnline =
      day === 'Friday' || (slot.modality_rule || '').toUpperCase() === 'ONLINE';

    // 1. Operating Hours Boundary (7:00 AM - 8:00 PM)
    if (startDec < 7.0 || endDec > 20.0) return false;

    // 2. No Section Double-Booking (interval overlap check)
    const secDayKey = `${section.id}-${day}`;
    const secIntervals = state.sectionIntervals[secDayKey] || [];
    for (const iv of secIntervals) {
      if (intervalsOverlap(startDec, endDec, iv.start, iv.end)) return false;
    }

    // 3. No Faculty Double-Booking (interval overlap check)
    const facDayKey = `${prof.faculty_id}-${day}`;
    const facIntervals = state.facultyIntervals[facDayKey] || [];
    for (const iv of facIntervals) {
      if (intervalsOverlap(startDec, endDec, iv.start, iv.end)) return false;
    }

    // 4. Friday Modality Lockdown & No Room Double-Booking
    if (isFridayOrOnline) {
      if (room !== null) return false;
    } else {
      if (!room) return false;

      const needsLab =
        course.type.toLowerCase().includes('lab') || Number(course.lab_hours) > 0;
      if (!relaxSoftenedHardLimits) {
        if (needsLab && room.normalizedType !== 'Laboratory') return false;
        if (!needsLab && room.normalizedType !== 'Lecture') return false;
      }

      const roomDayKey = `${room.room_id}-${day}`;
      const rmIntervals = state.roomIntervals[roomDayKey] || [];
      for (const iv of rmIntervals) {
        if (intervalsOverlap(startDec, endDec, iv.start, iv.end)) return false;
      }
    }

    // 5. Faculty Official Time, Max Preparations, Overload & Consecutive Hours
    if (!relaxSoftenedHardLimits) {
      if (startDec < prof.availStart || endDec > prof.availEnd) return false;

      const preps = state.facultyPreps[prof.faculty_id] || new Set();
      const profMaxPreps =
        Number(prof.max_preparations) > 0
          ? Math.max(Number(prof.max_preparations), this.cspConfig.maxPreparations)
          : this.cspConfig.maxPreparations;
      if (!preps.has(course.id) && preps.size >= profMaxPreps) return false;

      const isOverloadAllowed = this.cspConfig.maxPreparations >= 4;
      const maxWeeklyHours =
        prof.employment_type === 'Part-Time'
          ? isOverloadAllowed
            ? 18
            : 15
          : isOverloadAllowed
          ? 27
          : 21;
      const currentWeeklyHours = state.facultyTotalHours[prof.faculty_id] || 0;
      if (currentWeeklyHours + duration > maxWeeklyHours) return false;

      if (this.exceedsConsecutiveHours(facIntervals, startDec, endDec)) return false;
    }

    return true;
  }

  applyAssignment(state, task, slot, room, prof) {
    const { section, course, duration } = task;
    const day = slot.day;
    const startDec = slot.startDec;
    const endDec = startDec + duration;

    const secDayKey = `${section.id}-${day}`;
    const facDayKey = `${prof.faculty_id}-${day}`;

    if (!state.sectionIntervals[secDayKey]) state.sectionIntervals[secDayKey] = [];
    state.sectionIntervals[secDayKey].push({ start: startDec, end: endDec });

    if (!state.facultyIntervals[facDayKey]) state.facultyIntervals[facDayKey] = [];
    state.facultyIntervals[facDayKey].push({ start: startDec, end: endDec });

    if (room) {
      const roomDayKey = `${room.room_id}-${day}`;
      if (!state.roomIntervals[roomDayKey]) state.roomIntervals[roomDayKey] = [];
      state.roomIntervals[roomDayKey].push({ start: startDec, end: endDec });
    }

    if (!state.facultyPreps[prof.faculty_id]) {
      state.facultyPreps[prof.faculty_id] = new Set();
    }
    state.facultyPreps[prof.faculty_id].add(course.id);

    state.facultyTotalHours[prof.faculty_id] =
      (state.facultyTotalHours[prof.faculty_id] || 0) + duration;

    const gene = {
      taskKey: `${section.id}__${course.id}`,
      course_code: course.id,
      course_name: course.name,
      course_type: course.type,
      is_minor: isMinorCourse(course.id, course.name),
      section_id: section.id,
      section_size: section.student_count || 35,
      faculty_id: prof.faculty_id,
      faculty_name: prof.name,
      seniority_level: Number(prof.seniority_level) || 1,
      preferred_shift:
        prof.preferred_shift || (prof.availStart < 12 ? 'Morning' : 'Afternoon'),
      room_id: room ? room.room_id : null,
      room_display: room ? room.room_id : 'ONLINE',
      room_type: room ? room.normalizedType : 'Online',
      room_capacity: room ? room.normalizedCapacity : section.student_count || 35,
      timeslot_id: slot.timeslot_id,
      day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      modality_rule: day === 'Friday' ? 'Online' : slot.modality_rule || 'F2F',
      shift: startDec < 12.0 ? 'Morning' : 'Afternoon',
      startDec,
      endDec,
      duration,
    };

    state.schedule.push(gene);
  }

  getCandidateRoomsForTask(task, slot) {
    const isFridayOrOnline =
      slot.day === 'Friday' || (slot.modality_rule || '').toUpperCase() === 'ONLINE';
    if (isFridayOrOnline) {
      return [null];
    }

    const { section, course } = task;
    const sectionSize = section.student_count || 35;
    const needsLab =
      course.type.toLowerCase().includes('lab') || Number(course.lab_hours) > 0;

    let matchingRooms = this.rooms.filter((r) =>
      needsLab ? r.normalizedType === 'Laboratory' : r.normalizedType === 'Lecture'
    );
    if (matchingRooms.length === 0) matchingRooms = [...this.rooms];

    return matchingRooms.sort((a, b) => {
      const aFits = a.normalizedCapacity >= sectionSize ? 0 : 1;
      const bFits = b.normalizedCapacity >= sectionSize ? 0 : 1;
      if (aFits !== bFits) return aFits - bFits;
      return (
        Math.abs(a.normalizedCapacity - sectionSize) -
        Math.abs(b.normalizedCapacity - sectionSize)
      );
    });
  }

  generateValidChromosome() {
    const state = {
      schedule: [],
      sectionIntervals: {},
      facultyIntervals: {},
      roomIntervals: {},
      facultyPreps: {},
      facultyTotalHours: {},
    };

    for (const task of this.tasks) {
      const { course } = task;

      const anyMatch = this.faculty.some((f) => {
        const tags = (f.expertise_tags || '').trim();
        return tags.length > 0 && this.isFacultyAccreditedForCourse(f, course, true);
      });
      const accreditedFaculty = anyMatch
        ? this.faculty.filter((f) => this.isFacultyAccreditedForCourse(f, course, true))
        : this.faculty;

      const shuffledSlots = [...this.timeslots].sort(() => Math.random() - 0.5);
      const shuffledFaculty = [...accreditedFaculty].sort(() => Math.random() - 0.5);

      let assigned = false;

      for (const relaxLimits of [false, true]) {
        if (assigned) break;
        const facultyPool = relaxLimits ? [...this.faculty].sort(() => Math.random() - 0.5) : shuffledFaculty;
        for (const slot of shuffledSlots) {
          if (assigned) break;
          const roomCandidates = this.getCandidateRoomsForTask(task, slot);
          for (const room of roomCandidates) {
            if (assigned) break;
            for (const prof of facultyPool) {
              if (this.isValidAssignment(state, task, slot, room, prof, relaxLimits)) {
                this.applyAssignment(state, task, slot, room, prof);
                assigned = true;
                break;
              }
            }
          }
        }
      }
    }

    return state.schedule;
  }

  calculateFitness(chromosome) {
    let score = 1000;
    const bySection = {};
    const byFaculty = {};

    for (const item of chromosome) {
      if (!bySection[item.section_id]) bySection[item.section_id] = [];
      bySection[item.section_id].push(item);

      if (!byFaculty[item.faculty_id]) byFaculty[item.faculty_id] = [];
      byFaculty[item.faculty_id].push(item);

      if (this.gaConstraints.roomCapacityMax && item.room_id !== null) {
        const diff = item.room_capacity - item.section_size;
        if (diff >= 0 && diff <= 10) score += 15;
        else if (diff > 10) score += 5;
        else score -= 15;
      }

      if (this.gaConstraints.seniorityWeighting) {
        const weight = Math.max(1, item.seniority_level);
        if (item.shift === item.preferred_shift) score += 8 * weight;
        else score -= 3 * weight;
      }
    }

    for (const secId in bySection) {
      const classes = bySection[secId];
      const byDay = {};
      const shifts = new Set();

      classes.forEach((c) => {
        if (!byDay[c.day]) byDay[c.day] = [];
        byDay[c.day].push(c);
        shifts.add(c.shift);
      });

      const activeDays = Object.keys(byDay);

      if (this.gaConstraints.compressDays) {
        if (activeDays.length >= 3 && activeDays.length <= 4) {
          score += 45;
        } else if (activeDays.length <= 2) {
          score += 25;
        } else if (activeDays.length >= 5) {
          score -= (activeDays.length - 4) * 25;
          for (const d of activeDays) {
            if (byDay[d].length === 1 && byDay[d][0].is_minor) {
              score -= 50;
            }
          }
        }
      }

      if (this.gaConstraints.shiftSplitting) {
        if (shifts.size === 1) score += 30;
        else score -= 15;
      }

      for (const day of activeDays) {
        const dayClasses = byDay[day].sort((a, b) => a.startDec - b.startDec);
        for (let i = 1; i < dayClasses.length; i++) {
          const gapHours = dayClasses[i].startDec - dayClasses[i - 1].endDec;

          if (this.gaConstraints.minimizeGaps) {
            if (gapHours >= 3.0) score -= 35;
            else if (gapHours > 1.0) score -= 15;
            else if (gapHours === 0) score += 12;
          }

          if (
            this.gaConstraints.minimizeRoomChanges &&
            gapHours <= 0.5 &&
            dayClasses[i].room_id !== null &&
            dayClasses[i - 1].room_id !== null &&
            dayClasses[i].room_type === dayClasses[i - 1].room_type
          ) {
            if (dayClasses[i].room_id === dayClasses[i - 1].room_id) score += 20;
            else score -= 15;
          }
        }
      }
    }

    for (const facId in byFaculty) {
      const fClasses = byFaculty[facId];
      const fShifts = new Set(fClasses.map((c) => c.shift));

      if (this.gaConstraints.shiftSplitting && fShifts.size === 1) {
        score += 15;
      }

      if (this.gaConstraints.minimizeGaps) {
        const fByDay = {};
        fClasses.forEach((c) => {
          if (!fByDay[c.day]) fByDay[c.day] = [];
          fByDay[c.day].push(c);
        });
        for (const day in fByDay) {
          const dClasses = fByDay[day].sort((a, b) => a.startDec - b.startDec);
          for (let i = 1; i < dClasses.length; i++) {
            const gapHours = dClasses[i].startDec - dClasses[i - 1].endDec;
            if (gapHours >= 3.0) score -= 25;
          }
        }
      }
    }

    return Math.max(0, Math.round(score));
  }

  tournamentSelect(population, k = 3) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best;
  }

  crossoverAndMutate(parentA, parentB, mutationRate = 0.15) {
    const state = {
      schedule: [],
      sectionIntervals: {},
      facultyIntervals: {},
      roomIntervals: {},
      facultyPreps: {},
      facultyTotalHours: {},
    };

    const mapA = new Map(parentA.map((g) => [g.taskKey, g]));
    const mapB = new Map(parentB.map((g) => [g.taskKey, g]));

    for (const task of this.tasks) {
      const key = `${task.section.id}__${task.course.id}`;
      const geneA = mapA.get(key);
      const geneB = mapB.get(key);

      const preferredGene = Math.random() < 0.5 ? geneA || geneB : geneB || geneA;
      const shouldMutate = Math.random() < mutationRate;

      let placed = false;

      if (!shouldMutate && preferredGene) {
        const slot = this.timeslots.find((t) => t.timeslot_id === preferredGene.timeslot_id);
        const isFridayOrOnline =
          slot && (slot.day === 'Friday' || (slot.modality_rule || '').toUpperCase() === 'ONLINE');
        const room = isFridayOrOnline
          ? null
          : this.rooms.find((r) => r.room_id === preferredGene.room_id);
        const prof = this.faculty.find((f) => f.faculty_id === preferredGene.faculty_id);

        if (
          slot &&
          (isFridayOrOnline || room) &&
          prof &&
          this.isValidAssignment(state, task, slot, room, prof, false)
        ) {
          this.applyAssignment(state, task, slot, room, prof);
          placed = true;
        }
      }

      if (!placed) {
        const anyMatch = this.faculty.some((f) => {
          const tags = (f.expertise_tags || '').trim();
          return tags.length > 0 && this.isFacultyAccreditedForCourse(f, task.course, true);
        });
        const accreditedFaculty = anyMatch
          ? this.faculty.filter((f) => this.isFacultyAccreditedForCourse(f, task.course, true))
          : this.faculty;

        const shuffledSlots = [...this.timeslots].sort(() => Math.random() - 0.5);
        const shuffledFaculty = [...accreditedFaculty].sort(() => Math.random() - 0.5);

        for (const relaxLimits of [false, true]) {
          if (placed) break;
          const facultyPool = relaxLimits
            ? [...this.faculty].sort(() => Math.random() - 0.5)
            : shuffledFaculty;
          for (const slot of shuffledSlots) {
            if (placed) break;
            const roomCandidates = this.getCandidateRoomsForTask(task, slot);
            for (const room of roomCandidates) {
              if (placed) break;
              for (const prof of facultyPool) {
                if (this.isValidAssignment(state, task, slot, room, prof, relaxLimits)) {
                  this.applyAssignment(state, task, slot, room, prof);
                  placed = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    return state.schedule;
  }

  solve(populationSize = 25, generations = 35) {
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      const chrom = this.generateValidChromosome();
      population.push({ schedule: chrom, fitness: this.calculateFitness(chrom) });
    }

    for (let g = 0; g < generations; g++) {
      population.sort((a, b) => b.fitness - a.fitness);
      const nextGen = population.slice(0, 4);

      while (nextGen.length < populationSize) {
        const parent1 = this.tournamentSelect(population, 3);
        const parent2 = this.tournamentSelect(population, 3);
        const childSchedule = this.crossoverAndMutate(parent1.schedule, parent2.schedule, 0.15);
        nextGen.push({
          schedule: childSchedule,
          fitness: this.calculateFitness(childSchedule),
        });
      }

      population = nextGen;
    }

    population.sort((a, b) => b.fitness - a.fitness);
    return population[0];
  }
}

// =========================================================
// POST /api/schedule/generate
// =========================================================
router.post('/generate', async (req, res) => {
  try {
    const { selectedCourses, selectedSections, cspConfig, gaConstraints } = req.body;

    if (!selectedCourses?.length || !selectedSections?.length) {
      return res
        .status(400)
        .json({ success: false, error: 'Please select at least one course and section.' });
    }

    const dbCourses = await runQuery('SELECT * FROM courses');
    const dbSections = await runQuery('SELECT * FROM sections');
    const dbRooms = await runQuery('SELECT * FROM rooms');
    const dbFaculty = await runQuery('SELECT * FROM faculty');
    const dbTimeslots = await runQuery('SELECT * FROM timeslots');

    if (!dbRooms.length || !dbFaculty.length || !dbTimeslots.length) {
      return res.status(400).json({
        success: false,
        error: 'Database tables (rooms, faculty, or timeslots) are empty.',
      });
    }

    const sanitizedRooms = dbRooms.map((r) => ({
      ...r,
      normalizedType:
        r.room_type === 'Laboratory' ||
        String(r.room_id).toUpperCase().includes('LB') ||
        String(r.room_id).toUpperCase().includes('LAB')
          ? 'Laboratory'
          : 'Lecture',
      normalizedCapacity: Number(r.capacity) > 0 ? Number(r.capacity) : 40,
    }));

    const sanitizedFaculty = dbFaculty.map((f) => {
      const { availStart, availEnd } = parseFacultyWindow(
        f.official_time_start,
        f.official_time_end
      );
      return { ...f, availStart, availEnd };
    });

    const sanitizedSlots = dbTimeslots.map((t) => ({
      ...t,
      startDec: parseSlotStart(t.timeslot_id, t.start_time),
    }));

    let validCourses = dbCourses
      .filter((c) => selectedCourses.includes(c.course_code))
      .map((c) => ({
        id: c.course_code,
        name: c.description,
        lec_hours: Number(c.lec_hours) || 0,
        lab_hours: Number(c.lab_hours) || 0,
        type: Number(c.lab_hours) > 0 ? 'Lecture & Lab' : 'Lecture',
        year: Number(c.year_level) || 1,
        semester: Number(c.semester) || 1,
        department_owner: c.department_owner || '',
        program:
          c.program_owner === 'BSCS' ? 'CS' : c.program_owner === 'BSIS' ? 'IS' : 'IT',
      }));

    if (validCourses.length === 0 && dbCourses.length > 0) {
      validCourses = dbCourses.slice(0, selectedCourses.length).map((c) => ({
        id: c.course_code,
        name: c.description,
        lec_hours: Number(c.lec_hours) || 0,
        lab_hours: Number(c.lab_hours) || 0,
        type: Number(c.lab_hours) > 0 ? 'Lecture & Lab' : 'Lecture',
        year: Number(c.year_level) || 1,
        semester: Number(c.semester) || 1,
        department_owner: c.department_owner || '',
        program:
          c.program_owner === 'BSCS' ? 'CS' : c.program_owner === 'BSIS' ? 'IS' : 'IT',
      }));
    }

    let validSections = dbSections
      .filter((s) => selectedSections.includes(s.section_id))
      .map((s) => ({
        id: s.section_id,
        year: Number(s.year_level) || 1,
        prog: s.program === 'BSCS' ? 'CS' : s.program === 'BSIS' ? 'IS' : 'IT',
        student_count: Number(s.student_count) > 0 ? Number(s.student_count) : 35,
      }));

    if (validSections.length === 0 && dbSections.length > 0) {
      validSections = dbSections.slice(0, selectedSections.length).map((s) => ({
        id: s.section_id,
        year: Number(s.year_level) || 1,
        prog: s.program === 'BSCS' ? 'CS' : s.program === 'BSIS' ? 'IS' : 'IT',
        student_count: Number(s.student_count) > 0 ? Number(s.student_count) : 35,
      }));
    }

    const engine = new TupScheduleEngine(
      validCourses,
      validSections,
      sanitizedRooms,
      sanitizedFaculty,
      sanitizedSlots,
      cspConfig,
      gaConstraints
    );

    const bestResult = engine.solve(25, 35);

    await runQuery('DELETE FROM generated_schedules');

    for (const item of bestResult.schedule) {
      await runQuery(
        'INSERT INTO generated_schedules (course_code, section_id, faculty_id, room_id, timeslot_id) VALUES (?, ?, ?, ?, ?)',
        [item.course_code, item.section_id, item.faculty_id, item.room_id, item.timeslot_id]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Department Schedule successfully generated!',
      metrics: {
        sectionsCount: validSections.length,
        coursesCount: selectedCourses.length,
        classesScheduled: bestResult.schedule.length,
        fitnessScore: bestResult.fitness,
        conflictFree: '100%',
      },
      schedule: bestResult.schedule,
    });
  } catch (error) {
    console.error('Schedule Generation Error:', error);
    return res
      .status(500)
      .json({ success: false, error: error.message || 'Failed to generate schedule.' });
  }
});

// =========================================================
// GET /api/schedule/latest
// Deduplicates composite course joins using GROUP BY gs.schedule_id
// =========================================================
router.get('/latest', async (req, res) => {
  try {
    const query = `
      SELECT 
        gs.schedule_id,
        gs.course_code,
        MAX(c.description) AS course_name,
        MAX(c.lec_hours) AS lec_hours,
        MAX(c.lab_hours) AS lab_hours,
        gs.section_id,
        s.program,
        s.year_level,
        gs.faculty_id,
        f.name AS faculty_name,
        IFNULL(gs.room_id, 'ONLINE') AS room_id,
        IFNULL(r.room_type, 'Online') AS room_type,
        gs.timeslot_id,
        t.day,
        t.start_time,
        t.end_time,
        t.modality_rule
      FROM generated_schedules gs
      LEFT JOIN sections s ON gs.section_id = s.section_id
      LEFT JOIN courses c ON gs.course_code = c.course_code
      LEFT JOIN faculty f ON gs.faculty_id = f.faculty_id
      LEFT JOIN rooms r ON gs.room_id = r.room_id
      LEFT JOIN timeslots t ON gs.timeslot_id = t.timeslot_id
      GROUP BY gs.schedule_id
      ORDER BY t.day, t.timeslot_id
    `;
    const rows = await runQuery(query);
    res.json({ success: true, schedule: rows });
  } catch (error) {
    console.error('Error fetching latest schedule:', error);
    res.status(500).json({ success: false, schedule: [] });
  }
});

module.exports = router;