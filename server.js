const express = require('express');
const cors = require('cors');
const { HebrewCalendar, HDate, Location, Event, Zmanim } = require('@hebcal/core');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Holiday categories for shomer/non-shomer filtering
const HOLIDAY_CATEGORIES = {
  // Major holidays - no work for both shomer and non-shomer
  majorYomTov: [
    'Pesach I', 'Pesach II', 'Pesach VII', 'Pesach VIII',
    'Shavuot I', 'Shavuot II',
    'Sukkot I', 'Sukkot II', 'Shmini Atzeret', 'Simchat Torah',
    'Rosh Hashana I', 'Rosh Hashana II', 'Yom Kippur'
  ],
  // Chol Hamoed - intermediate days where work is permitted
  cholHamoed: [
    'Pesach III', 'Pesach IV', 'Pesach V', 'Pesach VI',
    'Sukkot III', 'Sukkot IV', 'Sukkot V', 'Sukkot VI', 'Sukkot VII'
  ],
  // Minor holidays - work permitted
  minorHolidays: [
    'Purim', 'Shushan Purim', 'Chanukah', 'Tu BiShvat', 'Lag BaOmer',
    "Tu B'Av", 'Yom HaAtzmaut', 'Yom Yerushalayim', 'Yom HaShoah',
    'Yom HaZikaron', 'Sigd'
  ],
  // Fast days - work permitted but restrictions apply
  fastDays: [
    "Ta'anit Bechorot", "Ta'anit Esther", "Tisha B'Av",
    'Tzom Gedaliah', 'Asara BTeves', "Shiva Asar B'Tammuz"
  ],
  // Rosh Chodesh - work permitted
  roshChodesh: ['Rosh Chodesh'],
  // Shabbat - always no work for shomer
  shabbat: ['Shabbat']
};

// Shabbat restrictions by shomer level
const SHABBAT_OBSERVANCE = {
  shomer: {
    noWork: true,
    noElectronics: true,
    noDriving: true,
    noCooking: true,
    noMoney: true,
    description: 'Full Shabbat observance - no melacha (creative work)'
  },
  'non-shomer': {
    noWork: false,
    noElectronics: false,
    noDriving: false,
    noCooking: false,
    noMoney: false,
    description: 'No religious restrictions - may choose to attend synagogue'
  },
  partial: {
    noWork: 'optional',
    noElectronics: 'partial',
    noDriving: 'avoid',
    noCooking: false,
    noMoney: 'avoid',
    description: 'Partial observance - varies by individual practice'
  }
};

// Tradition-specific holiday differences (Sephardi vs Ashkenazi)
const TRADITION_DIFFERENCES = {
  pesach: {
    kitniyot: {
      ashkenazi: 'Forbidden (no rice, beans, corn)',
      sephardi: 'Permitted (rice, beans, corn allowed)'
    }
  },
  sukkot: {
    ushpizin: {
      ashkenazi: 'Traditional order of guests',
      sephardi: 'May include additional spiritual guests'
    }
  },
  chanukah: {
    candleLighting: {
      ashkenazi: 'Right to left, sufficient lighting',
      sephardi: 'All candles each night, left to right'
    }
  },
  shabbat: {
    minhag: {
      ashkenazi: 'Shalom Aleichem, Eshet Chayil',
      sephardi: 'Different zemirot, customs'
    }
  }
};

/**
 * Categorize a holiday for shomer/non-shomer filtering
 * @param {string} holidayName
 * @returns {Object} Category info
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
 * Check if a Hebrew date is Shabbat
 * @param {HDate} hebrewDate
 * @returns {boolean}
 */
function isShabbat(hebrewDate) {
  return hebrewDate.getDay() === 6; // 6 = Saturday (Hebrew calendar: 0=Sun, 6=Sat)
}

/**
 * Check if a Hebrew date is a Jewish holiday
 * @param {HDate} hebrewDate
 * @param {Object} options
 * @returns {Object} Holiday information
 */
function checkHoliday(hebrewDate, options = {}) {
  const { tradition = 'all', shomer = 'all' } = options;
  
  const events = HebrewCalendar.getHolidaysOnDate(hebrewDate);
  const shabbat = isShabbat(hebrewDate);
  
  // Handle Shabbat
  if (shabbat) {
    const shomerLevel = shomer === 'all' ? 'shomer' : shomer;
    const observance = SHABBAT_OBSERVANCE[shomerLevel] || SHABBAT_OBSERVANCE.shomer;
    
    return {
      isHoliday: true,
      isShabbat: true,
      isYomTov: false,
      holidayName: 'Shabbat',
      description: 'Day of rest',
      hebrewDate: hebrewDate.render('he'),
      gregorianDate: hebrewDate.greg().toISOString().split('T')[0],
      dayOfWeek: 'Saturday',
      tradition: tradition,
      shomer: shomer,
      category: 'shabbat',
      restrictions: observance,
      workForbidden: shomer === 'shomer',
      otherHolidays: events.length > 0 ? events.map(e => e.render()) : []
    };
  }
  
  // No holidays
  if (!events || events.length === 0) {
    return {
      isHoliday: false,
      isShabbat: false,
      isYomTov: false,
      holidayName: null,
      hebrewDate: hebrewDate.render('he'),
      gregorianDate: hebrewDate.greg().toISOString().split('T')[0],
      tradition: tradition,
      shomer: shomer,
      restrictions: null
    };
  }

  const holiday = events[0];
  const holidayName = holiday.render();
  const basename = holiday.basename();
  const categoryInfo = categorizeHoliday(holidayName);
  
  // Determine if work is forbidden based on shomer level
  let workForbidden = categoryInfo.workForbidden;
  if (shomer === 'non-shomer') {
    workForbidden = false; // Non-shomer generally permits work on most days
  } else if (shomer === 'partial') {
    workForbidden = categoryInfo.level === 'strict' ? 'discouraged' : false;
  }

  return {
    isHoliday: true,
    isShabbat: false,
    isYomTov: categoryInfo.category === 'yom-tov',
    holidayName: holidayName,
    basename: basename,
    description: holiday.render(),
    hebrewDate: hebrewDate.render('he'),
    gregorianDate: hebrewDate.greg().toISOString().split('T')[0],
    tradition: tradition,
    shomer: shomer,
    category: categoryInfo.category,
    level: categoryInfo.level,
    workForbidden: workForbidden,
    restrictions: shomer !== 'all' ? SHABBAT_OBSERVANCE[shomer] : null,
    traditionSpecific: getTraditionSpecificInfo(basename, tradition),
    allHolidays: events.map(e => e.render())
  };
}

/**
 * Get tradition-specific holiday information
 * @param {string} holidayName
 * @param {string} tradition
 * @returns {Object|null}
 */
function getTraditionSpecificInfo(holidayName, tradition) {
  if (tradition === 'all') return null;
  
  const key = holidayName.toLowerCase().replace(/\s+/g, '');
  const info = TRADITION_DIFFERENCES[key];
  
  if (!info) return null;
  
  const result = {};
  for (const [aspect, details] of Object.entries(info)) {
    result[aspect] = details[tradition];
  }
  return result;
}

// API endpoint: Check if a date is a Jewish holiday
// GET /api/is-holiday?date=YYYY-MM-DD&tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|partial|all
app.get('/api/is-holiday', (req, res) => {
  try {
    const { date, tradition = 'all', shomer = 'all' } = req.query;
    
    // Validate parameters
    const validTraditions = ['ashkenazi', 'sephardi', 'all'];
    const validShomer = ['shomer', 'non-shomer', 'partial', 'all'];
    
    if (!validTraditions.includes(tradition)) {
      return res.status(400).json({
        error: 'Invalid tradition parameter. Must be: ashkenazi, sephardi, or all'
      });
    }
    
    if (!validShomer.includes(shomer)) {
      return res.status(400).json({
        error: 'Invalid shomer parameter. Must be: shomer, non-shomer, partial, or all'
      });
    }

    // Parse the date or use today
    let targetDate;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
    } else {
      targetDate = new Date();
    }

    // Convert to Hebrew date
    const hebrewDate = new HDate(targetDate);
    
    // Check for holidays
    const result = checkHoliday(hebrewDate, { tradition, shomer });
    
    res.json(result);
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint: Get holidays for a Hebrew year
// GET /api/holidays/:hebrewYear?tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|all
app.get('/api/holidays/:hebrewYear', (req, res) => {
  try {
    const { hebrewYear } = req.params;
    const { tradition = 'all', shomer = 'all' } = req.query;
    
    const year = parseInt(hebrewYear);
    if (isNaN(year) || year < 5000 || year > 6000) {
      return res.status(400).json({
        error: 'Invalid Hebrew year. Use years 5000-6000'
      });
    }

    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      candlelighting: false,
      sedrot: false,
      omer: false
    });
    
    const holidays = events.map(event => {
      const holidayName = event.render();
      const categoryInfo = categorizeHoliday(holidayName);
      const gregDate = event.date.greg();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        name: holidayName,
        basename: event.basename(),
        hebrewDate: event.date.render('he'),
        gregorianDate: gregDate.toISOString().split('T')[0],
        dayOfWeek: days[gregDate.getDay()],
        category: categoryInfo.category,
        level: categoryInfo.level,
        workForbidden: categoryInfo.workForbidden,
        traditionSpecific: getTraditionSpecificInfo(event.basename(), tradition)
      };
    });

    res.json({
      hebrewYear: year,
      tradition: tradition,
      shomer: shomer,
      count: holidays.length,
      holidays: holidays
    });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint: Get holidays for a Gregorian year
// GET /api/gregorian-holidays/:year?tradition=...&shomer=...
app.get('/api/gregorian-holidays/:year', (req, res) => {
  try {
    const { year } = req.params;
    const { tradition = 'all', shomer = 'all' } = req.query;
    
    const gregYear = parseInt(year);
    if (isNaN(gregYear) || gregYear < 1900 || gregYear > 2100) {
      return res.status(400).json({
        error: 'Invalid year. Use 1900-2100'
      });
    }

    const events = HebrewCalendar.calendar({
      year: gregYear,
      isHebrewYear: false,
      candlelighting: false,
      sedrot: false,
      omer: false
    });
    
    const holidays = events.map(event => {
      const holidayName = event.render();
      const categoryInfo = categorizeHoliday(holidayName);
      const gregDate = event.date.greg();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        name: holidayName,
        basename: event.basename(),
        hebrewDate: event.date.render('he'),
        gregorianDate: gregDate.toISOString().split('T')[0],
        dayOfWeek: days[gregDate.getDay()],
        category: categoryInfo.category,
        level: categoryInfo.level,
        workForbidden: categoryInfo.workForbidden,
        traditionSpecific: getTraditionSpecificInfo(event.basename(), tradition)
      };
    });

    res.json({
      gregorianYear: gregYear,
      tradition: tradition,
      shomer: shomer,
      count: holidays.length,
      holidays: holidays
    });
  } catch (error) {
    console.error('Error getting holidays:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint: Get upcoming holidays
// GET /api/upcoming?days=30&tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|all
app.get('/api/upcoming', (req, res) => {
  try {
    const { days = 30, tradition = 'all', shomer = 'all' } = req.query;
    const daysAhead = parseInt(days);
    
    if (isNaN(daysAhead) || daysAhead < 1 || daysAhead > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Use 1-365'
      });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + daysAhead);

    const events = HebrewCalendar.calendar({
      start: today,
      end: endDate,
      candlelighting: false,
      sedrot: false,
      omer: false
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const upcoming = events.map(event => {
      const holidayName = event.render();
      const categoryInfo = categorizeHoliday(holidayName);
      const eventDate = event.date.greg();
      
      return {
        name: holidayName,
        basename: event.basename(),
        hebrewDate: event.date.render('he'),
        gregorianDate: eventDate.toISOString().split('T')[0],
        dayOfWeek: dayNames[eventDate.getDay()],
        category: categoryInfo.category,
        level: categoryInfo.level,
        workForbidden: shomer === 'non-shomer' ? false : categoryInfo.workForbidden,
        daysFromNow: Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24)),
        traditionSpecific: getTraditionSpecificInfo(event.basename(), tradition)
      };
    });

    res.json({
      from: today.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
      tradition: tradition,
      shomer: shomer,
      count: upcoming.length,
      holidays: upcoming
    });
  } catch (error) {
    console.error('Error getting upcoming holidays:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint: Convert Gregorian date to Hebrew date
// GET /api/convert/to-hebrew?date=YYYY-MM-DD
app.get('/api/convert/to-hebrew', (req, res) => {
  try {
    const { date } = req.query;

    let targetDate;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
    } else {
      targetDate = new Date();
    }

    const hd = new HDate(targetDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const events = HebrewCalendar.getHolidaysOnDate(hd) || [];

    res.json({
      gregorianDate: targetDate.toISOString().split('T')[0],
      hebrewDate: {
        day: hd.getDate(),
        month: hd.getMonthName(),
        year: hd.getFullYear(),
        rendered: hd.render('en'),
        renderedHebrew: hd.render('he')
      },
      dayOfWeek: dayNames[targetDate.getDay()],
      isShabbat: targetDate.getDay() === 6,
      holidays: events.map(e => e.render())
    });
  } catch (error) {
    console.error('Error converting to Hebrew date:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// API endpoint: Convert Hebrew date to Gregorian date
// GET /api/convert/to-gregorian?year=5785&month=Nisan&day=15
app.get('/api/convert/to-gregorian', (req, res) => {
  try {
    const { year, month, day } = req.query;

    if (!year || !month || !day) {
      return res.status(400).json({
        error: 'Missing required parameters: year, month, day',
        example: '/api/convert/to-gregorian?year=5785&month=Nisan&day=15'
      });
    }

    const hYear = parseInt(year);
    const hDay = parseInt(day);

    if (isNaN(hYear) || hYear < 3761 || hYear > 6000) {
      return res.status(400).json({
        error: 'Invalid Hebrew year. Use years 3761-6000'
      });
    }

    if (isNaN(hDay) || hDay < 1 || hDay > 30) {
      return res.status(400).json({
        error: 'Invalid day. Use 1-30'
      });
    }

    const validMonths = [
      'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul',
      'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar',
      'Adar I', 'Adar II'
    ];

    if (!validMonths.includes(month)) {
      return res.status(400).json({
        error: `Invalid month. Valid months: ${validMonths.join(', ')}`
      });
    }

    const hd = new HDate(hDay, month, hYear);
    const gregDate = hd.greg();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const events = HebrewCalendar.getHolidaysOnDate(hd) || [];

    res.json({
      hebrewDate: {
        day: hd.getDate(),
        month: hd.getMonthName(),
        year: hd.getFullYear(),
        rendered: hd.render('en'),
        renderedHebrew: hd.render('he')
      },
      gregorianDate: gregDate.toISOString().split('T')[0],
      dayOfWeek: dayNames[gregDate.getDay()],
      isShabbat: gregDate.getDay() === 6,
      holidays: events.map(e => e.render())
    });
  } catch (error) {
    console.error('Error converting to Gregorian date:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Jewish Holidays API',
    author: 'Ethan Ackerman',
    description: 'Check if a date is a Jewish holiday with Sephardi/Ashkenazi traditions and shomer/non-shomer observance levels',
    endpoints: {
      '/api/is-holiday': {
        method: 'GET',
        description: 'Check if a specific date is a Jewish holiday or Shabbat',
        parameters: {
          date: 'YYYY-MM-DD (optional, defaults to today)',
          tradition: 'ashkenazi | sephardi | all (optional, defaults to all)',
          shomer: 'shomer | non-shomer | partial | all (optional, defaults to all)'
        },
        example: '/api/is-holiday?date=2024-10-03&tradition=ashkenazi&shomer=shomer'
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
        example: '/api/gregorian-holidays/2024'
      },
      '/api/upcoming': {
        method: 'GET',
        description: 'Get upcoming holidays within a range',
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
    }
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
      '/api/is-holiday',
      '/api/holidays/:hebrewYear',
      '/api/gregorian-holidays/:year',
      '/api/upcoming',
      '/api/convert/to-hebrew',
      '/api/convert/to-gregorian'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Jewish Holidays API by Ethan Ackerman running on port ${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/`);
});
