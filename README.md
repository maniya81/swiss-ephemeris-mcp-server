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
- **Chart blocks**: divisional charts D1-D60 with Vimshopaka, dignity and avasthas, Vedic aspects, Ashtakavarga, Shadbala and Bhavabala, KP significators
- **More dashas**: Kalachakra (SM Singh), Yogini, Ashtottari, Chara and Narayana
- **Gochar**: Sade Sati and other Saturn states with exact spans, tara/chandra bala, natal hits, ingress and station search
- **Rectification**: birth-time sweeps with event tests, Kalachakra jump lists, transit-to-cusp anchors, KP ruling planets and the hour trigger

See [CHANGELOG.md](CHANGELOG.md) for what changed in 1.1.0.

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
- `datetime` (string): Birth datetime in ISO8601 format with the birth UTC offset and seconds, e.g., "1999-06-06T15:30:00+05:30". Fractional seconds are kept (e.g. `15:30:00.25`). Without an offset, IST (+05:30) is assumed and `birth_timezone` says so. Dasha dates are returned in the birth offset.
- `latitude` (number): Birth latitude in decimal degrees
- `longitude` (number): Birth longitude in decimal degrees, positive east
- `ayanamsa` (string, optional): `traditional_lahiri` (default), `lahiri`, `kp_new`, `kp_old`, `raman`, `yukteshwar`, `fagan_bradley`
- `position_type` (string, optional): `true` (default) or `apparent` planet positions
- `node_type` (string, optional): `true` (default) or `mean` node for Rahu/Ketu. Use `mean` only when asked; it moves Rahu/Ketu by up to about 1.7° and so their sub lords, varga signs, Rahu's and Ketu's Vimshopaka and node-based KP and Chara/Narayana results, but not Vimshottari, Kalachakra, Shadbala or Ashtakavarga
- `as_of` (string or list, optional): Date for the running dasha chains (default now), or a list of up to 200 dates to get one compact chain per date (`chains`)
- `output` (string, optional): `full` (default) or `chain`, which leaves out the dasha trees and returns only the running chains
- `levels` (integer, optional): How deep chains go, from 1 (mahadasha) to 6 (deha, the default)
- `current_timezone` (string, optional): IANA timezone where the native lives now, e.g. `Australia/Melbourne`. Every dasha `start`/`end` also gets `start_local`/`end_local`, e.g. `2026-10-08 03:02:21 AEDT (UTC+11:00)`, using that zone's daylight-saving rules for each date.
- `dasha_year_days` (number, optional): Fixed days per dasha year, e.g. 365.25. Omit it to use true sidereal solar years.
- `include` (list or `"all"`, optional): extra blocks, default `["dignity","vargas","aspects"]`:
  - `dignity`: exaltation/debilitation with the distance from the deep point, moolatrikona, own sign, natural/temporary/compound relation to the sign lord, combustion (orb and limit), planetary war, retrograde/stationary/speed ratio, Baladi, Jagradadi and Deeptadi avasthas, lordships from the lagna and the Moon
  - `vargas`: the signs in `vargas` (default `["D1","D9"]`, `"all"` = D1 to D60) for the lagna and every graha, the D-60 deity and nature, `vargottama`, Vimshopaka bala (Shad/Sapta/Dasha/Shodasha varga, as Jagannatha Hora by default) and `lagna_sign_change` (seconds until each varga lagna changes sign, earlier and later)
  - `aspects`: sign-based graha drishti per graha and per house; `aspect_strength` adds BPHS virupas, `jaimini_aspects` adds rashi drishti
  - `ashtakavarga`: BAV for the seven planets and the lagna, SAV with the 337 self-check, prastharashtakavarga, `shodhana` (Trikona/Ekadhipatya and Shodhya Pinda); with a single `as_of`, transit bindus and kakshyas
  - `shadbala`, `bhavabala`: the six balas with sub-parts in virupas, rupas, required minimum, ratio and rank, Ishta/Kashta phala, and the strength of the 12 houses
  - `kp_significators` (or `kp_significators: true`): four-level significations per planet and cusp significators by strength; with a single `as_of`, the hour trigger
  - `yogini`, `ashtottari` (with its applicability check), `chara` (`chara_method`), `narayana`: running chain with countdowns, date lists and full trees
- Classical choices: `varga_method`, `rahu_exaltation`, `moolatrikona`, `combustion_limits`, `war_winner`, `stationary_ratio`, `rahu_ketu_aspects`, `sunrise`, `moon_benefic`, `chara_method`, and the method switches `shadbala_method`, `ashtakavarga_tables`, `vimshopaka_method`, `drishti_rule` (each `jh` by default, as Jagannatha Hora). Every response names the ones it used in `settings`.
- Rectification: `birth_time_sweep` (chains, lagna, cusp sub lords and varga lagnas per birth time), `sweep_output` (`ranges` or `flips`), `event_tests` and `sweep_dasha` (`vimshottari`, `yogini`, `ashtottari`); see the Kalachakra tool below

With `output: "chain"` the whole chart, every block included, stays under 3,000 tokens: one line per planet, cusp and block, and 3 levels of running chain unless `levels` is given. `output: "chain_v1"` returns the previous chain format for this release only.

**Returns:**
- `ayanamsa`: Name and value used
- `lagna`, `midheaven`: Sidereal Ascendant and MC
- `planets`: Sun to Pluto plus Rahu/Ketu, each with sign, sign lord, degree, nakshatra, pada, star lord, sub lord, sub-sub lord, retrograde flag, whole-sign house and KP (Placidus cusp) house
- `houses`: 12 sidereal Placidus cusps with the same lord details (KP cuspal chart)
- `vimshottari_dasha`: Moon nakshatra, balance at birth, the current chain down to deha (mahadasha, antardasha, pratyantardasha, sookshma, praana, deha), and every mahadasha with its antardasha dates
- `kalachakra_dasha`: Kalachakra dasha from the Moon by the SM Singh method: the ayanamsa it used, direction (Savya/Apasavya), Paramayush, Deha and Jiva, the current chain down to deha, and every mahadasha with its antardashas. Periods carry `gati` (Simhavalokana, Manduka or Markati jump) and `cycle_restart`.
- `birth_time_sensitivity`: Days by which Kalachakra and Vimshottari boundaries move per second of birth time (a later birth moves them earlier)
- In every running chain (`current`), each level also has `ends_in` (time left) and `next` (the period that follows at that level, with `starts_in`). Each period shows its sign and the nakshatra pada it stands for, like JHora's "Pi (Sata1)".

Birth time zones, coordinates and dual-time reporting (birth time vs. the native's current local time) follow the rules in [docs/ASTROLOGER_INSTRUCTIONS.md](docs/ASTROLOGER_INSTRUCTIONS.md). The server also sends a short version of them to MCP clients as its server instructions.

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
- `datetime` (string): Birth datetime in ISO8601 format with the birth UTC offset and seconds, e.g., "1999-06-06T15:30:00+05:30". Fractional seconds are kept. Without an offset, IST (+05:30) is assumed.
- `latitude`, `longitude` (number, optional): Accepted for convenience. Kalachakra uses the geocentric Moon, so the place doesn't change the result.
- `as_of` (string or list, optional): Date for the running chain (default now), or a list of up to 200 dates (e.g. life events) for one compact chain per date
- `output` (string, optional): `full` (default) or `chain`. `chain` returns only the running chain with countdowns and next periods; it is about a fifth of the size of `full`
- `levels` (integer, optional): How deep chains go, from 1 (mahadasha) to 6 (deha, the default)
- `birth_time_sweep` (object, optional): `{ "from_seconds": -600, "to_seconds": 600, "step_seconds": 1 }` recomputes the Kalachakra for each birth time in that range (relative to `datetime`, fractions allowed) and returns the chain at every `as_of` date. Consecutive birth times with identical chains are merged into ranges, so the output shows only where the chains change. Up to 3,601 birth times and 200 dates per call.
- `current_timezone` (string, optional): IANA timezone where the native lives now; adds `start_local`/`end_local` to every period, as above
- `drill_down` (array, optional): Up to 5 sign abbreviations naming a period to divide, like left-clicking a period in JHora. `["Ta"]` lists the antardashas of the Ta mahadasha; `["Ta", "Vi", "Aq"]` lists the sookshmas of Ta MD › Vi AD › Aq PD; five signs list the deha periods. If a sign appears twice in a list, the first one is used.
- `sweep_output` (string, optional): `ranges`, `flips` (per date, only the birth offsets where the chain changes, with the chain before and after), or `auto` (default: flips when ranges would exceed about 25,000 tokens)
- `event_tests` (array, optional): with a sweep, e.g. `[{"id":"move","as_of":"2026-09-22T12:00:00+05:30","level":5,"expect":["Sc"]}]` (or `{"house_from_lagna":[4,11]}` with `latitude`/`longitude`). Returns each test's birth-time windows, their intersection, the best subset when they conflict, and the junction (signed days to the nearest boundary at the tested and the next level)
- `gati_list` (object, optional): `{"from":"2015-01-01","to":"2030-01-01","levels":2}` lists every Simhavalokana, Manduka, Markati and other jump with its path, signs and dates; `near_events` adds the nearest event and the gap in days
- `ayanamsa_override` (string, optional): research only; the response warns that Kalachakra is extremely sensitive to the ayanamsa

**Returns:** `settings`, the Moon's position, `birth_time_sensitivity`, the ayanamsa used, direction (Savya/Apasavya), Paramayush, Deha, Jiva, the running chain down to deha (`current`, with `ends_in` and `next` per level), the requested sub-period list (`drill_down`), and with `output: "full"` every mahadasha with its antardashas. Each period carries `gati` when the dasha jumps into it (Simhavalokana, Manduka or Markati) and `cycle_restart` where the SM Singh cycle begins again. With a list of `as_of` dates you get `chains`; with `birth_time_sweep` you get `ranges`.

Example: rectifying against life events in one call

```json
{
  "datetime": "1999-06-06T15:30:00+05:30",
  "as_of": ["2017-06-01T12:00:00+05:30", "2026-09-22T12:00:00+05:30"],
  "levels": 3,
  "birth_time_sweep": { "from_seconds": -600, "to_seconds": 600, "step_seconds": 1 }
}
```

### `calculate_gochar`

Transits over a natal chart, with finished answers.

**Parameters:** `datetime`, `latitude`, `longitude` (birth); `as_of` (date or list of up to 200, default now); `from`/`to` (search range); `search_planets`, `search_events` (`sign`, `nakshatra`, `station`); `orb` (default 1°); `kantaka_includes_first` (default false); `ayanamsa`, `node_type`, `position_type`, `output`, `current_timezone`.

**Returns:** each graha's position, nakshatra and pada, house from the natal Moon and lagna and KP house; Saturn's Sade Sati (rising/peak/setting), Ashtama, Kantaka and Ardhashtama, each with the episode's start, end and spans (retrograde re-entries give several spans); Jupiter, Rahu and Ketu stays; tara bala and chandra bala with the time they change; Jupiter/Saturn/Rahu/Ketu within the orb of natal planets, cusps or the Bhrigu Bindu with the exact dates; and for a range, every Saturn episode, Jupiter/Rahu/Ketu sign stay, ingress and station. Ingress times are within about a second; stations are refined to the second.

### `calculate_ruling_planets`

KP ruling planets for a moment and place (default now, IST): the day lord (weekday from sunrise), the Moon's and the lagna's sign, star and sub lords, the ordered set with Rahu/Ketu added when they represent a ruling planet, and the cleaned set without retrograde planets (`keep_retrograde` keeps them). With `birth_datetime`, the hour trigger says whether the transit Moon's or the rising degree's sub lord equals a running Vimshottari lord, and at which level.

### `rectify_by_transit`

Birth-time anchors from transits, e.g. `{"as_of":"2025-12-01","planet":"Jupiter","target":"cusp10"}` (targets `cusp1`-`cusp12`, `lagna`, `mc` or a natal planet). For each anchor, the birth time within `window_seconds` (default 600) that puts the natal target exactly on the transiting planet, with the residuals at the window edges; then the least-squares best birth time over the anchors that can be solved, its RMS residual and the spread of the single-anchor solutions.

### Reference checks

Every reference value comes from one chart, Sagar (6 June 1999, 15:30:00 IST, Bhavnagar 21°46'N 72°09'E), in Jagannatha Hora with Traditional Lahiri; `test/fixtures/jhora-sagar.json` holds them. JH was on mean nodes for the first screens and on true nodes (the server's default) from the Basics, KP and D-7/D-10/D-60 screens on; the one mean-node value that depends on the nodes (Rahu's Vimshopaka) is checked with `node_type: "mean"`.

| Feature | Checked against (JH screen) | Result |
|---|---|---|
| Kalachakra | text export, 88 periods from mahadasha to deha; summary line | every sign and pada label matches; times within 52 s; Apasavya, Paramayush 83, Deha Ta, Jiva Ge |
| Vimshottari | maha dasas | lords match; ends within 15 s to 2030, then JH's larger future delta-T moves its dates earlier by about 1.5 s a year (141 s by 2112) |
| Positions | Basics table | every graha within 0.5" (Rahu 0.3"); the lagna is 12.61" above JH's, which subtracts the ayanamsa without nutation from the true ascendant |
| D-3, D-7, D-9, D-10, D-60 | charts | all nine grahas and the lagna |
| KP lords | KP tab | star, sub and sub-sub lords of the lagna and all 12 bodies (Uranus, Neptune, Pluto too). JH's KP cusps in this file are equal houses from the lagna; the server's are Placidus |
| Ashtakavarga | SAV and BAV charts | every bindu shown matches (default tables) |
| Shadbala | bar graphs and Other strengths | sthana, dig, cheshta, drik and naisargika to the displayed precision; totals within 1.3 virupas (JH's day strength is 0.8 higher, Venus's kala bala another 0.5; causes open); rupas within 0.02 |
| Ishta/Kashta | Other strengths | within 0.1 (Mercury 0.15: its cheshta is 0.24 below JH's) |
| Vimshopaka | Other strengths, four schemes | all nine grahas exact with true nodes; Rahu also with mean nodes |
| Aspect strength | aspected-body table | within 0.005% |
| KP ruling planets | KP tab, key info | lagna and Moon sign/star/sub lords and the day lord at the birth moment |
| Narayana order | JH's progression table | all 12 starting signs |
| Sade Sati spans | Saturn ingresses from swetest | span ends straddle the sign boundary at ±1.5 s |

The alternative methods (`shadbala_method: "raman"`, `ashtakavarga_tables: "bphs"`, `vimshopaka_method: "bphs"`, `drishti_rule: "bphs"`) follow B.V. Raman and BPHS as AstroSage does; the tests check them for consistency only.

`.claude/skills/swiss-ephemeris-mcp` teaches an assistant to use these tools with the fewest tokens: which tool answers which question, the compact arguments (`output: "chain"`, `levels`, `as_of` lists, `drill_down`) and real example requests and responses.

`.claude/skills/jhora-verification` records the JH settings, reference values and the procedure for checking new JH screenshots, with a script that compares a pasted JH Kalachakra export with the server.

Yogini, Ashtottari, Chara and Narayana periods, the KP blocks and the gochar states follow the documented rules (named in `settings`), but have not yet been compared period by period with Jagannatha Hora.

KP New uses the Swiss Ephemeris "Krishnamurti VP291" ayanamsa (`-sid45`), which needs a recent `swetest` build (the Dockerfile builds the latest).

## Tests

```bash
npm test
```

The suites run the reference checks above, and the rest of the features on the same chart, through the MCP interface. They need `swetest` on `PATH` and `SE_EPHE_PATH` pointing at the ephemeris files (e.g. `vendor/swisseph`); without `swetest` those tests are skipped.

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