---
name: swiss-ephemeris-mcp
description: "How to call the Swiss Ephemeris MCP server (all 10 tools — Vedic/KP: calculate_vedic_chart, calculate_kalachakra_dasha, calculate_gochar, calculate_ruling_planets, rectify_by_transit, nakshatra_house_map; Western Tropical: calculate_planetary_positions, calculate_transits, calculate_solar_revolution, calculate_synastry) with minimal tokens, exact defaults, JHora Kalachakra & Deepanshu Giri rulesets, and verified example responses."
---

# Swiss Ephemeris MCP: Tool Guide, Defaults & Predictive Rules

## Server Defaults (match Jagannatha Hora)
- **Kalachakra Dasha (`calculate_kalachakra_dasha` and `kalachakra_dasha` in `calculate_vedic_chart`)**:
  - **Ayanamsa**: `True Lahiri / Chitrapaksha` (`true_lahiri` — Spica at 0° Libra, `-sid27`). Independent of chart `ayanamsa` unless `kalachakra_ayanamsa` / `ayanamsa_override` is passed.
  - **Method**: `SM Singh` (`Full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa`), **Janma tara (Moon)** in **Rasi (D-1)**, **Rohini 4th pada = Leo navamsa**, **360° Sidereal Solar Years**, event lookup at **Prana-antardasa (PAD)** (`level: 5`).
  - **Nodes & Positions**: `True nodes`, `Geocentric true positions` (no refraction).
- **General Vedic Tools (`calculate_vedic_chart`, `calculate_gochar`, `calculate_ruling_planets`, `rectify_by_transit`, `nakshatra_house_map`)**: `Traditional Lahiri` (`traditional_lahiri`), geocentric `true` positions, `true` nodes (`node_type: "true"`), true sidereal solar years. Pass `ayanamsa` or `node_type: "mean"` only when asked (or matching Deepanshu Giri mean-node chart examples).
- **House systems**:
  - `calculate_vedic_chart` returns **Placidus cusps** (`houses` / `cusps` and `house_kp`) plus **whole-sign** (`house_whole_sign`).
  - `nakshatra_house_map` / `nakshatra_houses` uses **equal houses from the lagna** (`cusp n = lagna + 30°·(n−1)`, bhava madhya) and **whole-sign** nakshatra placement (never Placidus cusps).
- **Western Tools (`calculate_planetary_positions`, `calculate_transits`, `calculate_solar_revolution`, `calculate_synastry`)**: Tropical zodiac (Placidus houses).

## Inputs & Compatibility Rules (all 10 tools)
- **`datetime` & timezones**: Pass ISO8601 with exact seconds and explicit UTC offset (`1999-06-06T15:30:00+05:30`; never round off seconds).
  - **Vedic tools**: an omitted offset defaults to IST (`+05:30`). Omitting `datetime` on `calculate_ruling_planets` defaults to **now in IST (`+05:30`)** regardless of `latitude`/`longitude`.
  - **Western tools**: **always pass an explicit UTC offset or `Z`** (an offsetless string is parsed in the server host's local timezone, not IST).
- **Place (`latitude`, `longitude`)**: decimal degrees, north and east positive. `calculate_kalachakra_dasha` normally needs only `datetime`, **except** `event_tests` with `expect.house_from_lagna` requires `latitude` and `longitude`.
- **Kalachakra vs Chart Ayanamsa**: `ayanamsa` changes the chart/transits/ruling planets/rectification/nakshatra map, **not** Kalachakra; to override Kalachakra, pass `kalachakra_ayanamsa` (`calculate_vedic_chart`) or `ayanamsa_override` (`calculate_kalachakra_dasha`).
- **`output: "chain"` applicability**: Supported on **4 tools** (`calculate_vedic_chart`, `calculate_kalachakra_dasha`, `calculate_gochar`, `nakshatra_house_map`; all 4 default to `"full"`). Calling `output: "chain"` on `calculate_vedic_chart` lowers default `levels` from `6` to **`3`** (`2` for extra dashas) unless you pass `levels` explicitly; passing an `as_of` list also switches to compact mode. `calculate_ruling_planets`, `rectify_by_transit`, and Western tools do **not** take `output`.
- **`current_timezone` applicability**: Supported on **4 tools** (`calculate_vedic_chart`, `calculate_kalachakra_dasha`, `calculate_gochar`, `calculate_ruling_planets`). Adds `*_local` fields converted with historical DST rules (never add offsets yourself). Not used on `nakshatra_house_map` (`charan_window` is already in birth local clock), `rectify_by_transit`, or Western tools.
- **Errors**: Tool-specific checks return `{"error":{"reason":"…","parameter":"…"}}` and schema/type checks return `InvalidParams`; fix the named parameter and retry once.

## Pick the Tool

| Question | Tool & Key Arguments |
|---|---|
| Full chart, planets, KP lords, running Vimshottari + Kalachakra | `calculate_vedic_chart` `output:"chain"`, `include:[]` (`levels:5` for PAD) |
| Running dashas on several dates (events) | Same (or `calculate_kalachakra_dasha`), `as_of:[…]` (≤200), `levels:5`, `output:"chain"` |
| Kalachakra detail / sub-periods (`drill_down`) / jump search (`gati_list`) | `calculate_kalachakra_dasha` `output:"chain"`, `drill_down:[…]`, or `gati_list:{from,to,levels?,types?,near_events?}` |
| Transits, Sade Sati, Jupiter/Rahu/Ketu stays, tara/chandra bala, natal hits | `calculate_gochar` `output:"chain"` (+`orb?`, `kantaka_includes_first?`) |
| Sign/nakshatra ingress & station dates in a range | `calculate_gochar` `from`, `to`, `search_planets?`, `search_events?`, `output:"chain"` |
| KP ruling planets & hour trigger | `calculate_ruling_planets` (`latitude`, `longitude`, optional `datetime`, `birth_datetime`) |
| Shadbala, ashtakavarga, vargas, dignity, KP significators, extra dashas | `calculate_vedic_chart` `output:"chain"`, `include:[…]` (`include:["kp_significators"]` or `kp_significators:true` + single `as_of` adds `hour_trigger`) |
| Rectify birth time from dated life events | `calculate_kalachakra_dasha` (or `calculate_vedic_chart` + `sweep_dasha`) with `birth_time_sweep` + `event_tests` |
| Rectify birth time from transits on natal cusps/lagna/MC/planets | `rectify_by_transit` `anchors:[{as_of,planet,target,weight?}]`, `window_seconds?` (`10–7200`) |
| Which nakshatra/pada is in which house, cusp nakshatras, `locate`, or lagna-only | `nakshatra_house_map` `output:"chain"` (+`locate?`); use `calculate_vedic_chart` `include:["nakshatra_houses"]` (or `locate`) only when dashas/vargas are also needed |
| Western (Tropical) chart, transits, solar return, or synastry | `calculate_planetary_positions` / `calculate_transits` (`birth_datetime`) / `calculate_solar_revolution` (`birth_*`, `return_year`) / `calculate_synastry` (`person1_*`, `person2_*`) |

Blocks for `calculate_vedic_chart` `include`: `dignity`, `vargas`, `aspects`, `ashtakavarga`, `shadbala`, `bhavabala`, `kp_significators`, `yogini`, `ashtottari`, `chara`, `narayana` (all 11 included by `"all"`), plus opt-in `nakshatra_houses` (auto-included if `locate` is passed). Full reference: `references/parameters.md`.

## Keep Responses Small (approximate tokens for one chart)
- `calculate_vedic_chart`: `full` ~18k, `chain` with `include:[]` ~1.5k, with `include:"all"` ~2.8k; `nakshatra_houses` in `chain` ~0.7k (always < 1.5k).
- `calculate_kalachakra_dasha`: `full` ~7k, `chain` ~1.3k.
- Use `levels`: `2–3` for an overview, `5` (`PAD`) for Kalachakra event lookup, `6` (`Deha`) when asked.
- Use `as_of:[…]` instead of looping calls; use `drill_down` (`["Ta"]`, or `"Sc Visa1"` / `"Sc#2"` when a sign repeats) instead of a full tree.
- Read `ends_in`/`next` directly instead of computing dates manually.

---

## Kalachakra Dasha Methodology & Predictive Protocol (Lunar Astro / Deepanshu Giri)

### 1. Calculation & Software Constraint
- **Server vs. Standalone JHora**: Standalone Jagannatha Hora can miscalculate starting balances and sequences for certain Apasavya padas (e.g., Rohini 4th pada). This MCP server already implements S.M. Singh's exact Savya/Apasavya tables (`Rohini 4th pada = Leo navamsa`), so trust and report the server's `deha`, `jiva`, and dasha sequences directly without manual recomputation.

### 2. Core Movement & Gati Rules (as emitted by the server)
- **Savya vs. Apasavya**: Determines clockwise vs. counter-clockwise progression and Deha↔Jiva direction.
- **`Manduka` (Frog Jump)**: Skips 1 sign (`+2` or `-2` zodiac signs, e.g. `Le → Ge`, `Cn → Ta`). Signals sudden shifts in focus.
- **`Markati` (Monkey Jump)**: The `Cn ↔ Le` step (`±1` sign) immediately adjacent to a `Manduka` jump (e.g. `Ta/Cn → Ta/Le [Markati] → Ta/Ge [Manduka]`). Signals backtracking or transitional adjustments.
- **`Simhavalokana` (Lion's Gaze)**: Trinal jump across `4` or `8` signs (1/5/9 relation, e.g. `Ar ↔ Sg`, `Pi ↔ Sc`). Triggers major reversals / breakthroughs.
- **`other jump` / `cycle_restart`**: Non-adjacent leaps outside Manduka/Markati/Simhavalokana and restarts of the 9-sign cycle (queryable in bulk via `gati_list`).

### 3. Chart Rotation & Judgment
- **Chart Rotation**: Treat the active Mahadasha (`MD`) or Antardasha (`AD`) sign in Rasi (`D-1`) as temporary Ascendant (**Dasha Lagna**). Judge the **1st house** (vitality/beginnings) and **10th house** (karma/status) from Dasha Lagna plus planets in/aspecting that sign.
- **Deha & Jiva**: `Deha` = physical body/health; `Jiva` = soul/mind/life force. Malefic transits or dashas hitting `Deha`/`Jiva` indicate critical health or life-turning triggers.

---

## Verified Core Examples (Data 9: 1999-06-06T15:30:01+05:30, Bhavnagar `21.7667, 72.15`; trimmed with `…`)

**1. Running dashas to PAD (`levels: 5`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"output":"chain","include":[],"as_of":"2026-11-12T12:00:00+05:30","levels":5}
```
```json
{"lagna":"Li 0°39'46\" Chitra 3 Ma/Me/Ve",
 "planets":{"Moon":"Aq 12°05'24\" Shatabhisha 2 Ra/Sa/Ra WS5 KP5", …},
 "vimshottari_dasha":{"current":{"chain":"Saturn-Saturn-Mercury-Rahu-Mercury","levels":[
   "mahadasha Saturn: 2026-02-08T22:41:19+05:30 -> 2045-02-08T19:32:37+05:30 (ends in 6663d 07:32:37; next Mercury)", …]}},
 "kalachakra_dasha":{"direction":"Apasavya","paramayush":83,"deha":"Ta","jiva":"Ge","current":{"chain":"Ta-Cn-Ar-Vi-Cn","levels":[
   "mahadasha Ta Dhanishta 3: 2014-01-01T11:08:03+05:30 -> 2030-01-01T13:32:49+05:30 (ends in 1146d 01:32:49; next Ge Purva Bhadrapada 3)",
   "antardasha Cn Rohini 4 [Manduka]: 2023-05-30T23:28:33+05:30 -> 2027-05-13T09:31:37+05:30 (ends in 181d 21:31:37; next Le Mrigashira 1)", …]}}}
```
Legend: planet strings carry `sign degree nakshatra pada star/sub/sub-sub`, `WS` = whole-sign house, `KP` = KP house, `R` = retrograde.

**2. Several event dates (`as_of` list auto-compacts)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"include":[],"as_of":["2026-11-12T12:00:00+05:30","2026-11-19T08:00:00+05:30"],"levels":5,"output":"chain"}
```
```json
{"vimshottari_dasha":{"chains":[{"as_of":"2026-11-12T12:00:00+05:30","chain":"Saturn-Saturn-Mercury-Rahu-Mercury"},{"as_of":"2026-11-19T08:00:00+05:30","chain":"Saturn-Saturn-Mercury-Rahu-Sun"}]},
 "kalachakra_dasha":{"chains":[{"as_of":"2026-11-12T12:00:00+05:30","chain":"Ta-Cn-Ar-Vi-Cn"},{"as_of":"2026-11-19T08:00:00+05:30","chain":"Ta-Cn-Ar-Vi-Aq"}]}}
```

**3. Kalachakra sub-periods (`drill_down`) & jump search (`gati_list`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","drill_down":["Ta Dhan3","Cn Rohi4","Ar PPha4","Vi Bhar2"],"output":"chain","levels":1}
```
```json
{"datetime":"1999-06-06T15:30:01+05:30","gati_list":{"from":"2025-01-01","to":"2030-01-01","levels":2,"near_events":["2026-11-12T12:00:00+05:30"]}}
```

**4. Transits and Sade Sati (`calculate_gochar`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"as_of":"2026-11-12T12:00:00+05:30","output":"chain"}
```

**5. KP ruling planets + hour trigger (`calculate_ruling_planets`)**
```json
{"datetime":"2026-11-12T12:00:00+05:30","latitude":21.7667,"longitude":72.15,"birth_datetime":"1999-06-06T15:30:01+05:30"}
```

**6. Strength blocks (`calculate_vedic_chart` with `include:["shadbala","ashtakavarga"]`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"output":"chain","include":["shadbala","ashtakavarga"],"levels":1}
```

**7. Rectification (`birth_time_sweep` + `event_tests`, or `rectify_by_transit`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","as_of":["2026-11-12T12:00:00+05:30"],"levels":5,
 "birth_time_sweep":{"from_seconds":-5,"to_seconds":5,"step_seconds":1},
 "event_tests":[{"id":"event1","as_of":"2026-11-12T12:00:00+05:30","system":"kalachakra","level":5,"expect":["Cn"]}]}
```
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"window_seconds":600,
 "anchors":[{"as_of":"2025-12-01T12:00:00+05:30","planet":"Jupiter","target":"cusp10"}]}
```

## Answering Guidelines
- Quote timestamps and longitudes with full precision (seconds / arc-seconds); with `current_timezone`, show both columns (birth zone and current local time).
- Always state any non-default setting echoed in `settings` (`node_type`, `ayanamsa`, `position_type`).

---

## Nakshatra-House Mapping (`nakshatra_house_map` / `nakshatra_houses`) — Format & Rules

### Calling Rules
- **Default tool**: Call `nakshatra_house_map` with `output: "chain"` (+ `locate` if asking about a specific nakshatra, or `lagna` alone when no birth time/place is given).
- Use `calculate_vedic_chart` (`include: ["nakshatra_houses"]`, or `locate` which auto-includes it) **only** when dashas, KP lords, vargas, or strengths are also needed in the same response.
- **Exact `±15°` boundary spans (`bhava_span`)**: Call with `output: "full"` (or compute `cusp ± 15°`) when checking whether a degree near `0°` or `30°` touches an adjacent house's `±15°` span.
- **Dual-sign nakshatras (`locate`)**: For Krittika, Mrigashira, Punarvasu, Uttara Phalguni, Chitra, Vishakha, Uttara Ashadha, Dhanishta, or Purva Bhadrapada, `locate` spans **two** houses (`houses 10 & 11`) and splits `nth_from` spans (e.g. `3rd H12/1 (Ge 26°40'00"-30°00'00" & Cn 0°00'00"-10°00'00")`); list both houses and note which (if either) carries the cusp.
- **Borderline counterfactuals (`borderline: true`)**: When explaining what the cusp padas and D-9 lagna become just across the pada edge, make one shifted call at the boundary timestamp (`charan_window` edge ± 1–2 s) or shifted `lagna` degree instead of guessing.
- **Nodes note**: Deepanshu Giri's book examples use `node_type: "mean"`; pass `"node_type":"mean"` only when asked or reproducing those examples, otherwise keep the default `"true"` and reflect `settings`/`basis` in your footer.

### Answer Formatting
1. **Full map for one chart**:
   - Lead with the lagna degree (`D°MM'SS"`), sign, nakshatra + pada, and `lagna_charan` (*"That's charan N, so every equal-house cusp falls in the Nth charan of its sign."*).
   - Render a 5-column Markdown table: `| House | Sign | Cusp nakshatra | Nakshatras in the house | Planets |` using full names (`Planet (Nakshatra pada)` or `—`).
   - Close with `charan_window` safety note (or `⚠` borderline warning) and italic footer (*`*Equal houses, sidereal Lahiri, <true/mean> node. The cusp is the middle of the house.*`*).
2. **Finding one nakshatra (`locate`)**:
   - State the house(s) and sign(s), `on_cusp` status (or which nakshatra/pada sits on that cusp instead), and planets inside it (`pos`, pada, D-9 sign).
   - Report relevant `nth_from` spans (`3rd`, `4th`, `5th`, `7th`, `8th` from the nakshatra) that hold a cusp or planets.
   - Add a `⚠` borderline warning if `borderline: true` showing what changes on the other side of the edge (verified by a shifted call if citing shifted D-9 lagna/cusps) and noting planetary nakshatra placements stay unchanged.
3. **Lagna degree only (no birth time)**:
   - State `lagna_charan` and list all 12 cusps on one line separated by ` · ` (`1 <Nak> <pada> · 2 <Nak> <pada> · …`).
   - If `borderline: true`, add a `⚠` warning noting distance (`margin`) to the nearest charan edge and how all 12 cusps shift across it; note planets and birth-time window are omitted because only lagna was provided.

### Interpretation Rules (Deepanshu Giri Method)
- **Cusp nakshatra governs the house**: Because all 12 equal-house cusps share `lagna_charan`, judge each house primarily by its **cusp nakshatra-pada**, not other nakshatras in that sign.
- **Non-cusp nakshatras (`on_cusp: false`)**: Actively triggered only when a **planet occupies that nakshatra** (delivery agent) or during its lord's dasha/transits; if empty, it remains mostly dormant.
- **Secondary carryover**: Even when empty and off-cusp, a nakshatra in the sign gives a low-potency background influence (thoughts, discussions, minor tendencies rather than full physical manifestation) on its house and opposite (7th-from) house.
- **Exact `±15°` house boundaries**: Because the cusp is the house midpoint (`cusp ± 15°`), the very start or end of a sign can touch the adjacent house's `±15°` span (`bhava_span` in `output: "full"`).

---

### Worked MCP Examples (verified against server output)

#### Example 1: Full map + chart via `calculate_vedic_chart` (`output: "chain"`)

**You ask:** "Chart 1: 12 Jan 1965, 18:50, Mumbai (mean nodes). Which nakshatra is in which house?"

**Tool call:**
```json
{"datetime":"1965-01-12T18:50:00+05:30","latitude":18.9667,"longitude":72.8333,
 "node_type":"mean","output":"chain","include":["nakshatra_houses"]}
```

**Tool returns (`result.nakshatra_houses`, trimmed):**
```json
{"basis":"equal houses from lagna, cusp = middle, sidereal Traditional Lahiri, true positions, mean node",
 "lagna":"Cn 6°23'15\" Pushya 1","lagna_charan":2,
 "margin":"1005\" (+75.1 s / -822.7 s)","charan_window":"18:36:17.3 – 18:51:15.1","borderline":false,
 "houses":["1 Cn cusp 6°23'15\" Pushya 1 (Sa, D9 Le) | Punarvasu 4, Pushya 1-4, Ashlesha 1-4 |", …,
   "10 Ar cusp 6°23'15\" Ashwini 2 (Ke, D9 Ta) | Ashwini 1-4, Bharani 1-4, Krittika 1 | Mo Bharani 2, Ju Bharani 3", …],
 "vargottama_cusps":[]}
```

**Answer:**

> Lagna is 6°23′15″ Cancer, Pushya pada 1. That's charan 2, so every equal-house cusp falls in the 2nd charan of its sign.
>
> | House | Sign | Cusp nakshatra | Nakshatras in the house | Planets |
> |---|---|---|---|---|
> | 1 | Cancer | Pushya 1 | Punarvasu 4, Pushya 1-4, Ashlesha 1-4 | — |
> | 2 | Leo | Magha 2 | Magha 1-4, Purva Phalguni 1-4, Uttara Phalguni 1 | — |
> | 3 | Virgo | Uttara Phalguni 3 | Uttara Phalguni 2-4, Hasta 1-4, Chitra 1-2 | Mars (Uttara Phalguni 2) |
> | 4 | Libra | Chitra 4 | Chitra 3-4, Swati 1-4, Vishakha 1-3 | — |
> | 5 | Scorpio | Anuradha 1 | Vishakha 4, Anuradha 1-4, Jyeshtha 1-4 | Ketu (Jyeshtha 4) |
> | 6 | Sagittarius | Mula 2 | Mula 1-4, Purva Ashadha 1-4, Uttara Ashadha 1 | Sun (Uttara Ashadha 1), Mercury (Mula 2), Venus (Mula 3) |
> | 7 | Capricorn | Uttara Ashadha 3 | Uttara Ashadha 2-4, Shravana 1-4, Dhanishta 1-2 | — |
> | 8 | Aquarius | Dhanishta 4 | Dhanishta 3-4, Shatabhisha 1-4, Purva Bhadrapada 1-3 | Saturn (Shatabhisha 1) |
> | 9 | Pisces | Uttara Bhadrapada 1 | Purva Bhadrapada 4, Uttara Bhadrapada 1-4, Revati 1-4 | — |
> | 10 | Aries | **Ashwini 2** | Ashwini 1-4, Bharani 1-4, Krittika 1 | Moon (Bharani 2), Jupiter (Bharani 3) |
> | 11 | Taurus | Krittika 3 | Krittika 2-4, Rohini 1-4, Mrigashira 1-2 | Rahu (Mrigashira 2) |
> | 12 | Gemini | Mrigashira 4 | Mrigashira 3-4, Ardra 1-4, Punarvasu 1-3 | — |
>
> The lagna keeps this pada for births between 18:36:17.3 and 18:51:15.1 (`-822.7 s` / `+75.1 s`), so the result is safe.
>
> *Equal houses, sidereal Traditional Lahiri, mean node. The cusp is the middle of the house.*

---

#### Example 2: Finding one nakshatra (`nakshatra_house_map` + `locate`)

**You ask:** "DS Doctor chart (28 Mar 1968, 05:22, Delhi, mean nodes). Where is Ashwini?"

**Tool call:**
```json
{"datetime":"1968-03-28T05:22:00+05:30","latitude":28.6667,"longitude":77.2167,
 "node_type":"mean","locate":"Ashwini","output":"chain"}
```
*(Because `borderline: true` with `-1.5 s`, follow with one shifted call at `1968-03-28T05:21:58+05:30` to verify the earlier D-9 lagna and cusps.)*

**Tool returns (trimmed):**
```json
{"lagna":"Aq 23°20'32\" Purva Bhadrapada 2","lagna_charan":8,
 "margin":"32\" (+563.3 s / -1.5 s)","charan_window":"05:21:58.5 – 05:31:23.3","borderline":true,
 "warnings":["All 12 cusps change pada if the birth time is 1.5 s earlier."],
 "locate":"Ashwini: house 3, not on cusp (cusp in H3 Bharani 4), planets: Ma Ar 6°36'10\" P2 (D9 Taurus); nth_from: 5th H7 (Le 0°00'00\"-13°20'00\"): Ju Le 3°22'19\" Magha 2 (D9 Taurus)"}
```

**Answer:**

> Ashwini is in your **3rd house** (Aries), but it isn't on the cusp. The 3rd cusp is 23°20′32″ Aries, in Bharani pada 4. So Ashwini operates through the planet posited in it: **Mars at 6°36′10″ Aries, Ashwini pada 2** (D-9 Taurus).
>
> Counted from Ashwini (the same `0°00′00″–13°20′00″` span in later signs), the **5th** falls in Leo (`0°00′00″–13°20′00″`), your 7th house, where retrograde **Jupiter sits at 3°22′19″ Leo** (Magha pada 2, D-9 Taurus).
>
> ⚠ Your lagna changed pada only 1.5 s before the recorded birth time (`charan_window` starts at `05:21:58.5`). Born 2 seconds earlier (`05:21:58`), the lagna shifts to Purva Bhadrapada 1, the 3rd cusp to Bharani 3, and the D-9 lagna from Taurus to Aries. Mars's Ashwini 2 placement doesn't change either way.

---

#### Example 3: Lagna degree only, no birth time (`nakshatra_house_map` with `lagna`)

**You ask:** "My lagna is Capricorn 9°58′. Which nakshatra is on each house?"

**Tool call:**
```json
{"lagna":"Capricorn 9°58'","output":"chain"}
```
*(Because `borderline: true`, also check `"Cp 10°00'00\""` if stating the next-charan shift.)*

**Tool returns (trimmed):**
```json
{"basis":"equal houses from lagna, cusp = middle, sidereal Traditional Lahiri, true positions, true node",
 "lagna":"Cp 9°58'00\" Uttara Ashadha 4","lagna_charan":3,"margin":"120\" (2'00\")","borderline":true,
 "warnings":["Lagna is 2'00\" (120\") from the nearest pada edge; all 12 cusps change pada across this boundary."],
 "houses":["1 Cp cusp 9°58'00\" Uttara Ashadha 4 (Su, D9 Pi) | … |", …, "4 Ar cusp 9°58'00\" Ashwini 3 (Ke, D9 Ge) | … |", …],
 "notes":"Lagna-only input: there are no planets and no birth-time window (charan_window). Only equal-house cusp nakshatras, sign nakshatra contents, and lagna margin to the nearest pada edge are computed."}
```

**Answer:**

> A 9°58′00″ Capricorn lagna is charan 3, so every cusp is the 3rd charan of its sign:
>
> 1 Uttara Ashadha 4 · 2 Shatabhisha 1 · 3 Uttara Bhadrapada 2 · **4 Ashwini 3** · 5 Krittika 4 · 6 Ardra 1 · 7 Pushya 2 · 8 Magha 3 · 9 Uttara Phalguni 4 · 10 Swati 1 · 11 Anuradha 2 · 12 Mula 3
>
> ⚠ Your lagna is only 2′00″ (`120″`) below the next charan edge (`10°00′00″` Capricorn). If it is actually `10°00′00″` or higher, every cusp moves up one step: the 1st becomes Shravana 1 (D-9 Aries) and the 4th becomes **Ashwini 4** (D-9 Cancer). Share your birth date, time, and place to confirm which applies (`charan_window` and planets aren't available from lagna alone).

---

#### Example 4: Cusp check + `nth_from` + borderline shift (`nakshatra_house_map` with `locate`)

**You ask:** "Chart 9 (22 Oct 1983, 02:58, Pune, mean nodes). Is Ashwini on a cusp, and what's in the 7th from Ashwini?"

**Tool call:**
```json
{"datetime":"1983-10-22T02:58:00+05:30","latitude":18.5333,"longitude":73.8667,
 "node_type":"mean","locate":"Ashwini","output":"chain"}
```
*(Follow with one shifted call at `1983-10-22T02:58:08+05:30` since `borderline: true` at `+7.8 s`.)*

**Tool returns (trimmed):**
```json
{"lagna":"Le 13°18'09\" Magha 4","lagna_charan":4,
 "margin":"111\" (+7.8 s / -845.9 s)","charan_window":"02:43:54.1 – 02:58:07.8","borderline":true,
 "warnings":["All 12 cusps change pada if the birth time is 7.8 s later."],
 "locate":"Ashwini: house 9, on cusp (pada 4), planets: Mo Ar 4°04'39\" P2 (D9 Taurus); nth_from: 3rd H11 (Ge 0°00'00\"-13°20'00\") [cusp]; 4th H12 (Cn 0°00'00\"-13°20'00\") [cusp]; 5th H1 (Le 0°00'00\"-13°20'00\") [cusp]; 7th H3 (Li 0°00'00\"-13°20'00\") [cusp]: Su Li 4°17'20\" Chitra 4 (D9 Scorpio), Sa Li 12°29'30\" Swati 2 (D9 Capricorn); 8th H4 (Sc 0°00'00\"-13°20'00\") [cusp]"}
```

**Answer:**

> Yes. Ashwini is in your **9th house** (Aries) and the 9th cusp (`13°18′09″` Aries) sits in **Ashwini pada 4**. The **Moon** is also in Ashwini at `4°04′39″` Aries, pada 2 (D-9 Taurus).
>
> The **7th from Ashwini** is Libra `0°00′00″–13°20′00″` (your **3rd house**): the 3rd cusp falls inside that span along with the **Sun (`4°17′20″` Libra, Chitra 4)** and **Saturn (`12°29′30″` Libra, Swati 2)**.
>
> ⚠ This birth time is borderline: `+7.8 s` later (`02:58:08`) puts the lagna in Purva Phalguni 1, which moves the 9th cusp to **Bharani 1** and changes the D-9 lagna from Cancer to Leo. The Moon's Ashwini 2 placement doesn't change.
