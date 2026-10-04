# Swiss Ephemeris MCP Server

A Model Context Protocol (MCP) server that provides astronomical calculations using the Swiss Ephemeris library. Calculate planetary positions, houses, chart points, and asteroids for any date and location.

## 🚀 Live Hosted Server (Google Cloud Run)

The server is deployed live on Google Cloud Run and available for public MCP and HTTP integration:

- **Service URL**: `https://swiss-ephemeris-mcp-372282693829.us-central1.run.app`
- **MCP Endpoint**: `https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/mcp`
- **Health Check**: `https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/health`

### Quick Connect

- **Claude.ai**: Go to **Settings → Connectors → Add custom connector**, set Name to `Swiss Ephemeris` and URL to `https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/mcp`.
- **VS Code**: Use the preconfigured `swissEphemerisGCP` entry in `.vscode/mcp.json`.

## Features

- **Planetary Positions**: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **Lunar Nodes**: True and Mean Node calculations
- **Asteroids**: Chiron, Ceres, Pallas, Juno, Vesta, Lilith
- **Houses**: 12-house system using Placidus
- **Chart Points**: Ascendant, Midheaven, IC, Descendant
- **Additional Points**: South Node, Part of Fortune
- **Vedic / KP**: Sidereal chart (Lahiri, KP New, KP Old and more) with nakshatra, pada, star lord, KP sub lord and sub-sub lord, plus Vimshottari dasha down to sookshma

## Installation

#### Prerequisites for Local Development

For local use with Claude Desktop, you need to install the Swiss Ephemeris `swetest` command:

```bash
# Install swetest (required for Claude Desktop usage)
git clone https://github.com/aloistr/swisseph.git /tmp/swisseph && \
    cd /tmp/swisseph && \
    make && \
    cp swetest /usr/local/bin/ && \
    rm -rf /tmp/swisseph
```


### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "swissEphemeris": {
      "command": "npx",
      "args": ["github:dm0lz/swiss-ephemeris-mcp-server"]
    }
  }
}
```

### Manual Installation

```bash
git clone https://github.com/dm0lz/swiss-ephemeris-mcp-server.git
cd swiss-ephemeris-mcp-server
npm install
npm start
```

## Usage

The server provides six main tools:

### `calculate_planetary_positions`

Calculate astronomical data for a specific date, time, and location.

**Parameters:**
- `datetime` (string): ISO8601 format, e.g., "1985-04-12T23:20:50Z"
- `latitude` (number): Latitude in decimal degrees (-90 to 90)
- `longitude` (number): Longitude in decimal degrees (-180 to 180)

**Returns:**
- `planets`: Positions of all planets and celestial bodies
- `houses`: 12 astrological houses
- `chart_points`: Ascendant, Midheaven, IC, Descendant
- `additional_points`: South Node, Part of Fortune

### `calculate_transits`

Calculate birth chart positions and current transits for comparison.

**Parameters:**
- `birth_datetime` (string): Birth datetime in ISO8601 format
- `latitude` (number): Birth latitude in decimal degrees
- `longitude` (number): Birth longitude in decimal degrees

**Returns:**
- `natal_chart`: Complete birth chart data
- `current_transits`: Current planetary positions
- `calculation_time`: Timestamp of transit calculation

### `calculate_solar_revolution`

Calculate solar return chart for a specific year (when Sun returns to natal position).

**Parameters:**
- `birth_datetime` (string): Birth datetime in ISO8601 format
- `birth_latitude` (number): Birth latitude in decimal degrees
- `birth_longitude` (number): Birth longitude in decimal degrees
- `return_year` (number): Year for solar return calculation (e.g., 2024)
- `return_latitude` (number, optional): Solar return location latitude
- `return_longitude` (number, optional): Solar return location longitude

**Returns:**
- `natal_chart`: Original birth chart data
- `solar_return_chart`: Solar return chart for the specified year
- `natal_sun_longitude`: Original Sun position in degrees
- `return_sun_longitude`: Solar return Sun position in degrees
- `calculation_time`: Timestamp of calculation

### `calculate_synastry`

Calculate synastry chart between two people for relationship compatibility analysis.

**Parameters:**
- `person1_datetime` (string): Person 1 birth datetime in ISO8601 format
- `person1_latitude` (number): Person 1 birth latitude in decimal degrees
- `person1_longitude` (number): Person 1 birth longitude in decimal degrees
- `person2_datetime` (string): Person 2 birth datetime in ISO8601 format
- `person2_latitude` (number): Person 2 birth latitude in decimal degrees
- `person2_longitude` (number): Person 2 birth longitude in decimal degrees

**Returns:**
- `person1_chart`: Complete birth chart for person 1
- `person2_chart`: Complete birth chart for person 2
- `synastry_aspects`: Array of planetary aspects between the charts
- `calculation_time`: Timestamp of calculation

### `calculate_vedic_chart`

Calculate a sidereal Vedic/KP birth chart with Vimshottari and Kalachakra dashas. The defaults follow Jagannatha Hora (JHora): Traditional Lahiri ayanamsa, true positions, true nodes and true sidereal solar years.

**Parameters:**
- `datetime` (string): Birth datetime in ISO8601 format, including the timezone, e.g., "1999-06-06T15:30:00+05:30". Dasha dates are returned in the same UTC offset.
- `latitude` (number): Birth latitude in decimal degrees
- `longitude` (number): Birth longitude in decimal degrees, positive east
- `ayanamsa` (string, optional): `traditional_lahiri` (default), `lahiri`, `kp_new`, `kp_old`, `raman`, `yukteshwar`, `fagan_bradley`
- `position_type` (string, optional): `true` (default) or `apparent` planet positions
- `node_type` (string, optional): `true` (default) or `mean` node for Rahu/Ketu
- `as_of` (string, optional): Date for the running dasha chains (default now)
- `dasha_year_days` (number, optional): Fixed days per dasha year, e.g. 365.25. Omit it to use true sidereal solar years.

**Returns:**
- `ayanamsa`: Name and value used
- `lagna`, `midheaven`: Sidereal Ascendant and MC
- `planets`: Sun to Pluto plus Rahu/Ketu, each with sign, sign lord, degree, nakshatra, pada, star lord, sub lord, sub-sub lord, retrograde flag, whole-sign house and KP (Placidus cusp) house
- `houses`: 12 sidereal Placidus cusps with the same lord details (KP cuspal chart)
- `vimshottari_dasha`: Moon nakshatra, balance at birth, the current chain down to deha (mahadasha, antardasha, pratyantardasha, sookshma, praana, deha), and every mahadasha with its antardasha dates
- `kalachakra_dasha`: Kalachakra dasha from the Moon by the SM Singh method: direction (Savya/Apasavya), Paramayush, Deha and Jiva, the current chain down to deha, and every mahadasha with its antardashas. Each period shows its sign and the nakshatra pada it stands for, like JHora's "Pi (Sata1)".

**How the defaults match JHora:**

| Setting | Value | Notes |
|---|---|---|
| Ayanamsa | Traditional Lahiri | 23°15'00.658" on 21 March 1956 less that day's nutation, under the current precession model. Swiss Ephemeris' own Lahiri (`lahiri`) is 0.14" higher. |
| Positions | True | Not apparent: no light-time or aberration |
| Nodes | True | |
| Dasha year | True sidereal solar year | N years have passed when the Sun has moved N × 360° in sidereal longitude |
| Kalachakra | SM Singh | Elapsed fraction of the Moon's pada applied to the full cycle; mahadashas strictly from the cycle (back to its start after the last sign); every sub-period found from the pada its parent stands for, the way mahadashas are found from the Moon's pada: the cycle of that pada's Kalachakra navamsa from its start, run forward when the pada has the same direction (savya/apasavya) as the Moon's pada and backward otherwise; Rohini 4 taken as Leo |

Checked against JHora on Sagar's chart: 68 Kalachakra periods and 14 Vimshottari periods, across all six levels from mahadasha to deha. Every sign, pada label and lord matched, and every time was within 52 seconds. What remains is about 0.0002" of Moon position (Kalachakra multiplies it by up to 100 years), plus the two programs' ΔT predictions drifting apart for future dates.

### `calculate_kalachakra_dasha`

Kalachakra dasha only, always with the JHora settings above. Nothing can be overridden.

**Parameters:**
- `datetime` (string): Birth datetime in ISO8601 format with timezone, e.g., "1999-06-06T15:30:00+05:30"
- `latitude`, `longitude` (number, optional): Accepted for convenience. Kalachakra uses the geocentric Moon, so the place doesn't change the result.
- `as_of` (string, optional): Date for the running chain (default now)
- `drill_down` (array, optional): Up to 5 sign abbreviations naming a period to divide, like left-clicking a period in JHora. `["Ta"]` lists the antardashas of the Ta mahadasha; `["Ta", "Vi", "Aq"]` lists the sookshmas of Ta MD › Vi AD › Aq PD; five signs list the deha periods. If a sign appears twice in a list, the first one is used.

**Returns:** `settings`, the Moon's position, direction (Savya/Apasavya), Paramayush, Deha, Jiva, every mahadasha with its antardashas, the running chain down to deha (`current`), and the requested sub-period list (`drill_down`).

KP New uses the Swiss Ephemeris "Krishnamurti VP291" ayanamsa (`-sid45`), which needs a recent `swetest` build (the Dockerfile builds the latest).

## Docker

```bash
# Build and run
docker build -t swiss-ephemeris-mcp .
docker run -p 8000:8000 -e MCP_HTTP_MODE=true swiss-ephemeris-mcp

# Health check
curl http://localhost:8000/health
```

## Deploy to Google Cloud & Free CI/CD

- **Deployment Guide**: See [docs/DEPLOY_GCP.md](docs/DEPLOY_GCP.md) for step-by-step setup details.
- **Automated CI/CD**: A `cloudbuild.yaml` file is included in this repository. Connecting your repository to a GCP Cloud Build GitHub Trigger provides 100% free automated deployments on push to `main` (staying well within GCP's 120 free build-minutes/day).

## Transport Modes

- **HTTP**: Live on Google Cloud Run with `MCP_HTTP_MODE=true` at `/mcp` (Streamable HTTP).
- **Stdio**: Local Docker or development mode for desktop clients.

## Links

- **Live MCP Endpoint**: https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/mcp
- **Health Check**: https://swiss-ephemeris-mcp-372282693829.us-central1.run.app/health
- **GCP Project**: `swiss-ephemeris-mcp-5573` (region: `us-central1`)
- **Swiss Ephemeris Documentation**: https://www.astro.com/swisseph/

## License

MIT 