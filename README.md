# Jewish Holidays API

**By Ethan Ackerman**

A RESTful API to check if a date is a Jewish holiday, with support for Sephardi and Ashkenazi traditions, plus shomer/non-shomer observance level filtering.

## Features

- **True/False Holiday Check**: Quickly determine if any date is a Jewish holiday
- **Shabbat Detection**: Automatically detects Shabbat (Saturday)
- **Tradition Support**: Sephardi and Ashkenazi minhag differences
- **Observance Levels**: Filter by shomer, non-shomer, or partial observance
- **Work Restrictions**: Know if work is permitted/forbidden on specific days
- **Date Conversion**: Convert between Gregorian and Hebrew calendar dates
- **Multiple Date Formats**: Gregorian and Hebrew calendar support
- **CORS Enabled**: Use directly from any browser-based application

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or use development mode with auto-reload
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Check if a date is a holiday

```
GET /api/is-holiday?date=YYYY-MM-DD&tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|partial|all
```

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)
- `tradition` (optional): `ashkenazi`, `sephardi`, or `all` (default: `all`)
- `shomer` (optional): `shomer`, `non-shomer`, `partial`, or `all` (default: `all`)

**Example Response:**
```json
{
  "isHoliday": true,
  "isShabbat": false,
  "isYomTov": true,
  "holidayName": "Pesach I",
  "basename": "Pesach",
  "description": "Pesach I",
  "hebrewDate": "15 Nisan, 5784",
  "gregorianDate": "2024-04-23",
  "tradition": "ashkenazi",
  "shomer": "shomer",
  "category": "yom-tov",
  "level": "strict",
  "workForbidden": true,
  "restrictions": {
    "noWork": true,
    "noElectronics": true,
    "noDriving": true,
    "noCooking": true,
    "noMoney": true,
    "description": "Full Shabbat observance - no melacha (creative work)"
  },
  "traditionSpecific": {
    "kitniyot": "Forbidden (no rice, beans, corn)"
  }
}
```

### Get all holidays for a Hebrew year

```
GET /api/holidays/:hebrewYear?tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|all
```

**Example:**
```
GET /api/holidays/5785
```

### Get all holidays for a Gregorian year

```
GET /api/gregorian-holidays/:year?tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|all
```

**Example:**
```
GET /api/gregorian-holidays/2024
```

### Get upcoming holidays

```
GET /api/upcoming?days=30&tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|all
```

**Parameters:**
- `days`: Number of days to look ahead (1-365, default: 30)

**Example:**
```
GET /api/upcoming?days=60&shomer=shomer
```

### Convert Gregorian date to Hebrew date

```
GET /api/convert/to-hebrew?date=YYYY-MM-DD
```

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

**Example Response:**
```json
{
  "gregorianDate": "2025-04-13",
  "hebrewDate": {
    "day": 15,
    "month": "Nisan",
    "year": 5785,
    "rendered": "15th of Nisan, 5785",
    "renderedHebrew": "15 נִיסָן, 5785"
  },
  "dayOfWeek": "Sunday",
  "isShabbat": false,
  "holidays": ["Pesach I"]
}
```

### Convert Hebrew date to Gregorian date

```
GET /api/convert/to-gregorian?year=5785&month=Nisan&day=15
```

**Parameters:**
- `year` (required): Hebrew year (e.g. 5785)
- `month` (required): Hebrew month name (e.g. Nisan, Tishrei, Adar)
- `day` (required): Day of the month (1-30)

**Valid Hebrew months:** Nisan, Iyyar, Sivan, Tamuz, Av, Elul, Tishrei, Cheshvan, Kislev, Tevet, Shvat, Adar, Adar I, Adar II

**Example Response:**
```json
{
  "hebrewDate": {
    "day": 15,
    "month": "Nisan",
    "year": 5785,
    "rendered": "15th of Nisan, 5785",
    "renderedHebrew": "15 נִיסָן, 5785"
  },
  "gregorianDate": "2025-04-13",
  "dayOfWeek": "Sunday",
  "isShabbat": false,
  "holidays": ["Pesach I"]
}
```

## Observance Levels Explained

### Shomer
- **Full Shabbat/Yom Tov observance**
- No melacha (creative work)
- No electronics
- No driving
- No cooking (only warming pre-cooked food)
- No handling money

### Non-Shomer
- **No religious restrictions**
- Normal work and activities permitted
- May choose to attend synagogue
- Can drive, cook, use electronics

### Partial
- **Individual practice varies**
- Some restrictions based on personal choice
- May avoid driving but use electronics
- Varies by family tradition

## Tradition Differences

### Pesach (Passover)
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Kitniyot | Forbidden (no rice, beans, corn) | Permitted |
| Matzah | Strict guidelines | Similar guidelines |

### Chanukah
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Candle Lighting | Right to left, one per night | All candles each night, left to right |
| Zemirot | Traditional Ashkenazi songs | Traditional Sephardi songs |

### Shabbat
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Songs | Shalom Aleichem, Eshet Chayil | Different zemirot customs |
| Minhag | Eastern European traditions | Mediterranean/Middle Eastern traditions |

## Holiday Categories

### Yom Tov (Major Holidays)
- **Work forbidden** for shomer observance
- Rosh Hashana, Yom Kippur, Pesach (days 1, 2, 7, 8), Shavuot (days 1, 2), Sukkot (days 1, 2), Shmini Atzeret, Simchat Torah

### Chol Hamoed (Intermediate Days)
- **Work permitted** but with restrictions
- Days 3-6 of Pesach, Days 3-7 of Sukkot

### Minor Holidays
- **Work permitted**
- Purim, Chanukah, Tu BiShvat, Lag BaOmer, etc.

### Fast Days
- **Work permitted** but fasting required
- Tisha B'Av, Yom Kippur (also Yom Tov), minor fasts

### Shabbat
- **Work forbidden** for shomer observance
- Every Saturday

## Installation

```bash
git clone https://github.com/EthanAckerman-git/JewishHolidaysAPI.git
cd JewishHolidaysAPI
npm install
npm start
```

## Deployment

### Deploy to Render
1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Use the following settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Deploy to Railway
1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Deploy automatically

### Deploy to Heroku
```bash
heroku create jewish-holidays-api
git push heroku main
```

## Usage Examples

### Check if today is a holiday
```bash
curl http://localhost:3000/api/is-holiday
```

### Check specific date for Sephardi traditions
```bash
curl "http://localhost:3000/api/is-holiday?date=2025-04-13&tradition=sephardi"
```

### Check if shomer needs to observe
```bash
curl "http://localhost:3000/api/is-holiday?date=2025-04-13&shomer=shomer"
```

### Get all 2025 holidays for a shomer
```bash
curl "http://localhost:3000/api/gregorian-holidays/2025?shomer=shomer"
```

### Get upcoming holidays for next 90 days
```bash
curl "http://localhost:3000/api/upcoming?days=90"
```

### Convert a Gregorian date to Hebrew
```bash
curl "http://localhost:3000/api/convert/to-hebrew?date=2025-04-13"
```

### Convert a Hebrew date to Gregorian
```bash
curl "http://localhost:3000/api/convert/to-gregorian?year=5785&month=Nisan&day=15"
```

## Response Fields

| Field | Description |
|-------|-------------|
| `isHoliday` | Boolean - true if it's a holiday or Shabbat |
| `isShabbat` | Boolean - true if it's Saturday |
| `isYomTov` | Boolean - true if it's a major holiday |
| `holidayName` | Full name of the holiday |
| `basename` | Base holiday name (e.g., "Pesach") |
| `hebrewDate` | Date in Hebrew format |
| `gregorianDate` | Date in YYYY-MM-DD format |
| `dayOfWeek` | Day of the week (e.g., "Sunday") |
| `category` | Holiday category (yom-tov, chol-hamoed, minor, fast, shabbat) |
| `level` | Restriction level (strict, intermediate, permissive, restrictive) |
| `workForbidden` | Boolean - whether work is forbidden |
| `restrictions` | Detailed restrictions for the shomer level |
| `traditionSpecific` | Tradition-specific information |

## Technologies

- [Node.js](https://nodejs.org/) (>=18.0.0)
- [Express.js](https://expressjs.com/)
- [cors](https://github.com/expressjs/cors) - Cross-origin resource sharing
- [@hebcal/core](https://github.com/hebcal/hebcal-es6) - Jewish calendar calculations

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Author

**Ethan Ackerman**

Created with ❤️ for the Jewish community worldwide.

## Acknowledgments

- Calendar calculations powered by [Hebcal](https://www.hebcal.com/)
- Jewish calendar algorithms based on traditional Jewish law (halacha)

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/EthanAckerman-git/JewishHolidaysAPI/issues).
