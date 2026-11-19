# Trigger-Indexed Nakshatra & Pending Karma Predictive Engine — SOP, MCP Integration & Gem Prompt

> **Purpose**: This `Predictive_Engine/` (`00`–`08`) reorganizes the entire 12-session Nakshatra & Pending Karma curriculum (plus **Ashwini** Round-2 enrichments and resolved clarifications from Deepanshu Giri's Class PPT, *Predict Using Nakshatra Padas Parts 1–3*, and all 12 *Lunar Astro Magazines 2022–2024*) from **lecture chronology** into **query-indexed lookup matrices, timing calculators, and consolidated Nakshatra profiles** so a local AI agent or astrologer can execute deterministic, high-precision chart predictions without missing scattered cross-lecture rules.  
> **Source Precedence (`[Tier 1]` > `[Tier 2]`)**: **`[Tier 1 — Core Deepanshu Giri]`** (lectures, PPTs, books, Deepanshu/Lunar Astro Research articles) is always binding and overrides any conflict with **`[Tier 2 — Lunar Astro Magazine Enrichment]`** contributor articles. *(All 12 Lunar Astro Magazines (2022–2024) audited, including visual header inspection of all 208 image-only pages in `2022/Vol-2.pdf` and `2022/vol-3.pdf` — 0 Ashwini articles.)*  
> **Local-First Priority**: Built for local CLI/MCP prediction (`swiss-ephemeris-mcp-server`), Claude Projects, or NotebookLM without artificial file-count caps. (`../Gemini_Gem_10_Files/` is a Round-1 legacy archive.)

---

## 1. Predictive Engine Architecture (`00`–`08`)

| File | Engine Layer | When to Consult During a Reading |
| :--- | :--- | :--- |
| **`00_Prediction_SOP_and_Gem_Prompt.md`** | **Master SOP & System Prompt** | Step-by-step 7-stage diagnostic pipeline, MCP tool recipes, safety gates, ASR glossary, & Gem prompt |
| **`01_36_Pada_Karma_Vipaka_Matrix.md`** | **Coordinate Lookup (`0° Ar – 30° Cn`)** | Instant `O(1)` lookup by exact `3°20'` Pada (`1-1` to `4-12` + extra padas): past-life cause, `D-1→D-9` fruit, Vargottama/Pushkara/D-3 status, age trigger, & exact Pada remedy |
| **`02_Blank_Chart_Cusps_and_Offsets_Matrix.md`** | **Blank-Chart & Spatial Engine** | Continuous `1–9` Charana matching table, `H1`–`H12` cusp matrix, all mythological relative offsets (`3rd/4th/5th/7th/8th` etc.), 3-direction `SBC` aspects, Indu Lagna guardrails, & Astro-Vastu |
| **`03_Planet_in_Nakshatra_and_Snapshots_Matrix.md`** | **Dual Planet, Snapshot & Remedy Engine** | `Planet × Nakshatra` grid (`Mode A: Pure Karaka` vs `Mode B: Lordship`), multi-planet yogas, Rapid-Fire physical/behavioral client tells, & Master Remedy Compendium |
| **`04_Age_and_Dasha_Timing_Engine.md`** | **Multi-Clock Timing Calculator** | Chronological Age Table (`Age 0`–`64+`), *Laghu Parashari* Shloka 1 (`MD/4` quarter + conjunction + `3–5` planet degree-swap), *Jeeva* & `3/6/8/12` Vipreet, Kaal Sarp blending, Bhava Bala sum, & Superficial Moon Tithi |
| **`05_Consolidated_Aries_Ashwini_Bharani_Krittika.md`** | **Consolidated Master Profile (Aries)** | Every rule, story, Q&A refinement, remedy, and live chart for **Ashwini, Bharani & Krittika** merged across Lectures `01`–`12` |
| **`06_Consolidated_Taurus_Rohini_Mrigashira.md`** | **Consolidated Master Profile (Taurus)** | Every rule, story, Q&A refinement, remedy, and live chart for **Rohini & Mrigashira** merged across Lectures `01`–`12` |
| **`07_Consolidated_Gemini_Ardra_Punarvasu.md`** | **Consolidated Master Profile (Gemini)** | Every rule, story, Q&A refinement, remedy, and live chart for **Ardra & Punarvasu** merged across Lectures `01`–`12` |
| **`08_Consolidated_Cancer_Pushya_Ashlesha_and_Master_Charts.md`** | **Consolidated Master Profile (Cancer + `10–27`)** | Complete profiles for **Pushya & Ashlesha**, rules taught for Nakshatras `10–27` (`Magha`–`Revati`), & multi-layer live chart syntheses (`L04, L11, L12`) |

---

## 2. Deterministic 7-Step Prediction SOP (Standard Operating Procedure)

Never dump generic traits when analyzing a chart. Execute these **7 sequential stages** on every chart:

### Step 0: Safety, Ethics & Consultation Prohibition Gate
Before reading any chart, check four mandatory filters:
1. **`Jupiter in 2nd House (D-1 ONLY)` — *Adle ka Badla* Prohibition** `[L09:L197-L211]`:
   - **Stop**: Never give astrological consultations, chart readings, or Astro-Vastu remedies to a native with **Jupiter in the 2nd house in D-1** (even if retrograde or aspected from the 8th by Saturn+Venus).
   - **Why**: Ancestral Brahmin-harassment debt transfers directly onto the astrologer within **2–3 days** (accidents, stomach/organ injury, lost contracts, family fights, gold loss), and routine mantra japa does not shield against it. *(Hiring them as employees or giving non-chart advice is safe; Jupiter in 2nd only in D-9 is safe.)*
2. **`Lone Moon in Lagna (D-1)` Prohibition** `[L09:L207-L209]`:
   - Do not read charts where **Moon sits alone in the 1st house** (native refuses to listen/accept). If Moon is joined by **Jupiter or any other planet** in Lagna, reading is permitted.
3. **`Child Under Age 8` Filter** `[L09:L95]`:
   - Never analyze a child's chart before **Age 8** (`Years 1–4` = Mother's karma; `Years 5–8` = Father's karma; native's own 9th division / `D-9` activates from the **9th year onward**).
4. **Non-Remediable Ongoing Adharma Filter** `[L01:L173-L177, L12:L48, L71-L75]`:
   - Where suffering stems from deliberate ongoing cruelty or fraud (cheating a partner via legal loopholes, withholding a sister's/father's rightful share, letting aged parents suffer unpaid, or continuous abusive hate-speech), **no gemstone, Shradh, or ritual will work** until the native makes restitution and stops the behavior.

---

### Step 1: Blank-Chart Cusp & Relative Offset Scan *(Planets Stripped)*
> **Reference**: `02_Blank_Chart_Cusps_and_Offsets_Matrix.md`

1. **Extract Ascendant Degree & Charana Index (`1–9`)** `[L01:L13-L21, L02:L9-L11, L04:L57-L67, L11:L1]`:
   - Strip all planets mentally. Cast with **Lahiri Ayanamsa** (`लाहिड़ी अयनांश`) and identify which **charana (`1` to `9`) within the `30°` rising sign** holds the Ascendant degree (`0°00'–3°20'` = Charana 1 … `26°40'–30°00'` = Charana 9; note Fire signs `1, 5, 9` all start Navamsa from Aries `1` `[L01:L159]`).
   - Apply **Equal Houses (`30°` *Bhava Madhya*, `cusp n = lagna + 30°·(n−1)`)**: every house (`H1`–`H12`) takes that **exact same sequential charana index (`1–9`)** in its respective sign. *(Do not use KP Placidus start-cusps without verifying raw degrees `[L07:L85]`; note Sripati is also confirmed acceptable in JHora for cusp lookup `[L09:L173]`.)*
   - If the Ascendant sits within ~1 minute of a sign border (*Bhava Sandhi*), verify via the **D-9 rising sign** or fire 10–15 **Paribhramana** test predictions from each candidate Lagna `[L03:L189-L191, L08:L141]`.
2. **Diagnose House Cusps Falling in Nakshatras `1–9` & Unified 4-Layer Empty Ashwini Rule** `[L01:L15, L93-L95, L11:L1-L51]`:
   - Look up each house whose cusp falls in `Ashwini` through `Ashlesha` (or `Chitra/Vishakha/Mula` 1st/9th padas) in `02_Blank_Chart_Cusps_and_Offsets_Matrix.md`. For **Ashwini**, enforce `Book Part-1` blank-chart cusp triggers: **Soul-Entry 3-Parameter Ketu Triangle & *Santan Anusthan*** (`pp. 12–13`: birth awaits family of similar nature, land, and planetary time alignment; lifestyle discipline/rituals attract a noble soul), pioneer/from-scratch career, **3rd-attempt stabilization (`Ketu = Triangle`)**, **`5H` late college completion / subject switch (`p. 13`)**, **`12H` two-stage spending** (hesitates, seeks advice & returns items on 1st attempt `[p. 24]`, yet spends impulsively once decisively triggered `[L01:L89]`), **`7H` hurried/lightweight event logistics vs. persona spotlight (`Q2`)**, hidden/triangular/remote property, and **psychological/invisible struggles (`p. 14`)**.
   - **Unified 4-Layer Empty Ashwini House Hierarchy (MANDATORY when `0°–13°20'` Aries is empty)**: (1) Blank-chart cusp & relative offsets, (2) **Ketu** for healing mode (`PPT p. 7`), (3) **Mars** + sign element for action/transport medium (`L01:L93-L95`, `PPT p. 8`), (4) **SBC aspects** onto Ashwini (`Rohini, Purva, Jyeshtha` — "unplugged power socket" rule, `2024/Vol-1 p. 5`).
   - Check distance from cusp, **Ashwini Yogtara (`10°` & `13°` Aries `±1°`, `2024/Vol-2 p. 80`)**, and degree dignity markers (`Q3`): Sun's deep exaltation (*paramochcha*) = **`10°00'` Aries** (`P3/P4` boundary), whereas Saturn's classical deep debilitation = **`20°` Aries in Bharani** (`Book P1 pp. 27–28` uses `10°` Ashwini only as Saturn's sharp impatient job-quitting friction point). Full cusp potency holds within `0°–13°20'`; if the cusp shifts past the boundary (e.g., `15°` Aries Lagna puts `0°–13°20'` Ashwini into the **12th house** `[L01:L79]`, or `18°` Libra spills `8°` `[L04:L9]`), potency reduces or shifts houses.
3. **Fire All Mythological Relative House Offsets Automatically**:
   - **From Ashwini (`0°–13°20'` Aries)** `[L01:L39-L81, L111-L126, L12:L38-L43]`, `[PPT pp. 2, 3, 9]`, `[Book Part-1 pp. 24, 33; Part-2 p. 87]`:
     - `1st (Ashwini House)`: Urgency, refuses heavy load when moving fast (yet can bear heavy load under duty/Saturn), **1st-attempt blockage** (takes 2–3 tries), shows off / craves spotlight to attract `7th` (while 7H event/ceremony logistics stay hurried and lightweight `[Q2]`).
     - `3rd from Ashwini (Gemini 0°–13°20')`: Yama–Yami taboo/incest/cousin/20-year age-gap relationships defended openly in daylight **AND direct D-1 Sign of Abortion (`PPT p. 2`)**.
     - `4th from Ashwini (Cancer 0°–13°20')`: Surya–Sanjana non-consensual sexual pressure/molestation (planet karaka = victim; escalates to full rape if **Mars+Rahu** or **Saturn+Mars+Rahu** afflict, especially in `8th house`).
     - `5th from Ashwini (Leo 0°–13°20')` **& Any Planet in Leo (`0°–30°`) / Sun**: Dadhichi *Vidya Chori* — exploiting technical/legal loopholes, stealing restricted knowledge, abdominal/stomach issues, **`[N-1..N]` Age 33** setback; per `PPT p. 9` + `Book P1 p. 33`, **Sun OR any planet anywhere in Leo (`0°–30°`, especially `0°–13°20'`) delivers Ashwini's curse**.
     - `6th from Ashwini (Virgo 0°–13°20')`: **`[N-1..N]` Age 24** cheating/deceit/thieves.
     - `7th from Ashwini (Libra 0°–13°20')`: Chyavana partner sickness/unfitness & **open-daylight, mutually consented non-monogamy (`NO money` & NO secret prostitution by default)** at **`[N-1..N]` Ages 20 & 30** (`Q9`); **Explicit Paid Modifier (`पैसा देके`, `[L01:L47]`)** applies **ONLY when the 7th-from-Ashwini house falls in or connects to `3H, 6H, or 12H`** (often with Mercury; still open between spouses). **Overrides**: cusp `>13°20'` Ar = partner permits, native does not act; **Chyavana Test** = acting on it (even consented or paid) fails the loyalty test and ruins luck, whereas remaining faithful heals the partner.
     - `8th from Ashwini (Scorpio / Jyeshtha)` **& Hasta Incompatibility**: Mutual rivalry with **Jyeshtha** AND **Hasta** (`Book P2 p. 87`); main karmic downfall year at **`[N-1..N]` Age 34**.
   - **From Krittika** `[L03:L77-L83, L109-L111, L185]`:
     - `4th from Krittika`: Mother/caretaker falsely blamed.
     - `7th from Krittika`: Svaha disguise/illusion, secret unearned help out of pure desire, or last-minute wedding obstacle.
     - `9th from Krittika`: Agni/father unaware of native's birth or early affairs.
   - **From Rohini** `[L05:L27-L31, L51, L61, L79, L155]`:
     - `5th from Rohini`: Brahma's mind-born sons' refusal → **zero appreciation, gratitude, or return on expectations**.
     - `7th from Rohini`: Undeserved relationship/partner curse triggered by the other party's fault.
     - `4th / 10th Rotation`: When Rohini is in `4th` or `10th`, rotate (`4th = 10th from 7th` = spouse's family/career).
   - **From Mrigashira** `[L06:L107-L113]`:
     - `9th & 12th from Mrigashira`: Brihaspati's wrath → chronic anxiety, disrespect, harsh speech (`बदतमीजी`), banking/interest traps, and bedroom/ritual disruptions.
   - **From Ardra** `[L07:L75, L95]`:
     - `7th from Moon-in-Ardra` is spoiled; during any Ardra planet's dasha, the **`2nd, 7th, and 9th` houses from that planet** suffer destabilization.
   - **From Punarvasu** `[L08:L33, L75-L79]`:
     - **`3rd house from Punarvasu`** (whether from Lagna, Moon, or any planet in Punarvasu) is **always afflicted** with sibling/neighbor rivalry and struggle.
4. **Check Sarvatobhadra Chakra (`SBC`) 3-Direction Aspects** `[L02:L143-L159, L04:L151, L05:L171-L175]`:
   - Even an empty Nakshatra activates fully if aspected in `SBC` (always take **all 3 aspect directions** regardless of planetary speed; **Abhijit** is used *only* in `SBC`).
   - E.g., planets in **Magha, Anuradha, or Krittika** always aspect and trigger **Bharani**; **Ashwini** aspects **Rohini, Purva, and Jyeshtha**.

---

### Step 2: Dual Planet-in-Nakshatra Layer *(Adding Planets Over Cusps)*
> **Reference**: `03_Planet_in_Nakshatra_and_Snapshots_Matrix.md`

1. **Dominance Rule**: When a house has a Lagna-projected Pada AND a resident planet in a different Nakshatra, the **resident planet's Nakshatra and D-9 sign dominate** over the empty house pada `[L04:L171]`.
2. **Apply the Dual Planetary Reading Method** `[L04:L21, L27-L35, L05:L11-L15, L08:L75-L83]`:
   - **Mode A (Pure Natural Karaka — forget house & lordships)**: Overlay the Nakshatra's behavior directly onto the planet's natural significations (`Sun` = father/vitality/ego; `Moon` = mother/mind/home choice/liquids; `Mars` = brother/daily dress code/uniformed groups/surgery; `Mercury` = phone/childhood/kids/siblings/maternal uncles/stairs/emails; `Jupiter` = guru/education/wisdom; `Venus` = spouse [male & female charts!]/vehicles/arts; `Saturn` = servants/subordinates/CA/IT/shoes/broom/old people; `Rahu` = paternal grandfather/11th gains/cheating/foreign/experimental tech; `Ketu` = Ganesha/altar/progeny/moksha; `Gulika/Mandi` = poison/intoxicants/combative sports/family split).
   - **Mode B (House Lordship & Placement)**: Apply the Nakshatra's themes and curses to the **houses ruled by that planet** (e.g., `4th lord` in Krittika = mother behaves like Krittika; `7th lord` = spouse/marriage sustainability).
3. **Check Special Planetary Modifiers**:
   - **Exact Conjunction Affliction Orb = `3°20'` (1 Navamsa)** `[L08:L83-L85, L09:L215]`: Planets within `3°20'` afflict/fuse sharply; `6°–10°` separation is mild/general.
   - **Ignore Nakshatra Lord's D-1 Dignity** `[L02:L155, L03:L179-L181]`: Nakshatras are autonomous `220V` power sources; even if a Nakshatra's ruling planet is debilitated or afflicted in D-1, the Nakshatra itself is **not** damaged unless malefics sit inside it or hit it in `SBC`.
   - **Retrograde Planet = `300% Cheshta Bala`** `[L01:L169, L03:L145, L07:L189]`: Triples intensity, reverses motion (e.g., Retrograde Jupiter in Ashwini = Olympic backstroke swimmer), or causes *Kama Agni* perversions when Mars/Venus/1st/7th lord is retrograde in Krittika.
   - **Ashlesha `10–20%` Capacity Cap vs. `28°–29° / 0°` Gandanta Power** `[L10:P2:L23, L33-L35, L101]`: Any planet in Ashlesha delivers only `10–20%` of its capacity slowly (heavily controlled by its depositor), whereas a planet or Lagna right at **`28°–29°` Cancer or `0°` Leo (Gandanta)** delivers extraordinary power.
   - **10th House 4 Karma Karakas (*Purusha Sukta*)** `[L12:L135]`: Use `Jupiter` for intellectuals/teachers (Saturn's labor effect ceases), `Mars` for protectors/warriors, `Mercury` for pure traders, and `Saturn` for physical/ground survival workers.

---

### Step 3: `D-1` (Seed) → `D-9` (Fruit) Pending Karma Diagnosis
> **Reference**: `01_36_Pada_Karma_Vipaka_Matrix.md`

1. **Map Every Key Planet & Cusp to Its Universal `Rashi#–Navamsa#` Code (`1-1` to `4-12`) & 12-Sign Keyword Backbone** `[L01:L121-L151, L06:L117-L141, L09:L103-L165, L12:L37-L109]`, `[Book P1 p. 11]`:
   - `D-1` shows the **seed/action** (past-life or current-life moral choice); `D-9` (active from Day 1 `[L09:L93, L12:L89]`) shows the **fruit/manifested suffering**.
   - **Deepanshu Giri 12-Sign Keyword Backbone (`Book P1 p. 11`)**: `Ar` = high energy, start of life/new; `Ta` = resources, family, money, eyes; `Ge` = communication, trader, hands, cruel for money; `Cn` = peace, harmony, masses, food, water, emotional; `Le` = chair, power, deeds of past life, kids, honour, king; `Vi` = hard work, questions, servant; `Li` = balance, marriage, society, relationships; `Sc` = hidden sign, problems, inheritance; `Sg` = flag of religion, long-term goals, father, guru, boss; `Cp` = father's family, profession; `Aq` = friends, gains, salary; `Pi` = end of life, sleep, expenses.
   - Locate **which house in the `D-9` chart** holds that Pada's Navamsa sign (e.g., Pushya Pada 2 = `4-6` Virgo; if Virgo is the `2nd house` of D-9 → family loan; if `4th house` of D-9 → property/mother's loan `[L09:L129-L131, L213]`).
   - **Never compute Nakshatras inside `D-9`** — read only signs, houses, and planetary placements in `D-9` `[L02:L203, L09:L93-L95]`.
2. **Check Past-Life Backlog Depth & Potency Tiers**:
   - **Navamsa Index (`1–9`) = Birth Backlog Count** `[L01:L155-L157]`: Shows how many births ago the karma originated (`9th Navamsa` = deepest backlog, least free will).
   - **Vargottama (`1-1` Ashwini P1, `2-2` Rohini P1, `3-3` Punarvasu P3, `4-4` Punarvasu P4, etc.)** `[L01:L155-L159]`: **Zero past-life backlog** — karma belongs to this lifetime with **maximum free will**.
   - **Pushkara Padas** (e.g., Bharani P3 `1-7`, Krittika P1 `1-9` & P3 `2-2`) `[L02:L115, L03:L129]`: Planets deliver material significations strongly.
   - **Budha / Dhruva Nadi Drekkana (`D-3`) Potency** `[L12:L1-L15, L181]`: Designated `100% Nakshatra Padas` (e.g., Aries Ashwini Pada 1) defeat `80% Parivartana Padas` (`2–3` planets = crorepati; `>= 4` = public figure; `all` = spiritual renunciate; in `6th house` = hard taskmaster that breaks native down to redirect them higher).
3. **Verify Across 3 Timelines & Higher Vargas** `[L02:L75, L04:L163, L05:L161, L06:L163-L167, L07:L165-L183, L10:P2:L155]`:
   - Hierarchy: **`D-6 > D-9 > D-1`** (confirm severe vices like prostitution via `D-9` 10th house `2/8/12` links + `D-60` `[L02:L75]`).
   - Verify every pending karma across: (1) **Pre-birth** (father/ancestors via reverse dasha circuit), (2) **Post-birth** (native's lived events), and (3) **Elder Proxy** (checking grandfather/maternal uncle/aunt if the native hasn't reached an old-age curse milestone like `3-7` yet `[L06:L163-L167]`).

---

### Step 4: Multi-Clock Timing Pinpoint
> **Reference**: `04_Age_and_Dasha_Timing_Engine.md`

Run all active timing clocks simultaneously to narrow down exact years, months, and days:
1. **Clock 1 — Chronological Nakshatra Age Triggers & Ketu Cusp Rule**:
   - Check the native's **running year (`completed age + 1`)** (`Book Direct Ages 28, 29 Good / 42, 46 Bad`, and check the **`[N-1 to N]` running-year window** for Ashwini Relative Offset Ages `20, 24, 26, 30, 33, 34`; `[L10:P2:L65]` Age 17 = 16 completed) against `04_Age_and_Dasha_Timing_Engine.md`. *(Keep the `3-yr & 8-yr` reset cycle anchored primarily in **Bharani**, applying it to Ashwini strictly as a secondary combined-Aries [`Ashwini–Bharani–Krittika P1`] zero-restart cycle gated by active planetary natural ages `28–32 Ma, 33–36 Me, 36–42 Sa, 42/48 reset`.)*
   - **Ketu Dasha Blanket Cusp Trigger (`Book Part-1 p. 23`)**: Whenever **Ketu Mahadasha** runs, whichever house cusp falls in Ashwini activates automatically regardless of Ketu's natal placement.
   - If Lagna and Moon sit in different Nakshatras, synthesize via the **Phase-1 Sequential Life-Progression (`Ashwini` → `Jyeshtha`)** `[L12:L143-L149]`.
2. **Clock 2 — *Laghu Parashari* Shloka 1 Quarter Timing & Exceptions (`Vimshottari / Ashtottari`)** `[L11:L89-L129]`:
   - **Rule 1 (`MD / 4` Quarter)**: Divide total Mahadasha years by `4`. The planet gives its **own** results in 3 quarters and switches to its **Nakshatra Lord's** results (and activates any Nakshatra curse) specifically in the **quarter (`Q1–Q4`) matching its occupied Pada (`1–4`)** (unless placed in its **own Nakshatra**, where it stays 100% itself). Mentally replace the MD lord with the Nakshatra Lord when reading running AD snapshots. *(Applies to MDs and long ~3-yr ADs; skip short ~6-month ADs.)*
   - **Exception 1 (Nakshatra Lord Conjoined with $X$)**: Even outside the active Pada quarter, if the Nakshatra Lord sits with planet $X$, then during **$X$'s Antardasha**, the MD immediately delivers **`Nakshatra Lord + X`** results.
   - **Exception 2 (`3, 4, or 5` Conjoined Planets Degree Pair-Swap)**: Sort conjoined planets in a sign from lowest degree to highest: **Lowest ↔ Highest swap**, **2nd-lowest ↔ 2nd-highest swap**, and the exact **middle planet (in 3- or 5-planet conjunctions)** stays **neutral ("odd one out")** giving its own results.
3. **Clock 3 — *Budha Nadi Jeeva* & `3/6/8/12` Vipreet Exchange** `[L12:L17-L37]`:
   - If Planet $P$ sits in Planet $J$'s Nakshatra, **$J$ is the *Jeeva*** controlling $P$'s owned houses during $J$'s (and $P$'s) dasha regardless of sign connections.
   - If `3, 6, 8, or 12` lords sit in each other's Nakshatras or exchange signs/nakshatras (*Seshadri Iyer*), two negatives combine into positive Rajayoga results.
4. **Clock 4 — Kaal Sarp `1,2,3,4` Dasha Blending** `[L10:P2:L31-L41, L83]`:
   - Count houses in standard order (`1, 2, 3, 4...`). If all planets (or 3–4 trapped planets) sit inside the Rahu–Ketu arc and a well-placed planet fails to deliver in Vimshottari, **blend Rahu/Ketu into that planet's dasha** (e.g., read Mercury MD as `Rahu + Mercury`).
5. **Clock 5 — Rashi/Chara Dasha *Bhava Bala* Sum Formula** *(Rashi Dashas ONLY)* `[L12:L118-L126]`:
   - Compute $\text{Chart Avg} = \frac{1}{12}\sum_{h=1}^{12} \text{BhavaBala}(h)$. For $N$ active Rashi-dasha levels (`MD+AD+PD...`), compare $\sum_{i=1}^{N} \text{BhavaBala}(\text{House}_i)$ against $N \times \text{Chart Avg}$ (`Sum > Threshold` = rise/success; `Sum < Threshold` = downturn; neutral/average score on **6th or 8th house** alone = safe).
6. **Clock 6 — Kalachakra Dasha, Pre-Birth Circuit & Superficial Moon Tithi**:
   - Rotate D-1 to the active **Kalachakra / Chakra Dasha sign** as temporary Lagna (`1st` = vitality, `10th` = action) and run Kalachakra backward before birth (or trace the `Nakshatra Lord + Sign Dispositor + Conjoined Planet` circuit before and after birth) `[L02:L195-L197, L04:L103-L105, L07:L165-L183]`.
   - For daily / 15-day recurring events, count **2 Tithis per sign (`0°–15°` and `15°–30°`)** forward from the natal Moon's Birth Tithi to today's **Superficial Moon Tithi** `[L12:L127-L133]`.

---

### Step 5: Deep Nakshatra Context & Case-Study Pattern Matching
> **Reference**: `05` (Aries), `06` (Taurus), `07` (Gemini), `08` (Cancer + `10–27` & Live Charts)

Cross-check the dominant Nakshatra(s) (Ascendant Nakshatra = physical body & presentation; Moon Nakshatra = mindset/thinking `[L04:L163]`; Lagna Lord Nakshatra; 7th/10th Cusp Nakshatras) in the consolidated profiles (`05`–`08`) to pull mythological nuances and matching live case studies.

---

### Step 6: Rapid-Fire Verification Snapshots & Master-Key Remedy
> **Reference**: `03_Planet_in_Nakshatra_and_Snapshots_Matrix.md` & `01_36_Pada_Karma_Vipaka_Matrix.md`

1. **Rapid-Fire Behavioral Confirmation** `[L03:L15-L17, L167-L169]`:
   - State 5–8 hyper-specific observable habits/tells from `03_Planet_in_Nakshatra_and_Snapshots_Matrix.md` (e.g., clothing/dress pattern, gait/walk, nose/scars, travel packing, middle-lane driving, backpack zipper symmetry, eating while driving/studying, never getting fully nude, broken chargers/water filters, stair-talking) to verify the chart's operating nakshatras.
2. **Single-Pada Master-Key Remedy & Guardrails** `[L04:L153-L155, L06:L141, L08:L49, L163-L175]`:
   - **Never prescribe remedies for all 9 padas in a house** — prescribe *only* the exact cusp pada's or afflicted planet pada's remedy from `01_36_Pada_Karma_Vipaka_Matrix.md` `[L06:L141]`.
   - **Check Vastu (`"Jahan dasha kaam nahi aayegi wahan disha kaam aayegi"`)** `[L08:L49]`.
   - **Indu Lagna Wealth Guardrail**: Before prescribing Indu Lagna activation (e.g., honey soap for Ashwini, chair for Magha), verify that **neither Indu Lagna nor its Sign Lord or Nakshatra Lord sits in or rules the `6th, 8th, or 12th` houses** — otherwise wealth activation triggers disease, fights, or losses `[L01:L199-L201, L08:L163-L175]`.
   - **Shiva vs. Vishnu Mantra Selection** `[L02:L105-L109, L03:L227]`: Shiva mantras (*Mahamrityunjaya*) confront and destroy/transform through crisis head-on; Vishnu mantras (*Hare Rama Hare Krishna Mahamantra*) preserve, shelter, and shield peacefully (mandatory 1-hour shield when Bharani activates).

---

## 3. Exact `swiss-ephemeris-mcp-server` Tool Call Workflow

When connected to the `swiss-ephemeris-mcp` server, run these **2 compact tool calls** first (total ~2.5k tokens) instead of guessing any coordinate:

1. **Equal-House (`30° Bhava Madhya`) Cusps & Nakshatra/Pada House Map**:
   ```json
   // Tool: nakshatra_house_map
   {
     "datetime": "1979-08-16T05:25:20+05:30",
     "latitude": 21.7667,
     "longitude": 72.15,
     "output": "chain"
   }
   ```
   *Why*: Computes exact Equal-House *Bhava Madhya* cusps (`cusp n = lagna + 30°·(n−1)`) and maps every Nakshatra/Pada to its whole-sign and equal house automatically.

2. **Full Natal Chart, `D-9`/`D-60`/`D-3`/`D-6` Vargas, `Bhava Bala`, `Chara Dasha`, `Vimshottari`, & `S.M. Singh Kalachakra Dasha`**:
   ```json
   // Tool: calculate_vedic_chart
   {
     "datetime": "1979-08-16T05:25:20+05:30",
     "latitude": 21.7667,
     "longitude": 72.15,
     "output": "chain",
     "levels": 5,
     "include": ["dignity", "vargas", "bhavabala", "chara", "nakshatra_houses"],
     "as_of": "2026-11-18T12:00:00+05:30"
   }
   ```
   *(Pass `"node_type": "mean"` only when matching a specific mean-node class example; use `calculate_kalachakra_dasha` with `drill_down` or `gati_list` for deep Kalachakra jump analysis, and `calculate_gochar` with `output: "chain"` for transits.)*

---

## 4. Ready-to-Paste Gemini Gem / Claude Project System Prompt

Copy and paste the block below into your **Gemini Gem "Instructions"** box (and upload files `01` through `08` from this `Predictive_Engine/` folder):

```text
You are an elite Vedic Nakshatra & Pending Karma Astrologer powered by the attached Trigger-Indexed Predictive Engine (`01_36_Pada_Karma_Vipaka_Matrix.md` through `08_Consolidated_Cancer_Pushya_Ashlesha_and_Master_Charts.md`).

Whenever given a chart, birth details, or astrological question, execute this strict 7-Step Diagnostic Protocol:

1. SAFETY & PROHIBITION GATE:
   - Check D-1 Jupiter in 2nd House ("Adle ka Badla" ancestral Brahmin backlash), Lone Moon in Lagna (without planetary conjunction), and native Age < 8.
   - Where suffering comes from ongoing deliberate fraud/cruelty (cheating partners, withholding sister's/parent's share, abusive hate-speech), state that real-world restitution is mandatory before any ritual works.

2. BLANK-CHART CUSP, YOGTARA & RELATIVE OFFSET SCAN (`02_Blank_Chart_Cusps_and_Offsets_Matrix.md`):
   - Before reading planets, cast with Lahiri Ayanamsa, take the Ascendant degree's sequential charana (1–9 in the 30° sign; fire signs 1/5/9 all start Navamsa from Aries 1), and map Equal-House (30° Bhava Madhya) cusps across all 12 houses. Check Ashwini Yogtara degrees (10° & 13° Aries ±1°) for peak intensity/planned births, plus degree dignity distinctions (Sun paramochcha = 10°00' Ar P3/P4 boundary vs. Saturn classical deep debilitation = 20° Ar Bharani; Book P1 pp. 27–28 10° Ashwini = Saturn's impatient job-start friction).
   - Apply Book P1 Ashwini cusp triggers: Soul-Entry 3-parameter Ketu Triangle & Santan Anusthan (family, land, planetary time alignment), 3rd-attempt stabilization, 5H late college/subject switch, 12H two-stage spending (hesitates/seeks advice/returns purchases on 1st attempt, yet spends impulsively once decisively triggered), 7H hurried/lightweight logistics vs. persona spotlight, remote/triangular property, and psychological struggles.
   - If Ashwini (0°–13°20' Aries) is empty, apply the Unified 4-Layer Hierarchy: (1) Blank-chart cusp & offsets, (2) Ketu (healing channel), (3) Mars + sign element (action & transport medium), (4) SBC aspects onto Ashwini (Rohini/Purva/Jyeshtha).
   - Automatically evaluate all mythological relative house offsets from prominent Nakshatras (3rd from Ashwini Gemini 0°–13°20' = BOTH incest/taboo AND direct abortion; 4th molestation; 5th Leo 0°–13°20' AND Sun/any planet in Leo 0°–30° curse; 6th/7th/8th from Ashwini plus Hasta/Jyeshtha incompatibility; 7th-from-Ashwini default open/free vs. 3/6/12 paid modifier + >13°20' & Chyavana loyalty overrides; 4th/7th/9th from Krittika; 5th/7th & 4th/10th rotation from Rohini; 9th/12th from Mrigashira; 2nd/7th/9th from Ardra; 3rd from Punarvasu) plus 3-direction Sarvatobhadra Chakra (SBC) aspects.

3. DUAL PLANET-IN-NAKSHATRA LAYER (`03_Planet_in_Nakshatra_and_Snapshots_Matrix.md`):
   - Resident planets override empty house padas. Read every planet twice: (a) Pure Natural Karaka (ignoring house/lordship), and (b) House Lordship & Placement. Apply Book Techniques #2 ("Experience After Deceptions") and #3 ("Horse Rider's Effect") plus Sign-Lord Element = Transport Medium for Ashwini.
   - Apply the House + Lord + Karaka event triad (using Venus as spouse karaka for both male & female charts), 3°20' (1-Navamsa) conjunction orbs, retrograde 300% Cheshta Bala, Ashlesha 10–20% attenuation vs. 28°–29°/0° Gandanta power, and the 4 Purusha-Sukta 10th-house Karma Karakas.

4. D-1 (SEED) -> D-9 (FRUIT) PADA LOOKUP (`01_36_Pada_Karma_Vipaka_Matrix.md`):
   - Apply Deepanshu's 12-Sign Keyword Backbone (Ar = energy/start; Ta = resources/family/money/eyes; Ge = comm./trader/hands/cruel for money; Cn = peace/masses/food/water/emotional; Le = chair/power/past deeds/kids/honour/king; Vi = hard work/questions/servant; Li = balance/marriage/society/relations; Sc = hidden/problems/inheritance; Sg = religion/long-term/father/guru/boss; Cp = father's family/profession; Aq = friends/gains/salary; Pi = end/sleep/expenses).
   - Look up every key cusp and planet in the 36-Pada Matrix by its exact D-1 Rashi# -> D-9 Navamsa# code (1-1 to 4-12), including Ashwini's unified oral + named KVS stories (P1 Narhari, P2 Shwetverma, P3 Chol Singh, P4 Laxman).
   - Identify which house that Navamsa sign occupies in D-9 (active from Day 1; never compute nakshatras inside D-9). Note Vargottama (zero past-life backlog) vs. 1–9 Navamsa backlog depth, Pushkara Padas, and Budha Nadi D-3 (100% Nakshatra Pada vs. 80% Parivartana Pada).

5. MULTI-CLOCK TIMING PINPOINT (`04_Age_and_Dasha_Timing_Engine.md`):
   - Cross-check: (a) Chronological Age Triggers using Running Year (completed age + 1) for Ashwini Direct Good Ages 28, 29 / Bad 42, 46, and the [N-1..N] running-year window for Ashwini Offset Ages 20, 24, 26, 30, 33, 34 (keeping the 3 & 8-yr reset cycle anchored primarily in Bharani, and for Ashwini strictly as a secondary combined-Aries cycle gated by active planetary natural ages 28-32 Ma, 33-36 Me, 36-42 Sa, 42/48 reset) + Ketu Dasha Blanket Cusp Trigger & Phase-1 Life Sequence, (b) Laghu Parashari Shloka 1 Quarter Timing (`Mahadasha / 4` active Pada quarter + Exception 1 NL Conjunction + Exception 2 Outside-In Degree Pair-Swap for 3–5 conjoined planets), (c) Budha Nadi Jeeva & Seshadri Iyer 3/6/8/12 Vipreet exchange, (d) Kaal Sarp 1,2,3,4 Vimshottari blending, (e) Rashi-dasha Bhava Bala Average Sum, (f) Kalachakra Dasha rotation & reverse pre-birth circuit, and (g) Superficial Moon Tithi (2 Tithis/sign).

6. RAPID-FIRE VERIFICATION & MASTER-KEY REMEDY (`03` & `01`):
   - Provide concrete, testable behavioral/physical snapshots (walk, voice, dress, travel, driving lane, food habits, charger/filter/shoe tells) to validate the chart.
   - Prescribe only the exact single-pada remedy, Vastu correction, and restitution rule (verifying Indu Lagna is free of 6/8/12 house/lord/dispositor links before activating wealth remedies).

7. SOURCE PRECEDENCE & CITATION DISCIPLINE:
   - `[Tier 1 — Core Deepanshu Giri]` rules (Lectures, PPTs, Predict Using Nakshatra Padas Books 1–3, Deepanshu/Lunar Astro Research articles) always take precedence over `[Tier 2 — Lunar Astro Magazine Enrichment]` contributor rules.
   - Ground every rule, Karma Vipaka story, age trigger, and remedy strictly in the attached files and cite `[L01:L#]`..`[L12:L#]`, `[PPT p.#]`, `[Book P1–P3]`, or `[2022–2024 Vol-#]`. Never invent ungrounded textbook filler.
```

---

## 5. Universal Whisper Hindi ASR Decoding Reference

When cross-checking `[L#]` citations against the verbatim Hindi transcripts in `../Nakshtra Txt/`:

| Verbatim ASR Token | Decoded Astrological Meaning | Lectures |
| :--- | :--- | :--- |
| `कस` / `कस्प` / `कष्ट` / `कश्यप` (with degrees) | **Cusp** (*Bhava Madhya* / House Cusp) | `01, 03, 06, 07, 09` |
| `मास` / `मांस` | **Mars** (planet), **Magha** (`मार्ग चार`), or **Meat** (`मांस` in KVS stories) | `01, 04, 05, 06, 07` |
| `मार्ग चार` / `माघ के चार` | **Magha Pada 4** | `01` |
| `पड़ा` / `पहाड़ा` / `पदावन` | **Pada** / **Pada 1** | `01, 03, 11` |
| `लंशा` | **Lahiri Ayanamsa** (`लाहिड़ी अयनांश`, user-verified; paired with Equal House *Bhava Madhya*) | `01` |
| `आंखें खोलनी` | **Blindness (`आंखें खोनी पड़ी थी`)** — Rishi Chyavana blinded by Sukanya's mistake (Class PPT p. 4) | `01` |
| `चाइनीस जमीन` | ***Pushtaini* (Ancestral) Land (`पुश्तैनी ज़मीन`)** worth crores | `01` |
| `₹00` (Ashwini cow price) | **₹25,000** for a cow; **₹30,000** for a good cow with calf | `01` |
| `159 का तो जी` | **Fire signs (`1, 5, 9` — Aries, Leo, Sagittarius)** start Navamsa from Aries (`1`); Aries 1st Charana = Vargottama | `01` |
| `चक्रदशा` *(at `L01:L203`)* | **Kalachakra Dasha** in JHora *(note: Lecture `02` separately discusses **Chakra Dasha** with Savana Year)* | `01` |
| `लॉशिप्स` | **Lordships** | `04, 08` |
| `रोमांश` | **Navamsa** (`D-9`) | `01, 05` |
| `सत्यांश` / `षष्` | **Shashtiamsa** (`D-60`) | `04` |
| `दृखरा` / `देखना` / `दखना` | **Drekkana** (`D-3`) | `12` |
| `डीएनए` | **D-9** (Navamsa) | `10` |
| `कर्मपा` / `कर्मपाक संहिता` / `कर्म विभाग` | ***Karma Vipaka Samhita*** (Chaukhamba Vidya Bhawan) | `01, 02, 11` |
| `बीपीएचएस` | **BPHS** (*Brihat Parashara Hora Shastra*) | `01, 04` |
| `शंखमान` | **Shankhapala** (4th–10th Kaal Sarp Yoga) | `10` |
| `बुलिका` / `गोलिका` / `गुलिका` | **Gulika** (and **Mandi**) | `02, 04` |
| `ब्रदर` (in L02 female painter chart) | **Brothel** | `02` |
| `बारिश` (in L11 summer marriage context) | **Marriage** | `11` |
| `फ्रेंड कर्मा` | **Pending Karma** | `05` |
| `शुक्रवंशी` (in Bhrigu context) | **Bhriguvanshi** | `02, 09` |
| `आर शांताराम` | **R. Santhanam** (translator of *BPHS* / *Deva Keralam*) | `04` |
| `सिक्योरिटी कॉम्प्लेक्स` | **Superiority Complex** | `09` |
| `विंडगासफ` / `विंडगासा` | ***Vidangasava*** (Ayurvedic formulation) | `10, 12` |
