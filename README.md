# Jewish Holidays API

**By Ethan Ackerman** &middot; v2.0.0

A production-ready RESTful API for Jewish holiday lookups, Shabbat detection, Sephardi/Ashkenazi tradition differences, shomer observance levels, and Gregorian&#8596;Hebrew date conversion.

> **Free &amp; public** &mdash; clone the repo, deploy to any Node.js host, and you have a live API in minutes.

## Features

- **Holiday Check** &mdash; determine if any date is a Jewish holiday or Shabbat
- **Tradition Support** &mdash; Sephardi and Ashkenazi minhag differences
- **Observance Levels** &mdash; shomer, non-shomer, or partial filtering
- **Work Restrictions** &mdash; know if melacha is forbidden on a given day
- **Date Conversion** &mdash; Gregorian&#8596;Hebrew calendar conversion
- **Upcoming Holidays** &mdash; look ahead up to 365 days
- **CORS Enabled** &mdash; use directly from any browser or front-end app
- **Security Hardened** &mdash; helmet, rate limiting, compression out of the box

---

## Quick Start (Local)

```bash
git clone https://github.com/EthanAckerman-git/JewishHolidaysAPI.git
cd JewishHolidaysAPI
npm install
npm start          # production
npm run dev        # development (auto-reload)
```

The API will be available at `http://localhost:3000`.

---

## API Endpoints

Base URL (local): `http://localhost:3000`

### 1. Check if a date is a holiday

```
GET /api/is-holiday?date=YYYY-MM-DD&tradition=ashkenazi|sephardi|all&shomer=shomer|non-shomer|partial|all
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `date` | No | today | Gregorian date in `YYYY-MM-DD` format |
| `tradition` | No | `all` | `ashkenazi`, `sephardi`, or `all` |
| `shomer` | No | `all` | `shomer`, `non-shomer`, `partial`, or `all` |

**Example Response:**
```json
{
  "isHoliday": true,
  "isShabbat": false,
  "isYomTov": true,
  "holidayName": "Pesach I",
  "basename": "Pesach",
  "description": "Pesach I",
  "hebrewDate": "15 Nisan, 5785",
  "gregorianDate": "2025-04-13",
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

### 2. Get all holidays for a Hebrew year

```
GET /api/holidays/:hebrewYear?tradition=...&shomer=...
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `:hebrewYear` | Yes | Hebrew year `5000`-`6000` |

### 3. Get all holidays for a Gregorian year

```
GET /api/gregorian-holidays/:year?tradition=...&shomer=...
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `:year` | Yes | Gregorian year `1900`-`2100` |

### 4. Get upcoming holidays

```
GET /api/upcoming?days=30&tradition=...&shomer=...
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `days` | No | `30` | Days to look ahead (`1`-`365`) |

### 5. Convert Gregorian date to Hebrew date

```
GET /api/convert/to-hebrew?date=YYYY-MM-DD
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `date` | No | today | Gregorian date in `YYYY-MM-DD` format |

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

### 6. Convert Hebrew date to Gregorian date

```
GET /api/convert/to-gregorian?year=5785&month=Nisan&day=15
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `year` | Yes | Hebrew year (e.g. `5785`) |
| `month` | Yes | Hebrew month name (see list below) |
| `day` | Yes | Day of the month (`1`-`30`) |

**Valid months:** Nisan, Iyyar, Sivan, Tamuz, Av, Elul, Tishrei, Cheshvan, Kislev, Tevet, Shvat, Adar, Adar I, Adar II

---

## Usage Examples

### cURL

```bash
# Check if today is a holiday
curl https://YOUR_HOST/api/is-holiday

# Check a specific date with Sephardi tradition
curl "https://YOUR_HOST/api/is-holiday?date=2025-04-13&tradition=sephardi"

# Get all holidays for Hebrew year 5786
curl https://YOUR_HOST/api/holidays/5786

# Get upcoming holidays for next 90 days
curl "https://YOUR_HOST/api/upcoming?days=90"

# Convert Gregorian to Hebrew
curl "https://YOUR_HOST/api/convert/to-hebrew?date=2025-12-25"

# Convert Hebrew to Gregorian
curl "https://YOUR_HOST/api/convert/to-gregorian?year=5785&month=Nisan&day=15"
```

### JavaScript (fetch)

```javascript
// Check if a date is a holiday
const res = await fetch('https://YOUR_HOST/api/is-holiday?date=2025-04-13&tradition=ashkenazi');
const data = await res.json();
console.log(data.isHoliday);   // true
console.log(data.holidayName); // "Pesach I"

// Convert Gregorian to Hebrew
const convert = await fetch('https://YOUR_HOST/api/convert/to-hebrew?date=2025-04-13');
const hebrew = await convert.json();
console.log(hebrew.hebrewDate.rendered); // "15th of Nisan, 5785"
```

### Python (requests)

```python
import requests

# Check if a date is a holiday
r = requests.get('https://YOUR_HOST/api/is-holiday', params={
    'date': '2025-04-13',
    'tradition': 'sephardi',
    'shomer': 'shomer'
})
data = r.json()
print(data['isHoliday'])    # True
print(data['holidayName'])  # "Pesach I"

# Convert Hebrew to Gregorian
r = requests.get('https://YOUR_HOST/api/convert/to-gregorian', params={
    'year': 5785, 'month': 'Nisan', 'day': 15
})
print(r.json()['gregorianDate'])  # "2025-04-13"
```

> Replace `YOUR_HOST` with your deployed URL (e.g. `your-app.onrender.com`) or `localhost:3000` for local development.

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute per IP | **100** |
| Response on exceed | `429 Too Many Requests` |
| Retry header | `Retry-After` (standard) |

Deterministic endpoints (date conversions, yearly holiday lists) return `Cache-Control` headers so repeat requests are served from cache.

---

## Response Fields

| Field | Description |
|-------|-------------|
| `isHoliday` | `true` if the date is a holiday or Shabbat |
| `isShabbat` | `true` if the date is Saturday |
| `isYomTov` | `true` if it is a major holiday (Yom Tov) |
| `holidayName` | Full rendered holiday name |
| `basename` | Base holiday name (e.g. `"Pesach"`) |
| `hebrewDate` | Date in Hebrew calendar format |
| `gregorianDate` | Date in `YYYY-MM-DD` format |
| `dayOfWeek` | Day of the week (e.g. `"Sunday"`) |
| `category` | `yom-tov`, `chol-hamoed`, `minor`, `fast`, `shabbat`, `rosh-chodesh`, `other` |
| `level` | `strict`, `intermediate`, `permissive`, `restrictive`, `unknown` |
| `workForbidden` | Whether melacha (work) is forbidden |
| `restrictions` | Detailed restriction object for the shomer level |
| `traditionSpecific` | Tradition-specific customs (kitniyot, candle lighting, etc.) |

---

## Observance Levels

| Level | Description |
|-------|-------------|
| **shomer** | Full Shabbat/Yom Tov observance &mdash; no melacha, electronics, driving, cooking, money |
| **non-shomer** | No religious restrictions &mdash; may attend synagogue |
| **partial** | Varies by individual &mdash; some restrictions based on personal practice |
| **all** | Returns information without filtering by observance |

## Tradition Differences

### Pesach (Passover)
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Kitniyot | Forbidden (no rice, beans, corn) | Permitted |

### Chanukah
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Candle Lighting | Right to left, sufficient lighting | All candles each night, left to right |

### Shabbat
| Aspect | Ashkenazi | Sephardi |
|--------|-----------|----------|
| Songs | Shalom Aleichem, Eshet Chayil | Different zemirot customs |
| Minhag | Eastern European traditions | Mediterranean/Middle Eastern traditions |

## Holiday Categories

| Category | Work | Examples |
|----------|------|----------|
| **Yom Tov** | Forbidden (shomer) | Rosh Hashana, Yom Kippur, Pesach I/II/VII/VIII, Shavuot, Sukkot I/II, Shmini Atzeret, Simchat Torah |
| **Chol Hamoed** | Permitted (with restrictions) | Pesach III-VI, Sukkot III-VII |
| **Minor** | Permitted | Purim, Chanukah, Tu BiShvat, Lag BaOmer |
| **Fast** | Permitted (fasting required) | Tisha B'Av, Ta'anit Esther, Tzom Gedaliah |
| **Shabbat** | Forbidden (shomer) | Every Saturday |
| **Rosh Chodesh** | Permitted | New month |

---

## Deployment (Free Hosting)

This repo includes configuration files for one-click deploy on free-tier platforms.

### Deploy to Render (recommended)

1. Fork or push this repo to your GitHub account
2. Go to [render.com](https://render.com) and create a **New Web Service**
3. Connect your GitHub repo &mdash; Render auto-detects `render.yaml`
4. Deploy &mdash; your API will be live at `https://your-app.onrender.com`

### Deploy to Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repo &mdash; Railway auto-detects `railway.json`
3. Deploy automatically

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (set automatically by most hosts) |
| `NODE_ENV` | — | Set to `production` on deployed environments |

---

## Technologies

- [Node.js](https://nodejs.org/) (>=18.0.0)
- [Express.js](https://expressjs.com/) &mdash; web framework
- [@hebcal/core](https://github.com/hebcal/hebcal-es6) &mdash; Jewish calendar calculations
- [helmet](https://helmetjs.github.io/) &mdash; security headers
- [cors](https://github.com/expressjs/cors) &mdash; cross-origin resource sharing
- [compression](https://github.com/expressjs/compression) &mdash; gzip responses
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) &mdash; rate limiting

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## License

MIT License &mdash; see [LICENSE](LICENSE) file for details.

## Author

**Ethan Ackerman**

Created with ❤️ for the Jewish community worldwide.

## Acknowledgments

- Calendar calculations powered by [Hebcal](https://www.hebcal.com/)
- Jewish calendar algorithms based on traditional Jewish law (halacha)

## Support

For issues or questions, please open an issue on [GitHub](https://github.com/EthanAckerman-git/JewishHolidaysAPI/issues).
