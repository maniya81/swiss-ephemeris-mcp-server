---
name: planet-karma-analysis
description: Analyze any particular planet, house cusp, or life-domain pending karma using the Lunar Astro / Deepanshu Giri Mahakaal Nakshatra Pada method (YouTube R9KFt2Wp2Sg / Planet-Karma) combined with the Swiss Ephemeris MCP server and Nakshtra Knowledge Base/Predictive_Engine. Use whenever the user asks to analyze a specific planet's or cusp's karma, past-life debt (Karza), Karma Vipaka Samhita story/remedy, D-1 to D-9 karmic fruit, or childhood and upcoming event windows for a natal chart.
---

# Planet-Karma & Nakshatra Pada Analysis (Video `R9KFt2Wp2Sg` Method)

Execute this deterministic workflow whenever analyzing **any particular planet, house cusp, or karmic issue** in a birth chart. It strictly enforces the **5-part Mahakaal / *Karma Vipaka Samhita* diagnostic protocol** taught in `https://youtu.be/R9KFt2Wp2Sg` (*Remedies of Nakshatra Pad by Mahakaal*, Lunar Astro / Deepanshu Giri), backed by `swiss-ephemeris-mcp-server` and `Nakshtra Knowledge Base/Predictive_Engine/`.

## Core Operating Laws (From Video `R9KFt2Wp2Sg`)
1. **Unseen Debt Balances the Chart**: Perceived unfairness (working hard without recognition, property/money disputes, partner friction, sudden losses) occurs when an unpaid past-life debt (*Karza*) activates in its dasha to balance the chart's ledger (`0:15–2:35`).
2. **Masters of the Chart**: Always identify the **Ascendant (Lagna), Ascendant Lord, and Moon** (*"the two masters of the chart"*, `29:51–30:06`), alongside the target planet/cusp. Major karmic settlement triggers when the dasha/antardasha of the Ascendant Lord, Moon, target planet, or its dispositor/aspecting malefic runs (`4:54–5:20`, `20:05–20:37`).
3. **3°20' Pada Precision Over Broad Signs**: Once a Nakshatra and its **3°20' Pada** are identified, do **not** dilute the reading with generic 30° Rashi traits (`16:50–18:10`).
4. **Symbolic Story + Navamsa Sign Tracing**: Pull the exact *Karma Vipaka Samhita* Shiva–Parvati dialogue for that Pada, decode its symbolism (`3:35–3:51`), and trace **which house its Navamsa sign occupies in both D-1 and D-9** (`6:48–13:45`).
5. **No Ritual Bypass Without Settlement**: *Yantra, mantra, and tantra* cannot stop karmic payback if the native refuses to settle or release the underlying karmic pattern (`13:48–14:05`, `26:53–27:15`). Always pair **voluntary karmic settlement** with the **single-pada *KVS* remedy**.

---

## Step 0: Consultation Safety Gate
Before reading any chart, verify four mandatory filters in [00_Prediction_SOP_and_Gem_Prompt.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/00_Prediction_SOP_and_Gem_Prompt.md):
1. **`Jupiter in 2nd House (D-1 ONLY)` (*Adle ka Badla*)**: Do not deliver chart/Astro-Vastu consultations for D-1 2nd-house Jupiter (applies to D-1 only, not D-9).
2. **`Lone Moon in Lagna (D-1)`**: Do not read charts with Moon alone in the 1st house (permitted if conjoined with Jupiter or any other planet).
3. **`Child Under Age 8`**: Years `1–4` reflect Mother's karma and Years `5–8` Father's karma; the native's own D-9 Bhagya activates from **Year 9 onward**.
4. **Ongoing Deliberate Fraud / Cruelty**: If suffering stems from active cheating, usurping inheritance, abandoning elderly parents, or hate-speech, state upfront that restitution and halting the harm are mandatory prerequisites before rituals work.

---

## Step 1: Compute Exact Coordinates & Clocks via MCP (Never Guess)
Follow the [swiss-ephemeris-mcp](../swiss-ephemeris-mcp/SKILL.md) skill and run exact tool calls (local `index.js` or MCP):

1. **Equal-House (`30° Bhava Madhya`) Map + Target Nakshatra**:
   ```json
   // Tool: nakshatra_house_map
   {
     "datetime": "YYYY-MM-DDTHH:MM:SS+05:30",
     "latitude": 0.0,
     "longitude": 0.0,
     "locate": "<TargetNakshatra>",
     "output": "chain"
   }
   ```
   - Check `ayanamsa`: use `"true_lahiri"` when matching JHora / Kalachakra (default on general tools is `"traditional_lahiri"`).
   - Check `borderline` and `charan_window`; if `borderline: true`, run one shifted call at the boundary edge ± 1–2 s instead of guessing.

2. **Full Natal Chart, Vargas, Strengths & Dashas**:
   ```json
   // Tool: calculate_vedic_chart
   {
     "datetime": "YYYY-MM-DDTHH:MM:SS+05:30",
     "latitude": 0.0,
     "longitude": 0.0,
     "ayanamsa": "true_lahiri",
     "output": "chain",
     "levels": 5,
     "include": ["dignity", "vargas", "aspects", "bhavabala", "chara", "nakshatra_houses"],
     "vargas": ["D1", "D3", "D9", "D60"],
     "as_of": "YYYY-MM-DDTHH:MM:SS+05:30"
   }
   ```
   - Include `"shadbala"` / `"ashtakavarga"` when needed. For event windows (past/childhood or next `N` months), also call:
     - `calculate_kalachakra_dasha` with `gati_list: { from, to, levels: 2–4 }` and `as_of: [...]` (or `drill_down`).
     - `calculate_gochar` with `from`/`to` (`search_events: ["sign", "nakshatra", "station"]`) and `as_of: [...]` (`orb: 2`) for exact `natal_hits` and planetary stations.

---

## Step 2: Blank-Chart Cusp Baseline & Dual Planetary Layer
Consult [02_Blank_Chart_Cusps_and_Offsets_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/02_Blank_Chart_Cusps_and_Offsets_Matrix.md) and [03_Planet_in_Nakshatra_and_Snapshots_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/03_Planet_in_Nakshatra_and_Snapshots_Matrix.md):

1. **Blank-Chart Cusp First (Planets Stripped)**:
   - Establish the Ascendant's sequential **Charana (`1–9`)** and Equal-House (`30° Bhava Madhya`) cusp Nakshatra-Pada for the target house.
   - Fire **Mythological Relative Offsets** from the target Nakshatra (e.g., from **Ashwini**: 3rd/4th/5th/6th/7th/8th; from **Rohini**: 5th = zero appreciation/gratitude, 7th = undeserved curse, 4th/10th = rotation `10th from 7th`; from **Mrigashira**: 9th/12th; from **Ardra**: 7th from Moon & 2nd/7th/9th in dasha; from **Punarvasu**: 3rd always afflicted) plus **3-direction Sarvatobhadra Chakra (`SBC`) aspects**.
2. **Layer the Target Planet (Resident Planet > Empty Cusp)**:
   - Read the planet **twice**:
     - **Mode A (Pure Natural *Karaka*)**: Ignore house/lordship; overlay the Nakshatra-Pada's themes directly onto the planet's natural significations.
     - **Mode B (House Lordship & Placement)**: Apply the Pada's themes and karma to the houses owned and occupied by that planet.
   - Check modifiers: **`3°20'` (1-Navamsa) tight orb**, **combustion / planetary war**, **`300%` retrograde *Cheshta Bala***, and **Ashlesha `10–20%` capacity cap vs `28°–29° / 0°` Gandanta power**.

---

## Step 3: *Karma Vipaka Samhita* Story & `D-1 ↔ D-9` Sign Tracing (Core Video Step)
Consult [01_36_Pada_Karma_Vipaka_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/01_36_Pada_Karma_Vipaka_Matrix.md) (and consolidated profiles `05`–`08` in `Predictive_Engine/` for deep narrative context):

1. **Pull the Exact `3°20'` Pada Entry (`X-Y`)**:
   - Retrieve the Lord Shiva–Maa Parvati story, past-life debt/infraction, and modern symbolic decoding (avoid naive literalism).
   - Note **Backlog Depth**: sequential Navamsa index `1–9` inside the sign shows how many lifetimes old the karma is; **Vargottama = `0` past-life backlog** (maximum free will in this life). Check **Pushkara** status and **D-3 Budha Nadi** (`100% Nakshatra Pada` vs `80% Parivartana Pada`).
2. **Trace the Pada's Navamsa Sign (`Y`) in Both Charts**:
   - **In D-1 (Seed/Action)**: Which house does Sign `Y` occupy in D-1? (In the video's `Ashwini Pada 3` example, `Gemini` Navamsa fell in the **6th house** of disputes/division/litigation while naturally signifying siblings, neighbors, documents, and driving—explaining why the karmic repayment centered on property-division disputes with siblings and father.)
   - **In D-9 (Fruit/Manifestation — active from Day 1)**: Which house does Sign `Y` occupy in D-9, and what planets sit in or aspect it? **Never compute Nakshatras inside D-9.**

---

## Step 4: Dispositor, Aspect, *Jeeva* & Conjunction Circuit
Reconstruct the full delivery chain (`R9KFt2Wp2Sg` `9:20–13:45`, `24:21–27:25`) using [04_Age_and_Dasha_Timing_Engine.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/04_Age_and_Dasha_Timing_Engine.md):

1. **Dispositor & Aspect Chain**: Check the target planet's **sign dispositor** (house, dignity, D-9 placement) and **aspects hitting the target planet/cusp** (especially `Saturn`, `Rahu`, `Ketu`, `Mars`).
2. ***Budha Nadi Jeeva* & `3/6/8/12` Vipreet**: If Planet `P` sits in Planet `J`'s Nakshatra, `J` acts as *Jeeva* delivering `P`'s owned houses during `J`'s (and `P`'s) dasha (note `3/6/8/12` Vipreet exchange exception).
3. ***Laghu Parashari* Shloka 1 Quarter & Degree Swap**:
   - **Rule 1 (`MD / 4`)**: A planet switches to its **Nakshatra Lord** in the Mahadasha quarter (`Q1–Q4`) matching its occupied Pada (`1–4`), unless in its own Nakshatra.
   - **Exception 1**: If the Nakshatra Lord sits with planet `X`, then `MD–X` flips to `NL + X` immediately.
   - **Exception 2 (`3–5` Conjoined Planets)**: Sort conjoined planets lowest degree to highest; **Lowest ↔ Highest swap**, **2nd-lowest ↔ 2nd-highest swap**, middle planet (odd count) stays neutral.
4. **Kaal Sarp Axis (`1, 2, 3, 4` house order)**: If planets sit trapped inside the Rahu–Ketu arc and Vimshottari misses, blend Rahu/Ketu into the trapped planet's dasha.
5. **Identify the Exact Payback Dynamic**: Clearly state *(a)* what was taken, withheld, or neglected in the past-life seed, and *(b)* who/what in this lifetime is collecting the debt or blocking peace until settled.

---

## Step 5: Multi-Clock Timing & Verification (3 Timelines + Event Windows)
Verify every karmic diagnosis across **3 Timelines** (`Pre-birth`, `Post-birth / Childhood`, and `Upcoming / Future` — or Elder Proxy if late-life):

1. **Vimshottari Dasha**: Identify exact `MD / AD / PD` windows involving the **Lagna Lord, Moon, Target Planet, its Dispositor, Nakshatra Lord (*Jeeva*), or aspecting malefics**.
2. **Kalachakra Dasha (`SM Singh`, `True Lahiri`)**: Note `Deha` and `Jiva`, highlight **`Manduka`**, **`Markati`**, and **`Simhavalokana`** Gati jumps, and rotate D-1 to the active MD/AD sign as **Dasha Lagna** (`1st` = vitality, `10th` = action).
3. **Chara Dasha + *Bhava Bala* Sum (Rashi Dashas ONLY)**: Compare active house Bhava Bala sums against `N × Chart Average` (`Sum < Threshold` = friction/grind; `Sum > Threshold` = rise/relief; neutral on `6H/8H` alone = safe).
4. **Gochar Transits & Stations**: Highlight `Rahu–Ketu` nodal axis shifts, `Saturn` Sade Sati/Kantaka/Ashtama/stations, and slow-planet `natal_hits` (`≤ 2°` orb) or stations near natal degrees/cusps.
5. **Chronological Nakshatra Ages**: Check `running year = completed age + 1` against `04_Age_and_Dasha_Timing_Engine.md`.

---

## Step 6: Voluntary Settlement, Single-Pada Remedy & Verification Tells
1. **Voluntary Karmic Settlement (Mandatory First)**: State the exact real-world behavioral shift or restitution required to stop fighting the chart's balance (e.g., releasing disputed/extra share, fair credit/gain distribution, stopping criticism of commercial people, speaking gently, caring for affected dependents).
2. **Single-Pada Master-Key Remedy Only**: Prescribe **only** the *Karma Vipaka Samhita* remedy for the specific active Pada (`01_36_Pada_Karma_Vipaka_Matrix.md`) — **never** prescribe remedies for all 9 padas of a house. Check the **Indu Lagna `6/8/12` guardrail** before recommending wealth rituals.
3. **Rapid-Fire Verification Tells**: Give 3–5 concrete observable indicators (health pattern, speech/paperwork habit, domestic/peer dynamic) from `03_Planet_in_Nakshatra_and_Snapshots_Matrix.md` so the reading can be validated against lived reality.

---

## Required Output Structure
Present every particular-karma analysis in this crisp sequence:
1. **Chart & Coordinate Verification**: Settings used (`ayanamsa`, `charan_window`, `borderline` check), Lagna/Lagna Lord/Moon ("Two Masters"), and target planet/cusp (`D-1` → `D-9` code, Vargottama/Backlog depth).
2. **Blank-Chart Cusp & Dual Planetary Reading**: Empty cusp baseline + mythological offsets → resident/target planet (`Karaka` + `Lordship` + `3°20'`/swap modifiers).
3. ***Karma Vipaka Samhita* Decoding (`D-1 Seed` ↔ `D-9 Fruit`)**: Story/symbolism, D-1 & D-9 house mapping of the Navamsa sign, dispositor/aspect/*Jeeva* circuit, and the exact payback ledger.
4. **Event Timing (Verified Past/Childhood & Upcoming Windows)**: Synchronized Vimshottari (`LP Q1–Q4`), Kalachakra (`Gati` / `Deha` / `Jiva`), Chara (`Bhava Bala`), and Gochar (`natal_hits` / stations) dates with full precision.
5. **Remedy Protocol & Behavioral Verification**: Voluntary settlement prerequisite + single-Pada *KVS* ritual remedy + testable rapid-fire snapshots.

For the complete worked example and full calculated chart from video `R9KFt2Wp2Sg` (`1970-01-07 08:50:00 IST`, Hyderabad, India — *Saturn in 4th House Ashwini Pada 3*, the sole reference example for this skill), read [references/video-method-worked-blueprint.md](./references/video-method-worked-blueprint.md).
