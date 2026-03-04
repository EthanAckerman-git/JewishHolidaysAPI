/**
 * Jewish Holidays API
 * @author Ethan Ackerman
 * @description RESTful API for Jewish holiday lookups, Shabbat detection,
 *   Sephardi/Ashkenazi tradition differences, shomer observance levels,
 *   and Gregorian-Hebrew date conversion.
 * @license MIT
 * @see https://github.com/EthanAckerman-git/JewishHolidaysAPI
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { HebrewCalendar, HDate } = require('@hebcal/core');

// ─── App Initialization ─────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(compression());

/** Rate limiter: 100 requests per minute per IP */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please wait before making more requests.',
    retryAfterSeconds: 60
  }
});
app.use(limiter);

// ─── Shared Constants ───────────────────────────────────────────────────────

/** Day-of-week lookup array (index matches Date.getDay()) */
const DAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday'
]);

/** Valid tradition query values */
const VALID_TRADITIONS = Object.freeze(['ashkenazi', 'sephardi', 'all']);

/** Valid shomer query values */
const VALID_SHOMER = Object.freeze(['shomer', 'non-shomer', 'partial', 'all']);

/** Valid Hebrew month names accepted by @hebcal/core */
const VALID_HEBREW_MONTHS = Object.freeze([
  'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar',
  'Adar I', 'Adar II'
]);

/** All available API endpoint paths */
const AVAILABLE_ENDPOINTS = Object.freeze([
  '/api/is-holiday',
  '/api/holidays/:hebrewYear',
  '/api/gregorian-holidays/:year',
  '/api/upcoming',
  '/api/convert/to-hebrew',
  '/api/convert/to-gregorian'
]);

// ─── Holiday Classification Data ────────────────────────────────────────────

/**
 * Holiday categories used for shomer/non-shomer work-restriction filtering.
 * Each key maps to an array of holiday name strings as rendered by @hebcal/core.
 */
const HOLIDAY_CATEGORIES = Object.freeze({
  majorYomTov: Object.freeze([
    'Pesach I', 'Pesach II', 'Pesach VII', 'Pesach VIII',
    'Shavuot I', 'Shavuot II',
    'Sukkot I', 'Sukkot II', 'Shmini Atzeret', 'Simchat Torah',
    'Rosh Hashana I', 'Rosh Hashana II', 'Yom Kippur'
  ]),
  cholHamoed: Object.freeze([
    'Pesach III', 'Pesach IV', 'Pesach V', 'Pesach VI',
    'Sukkot III', 'Sukkot IV', 'Sukkot V', 'Sukkot VI', 'Sukkot VII'
  ]),
  minorHolidays: Object.freeze([
    'Purim', 'Shushan Purim', 'Chanukah', 'Tu BiShvat', 'Lag BaOmer',
    "Tu B'Av", 'Yom HaAtzmaut', 'Yom Yerushalayim', 'Yom HaShoah',
    'Yom HaZikaron', 'Sigd'
  ]),
  fastDays: Object.freeze([
    "Ta'anit Bechorot", "Ta'anit Esther", "Tisha B'Av",
    'Tzom Gedaliah', 'Asara BTeves', "Shiva Asar B'Tammuz"
  ]),
  roshChodesh: Object.freeze(['Rosh Chodesh']),
  shabbat: Object.freeze(['Shabbat'])
});

/** Restriction details keyed by shomer observance level */
const SHABBAT_OBSERVANCE = Object.freeze({
  shomer: Object.freeze({
    noWork: true,
    noElectronics: true,
    noDriving: true,
    noCooking: true,
    noMoney: true,
    description: 'Full Shabbat observance - no melacha (creative work)'
  }),
  'non-shomer': Object.freeze({
    noWork: false,
    noElectronics: false,
    noDriving: false,
    noCooking: false,
    noMoney: false,
    description: 'No religious restrictions - may choose to attend synagogue'
  }),
  partial: Object.freeze({
    noWork: 'optional',
    noElectronics: 'partial',
    noDriving: 'avoid',
    noCooking: false,
    noMoney: 'avoid',
    description: 'Partial observance - varies by individual practice'
  })
});

/** Tradition-specific differences between Sephardi and Ashkenazi customs */
const TRADITION_DIFFERENCES = Object.freeze({
  pesach: Object.freeze({
    kitniyot: Object.freeze({
      ashkenazi: 'Forbidden (no rice, beans, corn)',
      sephardi: 'Permitted (rice, beans, corn allowed)'
    })
  }),
  sukkot: Object.freeze({
    ushpizin: Object.freeze({
      ashkenazi: 'Traditional order of guests',
      sephardi: 'May include additional spiritual guests'
    })
  }),
  chanukah: Object.freeze({
    candleLighting: Object.freeze({
      ashkenazi: 'Right to left, sufficient lighting',
      sephardi: 'All candles each night, left to right'
    })
  }),
  shabbat: Object.freeze({
    minhag: Object.freeze({
      ashkenazi: 'Shalom Aleichem, Eshet Chayil',
      sephardi: 'Different zemirot, customs'
    })
  })
});

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD date string into a Date object.
 * Returns the current date when no string is provided.
 * @param {string|undefined} dateStr - Date in YYYY-MM-DD format
 * @returns {{ date: Date|null, error: string|null }}
 */
function parseDate(dateStr) {
  if (!dateStr) return { date: new Date(), error: null };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { date: null, error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  return { date: d, error: null };
}

/**
 * Validate the `tradition` and `shomer` query parameters.
 * @param {string} tradition
 * @param {string} shomer
 * @returns {string|null} Error message, or null if valid.
 */
function validateQueryParams(tradition, shomer) {
  if (!VALID_TRADITIONS.includes(tradition)) {
    return 'Invalid tradition parameter. Must be: ashkenazi, sephardi, or all';
  }
  if (!VALID_SHOMER.includes(shomer)) {
    return 'Invalid shomer parameter. Must be: shomer, non-shomer, partial, or all';
  }
  return null;
}

/**
 * Format a Gregorian Date as an ISO date string (YYYY-MM-DD).
 * @param {Date} d
 * @returns {string}
 */
function toISODate(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Safely retrieve holidays on a given Hebrew date.
 * @param {HDate} hd
 * @returns {import('@hebcal/core').Event[]}
 */
function safeGetHolidays(hd) {
  return HebrewCalendar.getHolidaysOnDate(hd) || [];
}

/**
 * Categorize a rendered holiday name for work-restriction filtering.
 * @param {string} holidayName - The rendered holiday name from @hebcal/core
 * @returns {{ category: string, workForbidden: boolean, level: string }}
 */
function categorizeHoliday(holidayName) {
  if (HOLIDAY_CATEGORIES.shabbat.includes(holidayName)) {
    return { category: 'shabbat', workForbidden: true, level: 'strict' };
  }
  if (HOLIDAY_CATEGORIES.majorYomTov.some(h => holidayName.includes(h.replace(/ I$/, '').replace(/ II$/, '')))) {
    return { category: 'yom-tov', workForbidden: true, level: 'strict' };
  }
  if (HOLIDAY_CATEGORIES.cholHamoed.some(h => holidayName.includes(h.replace(/ III$/, '').replace(/ IV$/, '').replace(/ V$/, '').replace(/ VI$/, '').replace(/ VII$/, '')))) {
    return { category: 'chol-hamoed', workForbidden: false, level: 'intermediate' };
  }
  if (HOLIDAY_CATEGORIES.minorHolidays.includes(holidayName)) {
    return { category: 'minor', workForbidden: false, level: 'permissive' };
  }
  if (HOLIDAY_CATEGORIES.fastDays.includes(holidayName)) {
    return { category: 'fast', workForbidden: false, level: 'restrictive' };
  }
  if (HOLIDAY_CATEGORIES.roshChodesh.includes(holidayName)) {
    return { category: 'rosh-chodesh', workForbidden: false, level: 'permissive' };
  }
  return { category: 'other', workForbidden: false, level: 'unknown' };
}

/**
 * Return tradition-specific custom info for a given holiday basename.
 * @param {string} basename - e.g. "Pesach", "Chanukah"
 * @param {string} tradition - "ashkenazi", "sephardi", or "all"
 * @returns {Object|null}
 */
function getTraditionSpecificInfo(basename, tradition) {
  if (tradition === 'all') return null;
  const key = basename.toLowerCase().replace(/\s+/g, '');
  const info = TRADITION_DIFFERENCES[key];
  if (!info) return null;
  const result = {};
  for (const [aspect, details] of Object.entries(info)) {
    result[aspect] = details[tradition];
  }
  return result;
}

/**
 * Format a hebcal Event into a standardised holiday object.
 * Shared by /holidays, /gregorian-holidays, and /upcoming endpoints.
 * @param {import('@hebcal/core').Event} event
 * @param {string} tradition
 * @param {Object} [extra] - Additional fields to merge (e.g. daysFromNow)
 * @returns {Object}
 */
function formatHolidayEvent(event, tradition, extra = {}) {
  const holidayName = event.render();
  const categoryInfo = categorizeHoliday(holidayName);
  const gregDate = event.date.greg();
  return {
    name: holidayName,
    basename: event.basename(),
    hebrewDate: event.date.render('he'),
    gregorianDate: toISODate(gregDate),
    dayOfWeek: DAY_NAMES[gregDate.getDay()],
    category: categoryInfo.category,
    level: categoryInfo.level,
    workForbidden: categoryInfo.workForbidden,
    traditionSpecific: getTraditionSpecificInfo(event.basename(), tradition),
    ...extra
  };
}

/**
 * Build a full holiday-check result for the /is-holiday endpoint.
 * @param {HDate} hebrewDate
 * @param {{ tradition: string, shomer: string }} options
 * @returns {Object}
 */
function checkHoliday(hebrewDate, options = {}) {
  const { tradition = 'all', shomer = 'all' } = options;
  const events = safeGetHolidays(hebrewDate);
  const isSabbath = hebrewDate.getDay() === 6;

  if (isSabbath) {
    const shomerLevel = shomer === 'all' ? 'shomer' : shomer;
    const observance = SHABBAT_OBSERVANCE[shomerLevel] || SHABBAT_OBSERVANCE.shomer;
    return {
      isHoliday: true,
      isShabbat: true,
      isYomTov: false,
      holidayName: 'Shabbat',
      description: 'Day of rest',
      hebrewDate: hebrewDate.render('he'),
      gregorianDate: toISODate(hebrewDate.greg()),
      dayOfWeek: 'Saturday',
      tradition,
      shomer,
      category: 'shabbat',
      restrictions: observance,
      workForbidden: shomer === 'shomer',
      otherHolidays: events.map(e => e.render())
    };
  }

  if (events.length === 0) {
    return {
      isHoliday: false,
      isShabbat: false,
      isYomTov: false,
      holidayName: null,
      hebrewDate: hebrewDate.render('he'),
      gregorianDate: toISODate(hebrewDate.greg()),
      tradition,
      shomer,
      restrictions: null
    };
  }

  const holiday = events[0];
  const holidayName = holiday.render();
  const basename = holiday.basename();
  const categoryInfo = categorizeHoliday(holidayName);

  let workForbidden = categoryInfo.workForbidden;
  if (shomer === 'non-shomer') {
    workForbidden = false;
  } else if (shomer === 'partial') {
    workForbidden = categoryInfo.level === 'strict' ? 'discouraged' : false;
  }

  return {
    isHoliday: true,
    isShabbat: false,
    isYomTov: categoryInfo.category === 'yom-tov',
    holidayName,
    basename,
    description: holidayName,
    hebrewDate: hebrewDate.render('he'),
    gregorianDate: toISODate(hebrewDate.greg()),
    tradition,
    shomer,
    category: categoryInfo.category,
    level: categoryInfo.level,
    workForbidden,
    restrictions: shomer !== 'all' ? SHABBAT_OBSERVANCE[shomer] : null,
    traditionSpecific: getTraditionSpecificInfo(basename, tradition),
    allHolidays: events.map(e => e.render())
  };
}

/**
 * Build a Hebrew-date detail object (used by both convert endpoints).
 * @param {HDate} hd
 * @returns {Object}
 */
function buildHebrewDateDetail(hd) {
  return {
    day: hd.getDate(),
    month: hd.getMonthName(),
    year: hd.getFullYear(),
    rendered: hd.render('en'),
    renderedHebrew: hd.render('he')
  };
}

/**
 * Set cache headers for deterministic responses (date conversions, yearly lists).
 * Caches publicly for 1 hour; stale-while-revalidate for 24 h.
 * @param {import('express').Response} res
 */
function setCacheHeaders(res) {
  res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/**
 * GET /api/is-holiday
 * Check if a specific date is a Jewish holiday or Shabbat.
 */
app.get('/api/is-holiday', (req, res) => {
  try {
    const { date, tradition = 'all', shomer = 'all' } = req.query;

    const paramError = validateQueryParams(tradition, shomer);
    if (paramError) return res.status(400).json({ error: paramError });

    const { date: targetDate, error: dateError } = parseDate(date);
    if (dateError) return res.status(400).json({ error: dateError });

    const hebrewDate = new HDate(targetDate);
    const result = checkHoliday(hebrewDate, { tradition, shomer });

    if (date) setCacheHeaders(res);
    res.json(result);
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/holidays/:hebrewYear
 * Get all holidays for a given Hebrew year (5000-6000).
 */
app.get('/api/holidays/:hebrewYear', (req, res) => {
  try {
    const { tradition = 'all', shomer = 'all' } = req.query;
    const year = parseInt(req.params.hebrewYear, 10);

    if (isNaN(year) || year < 5000 || year > 6000) {
      return res.status(400).json({ error: 'Invalid Hebrew year. Use years 5000-6000' });
    }

    const events = HebrewCalendar.calendar({
      year, isHebrewYear: true,
      candlelighting: false, sedrot: false, omer: false
    });

    const holidays = events.map(e => formatHolidayEvent(e, tradition));

    setCacheHeaders(res);
    res.json({ hebrewYear: year, tradition, shomer, count: holidays.length, holidays });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/gregorian-holidays/:year
 * Get all holidays for a given Gregorian year (1900-2100).
 */
app.get('/api/gregorian-holidays/:year', (req, res) => {
  try {
    const { tradition = 'all', shomer = 'all' } = req.query;
    const gregYear = parseInt(req.params.year, 10);

    if (isNaN(gregYear) || gregYear < 1900 || gregYear > 2100) {
      return res.status(400).json({ error: 'Invalid year. Use 1900-2100' });
    }

    const events = HebrewCalendar.calendar({
      year: gregYear, isHebrewYear: false,
      candlelighting: false, sedrot: false, omer: false
    });

    const holidays = events.map(e => formatHolidayEvent(e, tradition));

    setCacheHeaders(res);
    res.json({ gregorianYear: gregYear, tradition, shomer, count: holidays.length, holidays });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/upcoming
 * Get upcoming holidays within a day range (1-365, default 30).
 */
app.get('/api/upcoming', (req, res) => {
  try {
    const { days = 30, tradition = 'all', shomer = 'all' } = req.query;
    const daysAhead = parseInt(days, 10);

    if (isNaN(daysAhead) || daysAhead < 1 || daysAhead > 365) {
      return res.status(400).json({ error: 'Invalid days parameter. Use 1-365' });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + daysAhead);

    const events = HebrewCalendar.calendar({
      start: today, end: endDate,
      candlelighting: false, sedrot: false, omer: false
    });

    const upcoming = events.map(event => {
      const eventDate = event.date.greg();
      const daysFromNow = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      return formatHolidayEvent(event, tradition, {
        workForbidden: shomer === 'non-shomer'
          ? false
          : categorizeHoliday(event.render()).workForbidden,
        daysFromNow
      });
    });

    res.json({
      from: toISODate(today),
      to: toISODate(endDate),
      tradition, shomer,
      count: upcoming.length,
      holidays: upcoming
    });
  } catch (error) {
    console.error('Error getting upcoming holidays:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/convert/to-hebrew
 * Convert a Gregorian date (YYYY-MM-DD) to a Hebrew date.
 */
app.get('/api/convert/to-hebrew', (req, res) => {
  try {
    const { date: targetDate, error: dateError } = parseDate(req.query.date);
    if (dateError) return res.status(400).json({ error: dateError });

    const hd = new HDate(targetDate);
    const events = safeGetHolidays(hd);

    setCacheHeaders(res);
    res.json({
      gregorianDate: toISODate(targetDate),
      hebrewDate: buildHebrewDateDetail(hd),
      dayOfWeek: DAY_NAMES[targetDate.getDay()],
      isShabbat: targetDate.getDay() === 6,
      holidays: events.map(e => e.render())
    });
  } catch (error) {
    console.error('Error converting to Hebrew date:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/convert/to-gregorian
 * Convert a Hebrew date (year + month name + day) to a Gregorian date.
 */
app.get('/api/convert/to-gregorian', (req, res) => {
  try {
    const { year, month, day } = req.query;

    if (!year || !month || !day) {
      return res.status(400).json({
        error: 'Missing required parameters: year, month, day',
        example: '/api/convert/to-gregorian?year=5785&month=Nisan&day=15'
      });
    }

    const hYear = parseInt(year, 10);
    const hDay = parseInt(day, 10);

    if (isNaN(hYear) || hYear < 3761 || hYear > 6000) {
      return res.status(400).json({ error: 'Invalid Hebrew year. Use years 3761-6000' });
    }
    if (isNaN(hDay) || hDay < 1 || hDay > 30) {
      return res.status(400).json({ error: 'Invalid day. Use 1-30' });
    }
    if (!VALID_HEBREW_MONTHS.includes(month)) {
      return res.status(400).json({
        error: `Invalid month. Valid months: ${VALID_HEBREW_MONTHS.join(', ')}`
      });
    }

    const hd = new HDate(hDay, month, hYear);
    const gregDate = hd.greg();
    const events = safeGetHolidays(hd);

    setCacheHeaders(res);
    res.json({
      hebrewDate: buildHebrewDateDetail(hd),
      gregorianDate: toISODate(gregDate),
      dayOfWeek: DAY_NAMES[gregDate.getDay()],
      isShabbat: gregDate.getDay() === 6,
      holidays: events.map(e => e.render())
    });
  } catch (error) {
    console.error('Error converting to Gregorian date:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ─── Root / API Documentation ───────────────────────────────────────────────

/** GET / — Returns machine-readable API documentation */
app.get('/', (req, res) => {
  res.json({
    name: 'Jewish Holidays API',
    version: '2.0.0',
    author: 'Ethan Ackerman',
    repository: 'https://github.com/EthanAckerman-git/JewishHolidaysAPI',
    description: 'Check if a date is a Jewish holiday with Sephardi/Ashkenazi traditions and shomer/non-shomer observance levels',
    endpoints: {
      '/api/is-holiday': {
        method: 'GET',
        description: 'Check if a specific date is a Jewish holiday or Shabbat',
        parameters: {
          date: 'YYYY-MM-DD (optional, defaults to today)',
          tradition: 'ashkenazi | sephardi | all (default: all)',
          shomer: 'shomer | non-shomer | partial | all (default: all)'
        },
        example: '/api/is-holiday?date=2025-10-03&tradition=ashkenazi&shomer=shomer'
      },
      '/api/holidays/:hebrewYear': {
        method: 'GET',
        description: 'Get all holidays for a Hebrew year',
        parameters: {
          hebrewYear: 'Hebrew year (5000-6000)',
          tradition: 'ashkenazi | sephardi | all (optional)',
          shomer: 'shomer | non-shomer | partial | all (optional)'
        },
        example: '/api/holidays/5785?tradition=sephardi'
      },
      '/api/gregorian-holidays/:year': {
        method: 'GET',
        description: 'Get all holidays for a Gregorian year',
        parameters: {
          year: 'Gregorian year (1900-2100)',
          tradition: 'ashkenazi | sephardi | all (optional)',
          shomer: 'shomer | non-shomer | partial | all (optional)'
        },
        example: '/api/gregorian-holidays/2025'
      },
      '/api/upcoming': {
        method: 'GET',
        description: 'Get upcoming holidays within a day range',
        parameters: {
          days: 'Number of days ahead (1-365, default 30)',
          tradition: 'ashkenazi | sephardi | all (optional)',
          shomer: 'shomer | non-shomer | partial | all (optional)'
        },
        example: '/api/upcoming?days=60&shomer=shomer'
      },
      '/api/convert/to-hebrew': {
        method: 'GET',
        description: 'Convert a Gregorian date to a Hebrew date',
        parameters: {
          date: 'YYYY-MM-DD (optional, defaults to today)'
        },
        example: '/api/convert/to-hebrew?date=2025-04-13'
      },
      '/api/convert/to-gregorian': {
        method: 'GET',
        description: 'Convert a Hebrew date to a Gregorian date',
        parameters: {
          year: 'Hebrew year (e.g. 5785)',
          month: 'Hebrew month name (e.g. Nisan, Tishrei, Adar)',
          day: 'Day of the month (1-30)'
        },
        example: '/api/convert/to-gregorian?year=5785&month=Nisan&day=15'
      }
    },
    shomerLevels: {
      shomer: 'Full Shabbat/Yom Tov observance - no work, electronics, driving, cooking',
      'non-shomer': 'No religious restrictions - may attend synagogue, normal activities',
      partial: 'Partial observance - varies by individual (some restrictions, personal choice)',
      all: 'Returns information for all observance levels'
    },
    traditions: {
      ashkenazi: 'Eastern European Jewish traditions',
      sephardi: 'Mediterranean/Middle Eastern Jewish traditions',
      all: 'Returns information for all traditions'
    },
    rateLimit: '100 requests per minute per IP'
  });
});

// ─── Error Handling ─────────────────────────────────────────────────────────

/** 404 handler — catches all unmatched routes */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
    availableEndpoints: AVAILABLE_ENDPOINTS
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Jewish Holidays API v2.0.0 by Ethan Ackerman`);
  console.log(`Listening on port ${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/`);
});
