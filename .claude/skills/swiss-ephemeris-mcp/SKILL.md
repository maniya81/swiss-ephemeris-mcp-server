---
name: swiss-ephemeris-mcp
description: How to call the Swiss Ephemeris MCP server (Vedic/KP astrology tools calculate_vedic_chart, calculate_kalachakra_dasha, calculate_gochar, calculate_ruling_planets, rectify_by_transit, plus western positions/transits/synastry) with the fewest tokens - which tool answers which question, the arguments that keep responses small, JHora Kalachakra Dasha configuration & Deepanshu Giri / Lunar Astro predictive ruleset, and real example requests and responses. Use it whenever these tools are available and the user asks about a birth chart, lagna, nakshatra, KP sub lords, any dasha (Vimshottari, Kalachakra, Yogini, Ashtottari, Chara, Narayana), what period is running or when it ends, transits, Sade Sati, ruling planets, shadbala, ashtakavarga, vargas, or birth-time rectification - even a casual "what's my dasha now?" or "when does Saturn leave Pisces?".
---

# Swiss Ephemeris MCP: Minimal-Token Usage & Kalachakra Ruleset

Defaults already match Jagannatha Hora (JHora):
- **Kalachakra Dasha (`calculate_kalachakra_dasha` and `kalachakra_dasha` in `calculate_vedic_chart`)**:
  - **Ayanamsa**: `True Lahiri / Chitrapaksha` (`true_lahiri` — Spica in the middle of Chitra at 0° Libra, Swiss Ephemeris `-sid27`, no correction)
  - **Calculation Method**: `SM Singh` (`Full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa`)
  - **Lunar Nodes**: `True nodes`
  - **Planetary Positions**: `Geocentric positions`, `True positions` (no refraction)
  - **Starting Point & Base Chart**: `Janma tara (Moon)` in `Rasi (D-1)`
  - **Rohini 4th Pada Rule**: `Rohini 4th pada is Leo navamsa` (Parasara/BPHS consistency; never Cancer navamsa)
  - **Year Definition**: `360° Sidereal Solar Years` (True sidereal solar years)
  - **Event Lookup Sub-Period Level**: `Prana-antardasa (PAD)` (`level: 5`)
- **General Chart (`calculate_vedic_chart`, `calculate_gochar`, `calculate_ruling_planets`, `rectify_by_transit`)**: `Traditional Lahiri` (`traditional_lahiri`) or pass `ayanamsa: "true_lahiri"` to match True Lahiri across all chart blocks; geocentric true positions; true nodes; true sidereal solar years. Pass a setting only when the user asks for another one.

## Inputs (all tools)
- `datetime`: `YYYY-MM-DDTHH:mm:ss+05:30` with the seconds exactly as given (never round off seconds; 1s of birth time shifts Kalachakra by ~50–80 days). No zone given → IST (`+05:30`).
- `latitude`/`longitude`: decimal, north and east positive (Bhavnagar `21.7667, 72.15`). Kalachakra needs only `datetime`.
- Only on request: `ayanamsa` (`true_lahiri`, `kp_new` for KP users, etc.), `node_type: "mean"`, `position_type: "apparent"`.
- Error → `{"error":{"reason":"…","parameter":"vargas"}}`: fix that parameter and retry once.

## Pick the tool

| Question | Call |
|---|---|
| Lagna, planets, KP lords, running Vimshottari + Kalachakra | `calculate_vedic_chart` `output:"chain"`, `include:[]` |
| Period on several dates (events) | same, `as_of:[…]` (≤200) |
| Kalachakra detail / sub-periods (PAD / Deha) | `calculate_kalachakra_dasha` `output:"chain"` or `drill_down` |
| Transits, Sade Sati, Jupiter/Rahu stays, tara bala | `calculate_gochar` `output:"chain"` |
| Ingress/station dates | `calculate_gochar` `from`,`to`,`search_planets`,`search_events` |
| KP ruling planets, hour trigger | `calculate_ruling_planets` (+`birth_datetime`) |
| Shadbala, ashtakavarga, vargas, dignity, other dashas | `calculate_vedic_chart` `output:"chain"`, `include:[blocks]` |
| Rectify birth time from events | `calculate_kalachakra_dasha` or `calculate_vedic_chart` with `birth_time_sweep` + `event_tests` |
| Rectify from a transit on a cusp | `rectify_by_transit` |

Blocks: `dignity vargas aspects ashtakavarga shadbala bhavabala kp_significators yogini ashtottari chara narayana` (or `"all"`). Parameter list: `references/parameters.md`.

## Keep responses small (sizes for one chart)
- Always `output:"chain"`: the default `full` chart is about 18k tokens, `chain` with `include:[]` about 1.5k, with every block 2.8k. Kalachakra `full` 7k, `chain` 1.3k.
- `levels`: `2`–`3` for a quick overview, `5` (`Prana-antardasa / PAD`) for Kalachakra event lookup, `6` (to `Deha-antardasa`) when asked.
- One call for many dates (`as_of` list) instead of one call per date.
- Sub-periods of one period: `drill_down` steps (`"Ta"`, or JH labels `"Ta Dhan3"` when a sign repeats), never a full tree.
- Native abroad: `current_timezone:"Australia/Melbourne"` adds `*_local`; never convert yourself.
- Read `ends_in`/`next` from the response instead of computing dates.

---

## JHora Kalachakra Dasha Methodology & Predictive Protocol (Lunar Astro / Deepanshu Giri)

### 1. JHora Kalachakra Dasha Configuration (Default in Server)
- **Starting Point:** `Janma tara (Moon)`
- **Base Divisional Chart:** `Rasi (D-1)`
- **Ayanamsa:** `True Lahiri / Chitrapaksha` (Spica in the middle of Chitra always, `true_lahiri`)
- **Nodes & Positions:** `True nodes`, `Geocentric positions`, `True positions` (no refraction)
- **Calculation Method:** `Full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa (SM Singh)`
- **Rohini 4th Pada Rule:** `Rohini 4th pada is Leo navamsa` (Ensures consistency with Parasara/BPHS; never use Cancer navamsa).
- **Year Definition:** `360° Sidereal Solar Years` (True sidereal solar years).
- **Event Lookup Sub-Period Level:** `Prana-antardasa (PAD)` (`level: 5`).

### 2. Software Bug & Verification Constraint
- **Apasavya Discrepancy:** Even with the `SM Singh` setting enabled, standalone JHora miscalculates starting balances and sequences for certain Apasavya (counter-clockwise) nakshatra padas (e.g., Rohini 4th pada) compared to S.M. Singh's manual tables.
- **Mandatory Check:** Always cross-verify `Deha` and `Jiva` signs and the 9-sign dasha sequence against the manual BPHS / S.M. Singh Savya-Apasavya tables before predicting.

### 3. Core Movement & Gati Rules
- **Savya (Clockwise) vs. Apasavya (Counter-Clockwise):** Nakshatras are divided into two groups determining zodiacal progression and Deha-to-Jiva (Savya) vs. Jiva-to-Deha (Apasavya) flow.
- **Mandooka Gati (Frog Jump):** Skipping 1 sign (e.g., Leo to Gemini, or Aries to Gemini). Indicates sudden shifts in focus.
- **Markati Gati (Monkey Jump):** Backward movement by 1 sign (e.g., Leo to Cancer). Indicates revisiting past themes or temporary regression.
- **Simhavalokan Gati (Quantum Jump / Lion's Gaze):** Jumping 5 signs (trinal/9th–5th jump: Aries ↔ Sagittarius, or Pisces ↔ Scorpio). Triggers 180-degree life transformations ("Rags to Riches" or major status reversals).

### 4. Predictive & Chart Rotation Protocol
- **Chart Rotation:** Treat the active Mahadasha (MD) or Antardasha (AD) sign in the Rasi (`D-1`) chart as the temporary Ascendant (**Dasha Lagna** — equivalent to right-clicking the D-1 house in JHora and selecting *"Show chart from this house"*).
- **Primary Houses to Judge:** Analyze the **1st house** (self/body/new beginnings) and **10th house** (karma/status/career) from the rotated Dasha Lagna, along with planets posited in or aspecting the Dasha sign.
- **Deha & Jiva Protection/Affliction:** `Deha` represents the physical body/material wellbeing; `Jiva` represents the soul/mental state and life force. Malefic transits or dashas activating `Deha`/`Jiva` signs trigger critical health or life events.

---

## Examples (Data 9: Sagar, 1999-06-06 15:30:01 IST, Bhavnagar; responses trimmed with …)

**1. What is running now (down to PAD level 5)** - one call gives both dashas.
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
   "antardasha Cn Rohini 4 [Manduka]: 2023-05-30T23:28:33+05:30 -> 2027-05-13T09:31:37+05:30 (ends in 181d 21:31:37; next Le Mrigashira 1)",
   "pratyantardasha Ar Purva Phalguni 4: 2026-09-13T06:17:18+05:30 -> 2026-12-21T23:41:48+05:30 (ends in 39d 11:41:48; next Pi Uttara Phalguni 1)",
   "sookshma Vi Bharani 2: 2026-11-10T16:11:47+05:30 -> 2026-11-19T13:52:15+05:30 (ends in 7d 01:52:15; next Li Bharani 3)",
   "praana Cn Hasta 4: 2026-11-12T03:26:34+05:30 -> 2026-11-14T08:16:14+05:30 (ends in 1d 20:16:14; next Ge Hasta 3)"]}}}
```
Planet strings: sign degree nakshatra pada star/sub/sub-sub lords, WS = whole-sign house, KP = KP house, R = retrograde. `[Manduka]` = gati (jump) into that period.

**2. Several event dates** - `as_of` list, compact chains down to PAD (`levels: 5`).
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"include":[],"as_of":["2026-11-12T12:00:00+05:30","2026-11-19T08:00:00+05:30"],"levels":5}
```
```json
{"vimshottari_dasha":{"chains":[{"as_of":"2026-11-12T12:00:00+05:30","chain":"Saturn-Saturn-Mercury-Rahu-Mercury"},{"as_of":"2026-11-19T08:00:00+05:30","chain":"Saturn-Saturn-Mercury-Rahu-Sun"}]},
 "kalachakra_dasha":{"chains":[{"as_of":"2026-11-12T12:00:00+05:30","chain":"Ta-Cn-Ar-Vi-Cn"},{"as_of":"2026-11-19T08:00:00+05:30","chain":"Ta-Cn-Ar-Vi-Aq"}]}}
```

**3. Kalachakra sub-periods (Praana-antardasas / PADs in `Ta Dhan3 > Cn Rohi4 > Ar PPha4 > Vi Bhar2`)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","drill_down":["Ta Dhan3","Cn Rohi4","Ar PPha4","Vi Bhar2"],"output":"chain","levels":1}
```
```json
{"drill_down":{"path":[…],"praanas":[
  {"sign_abbr":"Vi","pada":"Chitra 2","start":"2026-11-10T16:11:47+05:30","end":"2026-11-11T14:51:27+05:30"},
  {"sign_abbr":"Le","pada":"Chitra 1","start":"2026-11-11T14:51:27+05:30","end":"2026-11-12T03:26:34+05:30"},
  {"sign_abbr":"Cn","pada":"Hasta 4","start":"2026-11-12T03:26:34+05:30","end":"2026-11-14T08:16:14+05:30"},
  {"sign_abbr":"Ge","pada":"Hasta 3","start":"2026-11-14T08:16:14+05:30","end":"2026-11-15T06:53:48+05:30"},
  {"sign_abbr":"Ta","pada":"Hasta 2","start":"2026-11-15T06:53:48+05:30","end":"2026-11-16T23:06:03+05:30"},
  {"sign_abbr":"Ar","pada":"Hasta 1","start":"2026-11-16T23:06:03+05:30","end":"2026-11-17T16:40:56+05:30"},
  {"sign_abbr":"Sg","pada":"Uttara Phalguni 4","gati":"Simhavalokana","start":"2026-11-17T16:40:56+05:30","end":"2026-11-18T17:47:27+05:30"},
  {"sign_abbr":"Cp","pada":"Uttara Phalguni 3","start":"2026-11-18T17:47:27+05:30","end":"2026-11-19T03:49:54+05:30"},
  {"sign_abbr":"Aq","pada":"Uttara Phalguni 2","start":"2026-11-19T03:49:54+05:30","end":"2026-11-19T13:52:15+05:30"}]}}
```

**4. Transits and Sade Sati**
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"as_of":"2026-11-12T12:00:00+05:30","output":"chain"}
```
```json
{"positions":{"Saturn":"Pi 14°25'02\" Uttara Bhadrapada 4 M2 L6 KP6 R", …},
 "saturn":["sade_sati setting: 2020-01-24T08:24:25+05:30 -> 2028-02-23T18:01:06+05:30 in 6 spans (…)", …],
 "slow":"Jupiter Le M7 L11 (2026-10-31T11:16:26+05:30 -> 2028-07-24T14:46:32+05:30, 3 spans); …", …}
```
M = house from the natal Moon, L = from the lagna. Spans include retrograde re-entries.

**5. KP ruling planets with the hour trigger**
```json
{"datetime":"2026-11-12T12:00:00+05:30","latitude":21.7667,"longitude":72.15,"birth_datetime":"1999-06-06T15:30:01+05:30"}
```
```json
{"ruling_planets":[…],"cleaned":[…],
 "hour_trigger":{"running_chain":"Saturn-Saturn-Mercury-Rahu-Mercury-…","moon_sub_lord":"…","moon_sub_lord_matches":[…],"triggered":true}}
```

**6. Strength blocks** - one line each in `chain` output.
```json
{"datetime":"1999-06-06T15:30:01+05:30","latitude":21.7667,"longitude":72.15,"output":"chain","include":["shadbala","ashtakavarga"],"levels":1}
```
```json
{"shadbala":"Su 8.99 1.8x #1, Mo 6.14 1.02x #7, Ma 7.17 1.43x #2, Me 7.49 1.07x #6, Ju 7.29 1.12x #4, Ve 7.3 1.33x #3, Sa 5.6 1.12x #5",
 "ashtakavarga":{"sav":"Ar27 Ta24 Ge21 Cn29 Le34 Vi19 Li29 Sc33 Sg31 Cp26 Aq32 Pi32 = 337 (337 ok)","bav_totals":"Su 48, Mo 49, …"}}
```
Shadbala: rupas, ratio to the required minimum, rank.

**7. Rectification against events (PAD level 5)**
```json
{"datetime":"1999-06-06T15:30:01+05:30","as_of":["2026-11-12T12:00:00+05:30"],"levels":5,
 "birth_time_sweep":{"from_seconds":-5,"to_seconds":5,"step_seconds":1},
 "event_tests":[{"id":"event1","as_of":"2026-11-12T12:00:00+05:30","level":5,"expect":["Cn"]}]}
```
```json
{"event_tests":{"tests":[{"id":"event1","passes_at_given_birth_time":true,"windows":[…,{"from_s":-0.265,"to_s":1.372,"birth_from":"1999-06-06T15:30:00.734+05:30","birth_to":"1999-06-06T15:30:02.372+05:30"}]}],"intersection":[…]}, …}
```
Give several events; `intersection` is the birth-time window all of them allow. Use `sweep_output:"flips"` if ranges are long.

## Answering
- Quote times with seconds; with `current_timezone`, give both columns (birth zone, local).
- Mention any non-default setting the response's `settings` shows.
