---
name: nakshatra-deep-analysis
description: Perform a complete, multi-layered analysis of any particular Nakshatra in a natal chart (whether occupied by planets or empty) using Deepanshu Giri's 3-Tier Nakshatra Methodology (1: Pure Nakshatra + Bhavat Bhavam & Mythological Offsets; 2: Rashi + Nakshatra + Equal-House Cusp Pada & D-1/D-9 Axis; 3: Rashi + Nakshatra + House + Planet, Nakshatra Lord Distance, Dispositor Chain, Multi-Clock Timing, Magic Points & Single-Pada KVS Remedy). Use whenever the user asks to analyze a specific Nakshatra (e.g. "in this chart analyze Ashwini Nakshatra", "analyze Bharani/Rohini/Mrigashira/Pushya/Magha in my chart") or wants a full house-pada-nakshatra breakdown.
---

# Particular Nakshatra Deep Analysis (3-Tier Deepanshu Giri System)

Execute this deterministic workflow whenever the user asks to **analyze a particular Nakshatra in a birth chart** (e.g., *"in this chart analyze Ashwini Nakshatra"*, *"analyze Rohini / Bharani / Mrigashira / Pushya in this chart"*).

> **Foundational Law**: All 27 Nakshatras **always give results** in every horoscope—**whether occupied by a planet or completely empty**. An empty Nakshatra still operates continuously through its **House placement**, its **Equal-House Cusp Pada (`1–4` / Charana `1–9`)**, its **Mythological *Bhavat Bhavam* House Offsets**, its **Nakshatra Lord & Rashi Dispositor**, and its **`D-1 ↔ D-9` Pada placement**.

---

## Step 0: Consultation Safety Gate & MCP Coordinate Calculation

### 0.1 Mandatory Safety Filters
Check [00_Prediction_SOP_and_Gem_Prompt.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/00_Prediction_SOP_and_Gem_Prompt.md) before reading:
1. **`Jupiter in 2nd House (D-1 ONLY)` (*Adle ka Badla*)**: Do not deliver chart/Astro-Vastu consultations if natal D-1 Jupiter sits in House 2 (applies to D-1 only, not D-9).
2. **`Lone Moon in Lagna (D-1)`**: Do not read charts with Moon alone in House 1 (permitted if conjoined with Jupiter or any other planet).
3. **`Child Under Age 8`**: Years `1–4` reflect Mother's karma and Years `5–8` Father's karma; the native's own D-9 Bhagya activates from **Year 9 onward**.
4. **8th / 12th House Karma Transfer Warning (*Adle ka Badla*)**: For severe `8H / 12H` afflictions, prescribe **only self-performed karmic remedies** (cremation-ground donations, *Pitru Tarpana* / charity with the native's own hands on *Amavasya, Purnima, Sankranti*).

### 0.2 Compute Exact Coordinates via Swiss Ephemeris MCP (Never Guess)
Follow [swiss-ephemeris-mcp](../swiss-ephemeris-mcp/SKILL.md) and call:
1. **`nakshatra_house_map`**:
   ```json
   {
     "datetime": "YYYY-MM-DDTHH:MM:SS+05:30",
     "latitude": 0.0,
     "longitude": 0.0,
     "ayanamsa": "true_lahiri",
     "locate": "<TargetNakshatra>",
     "output": "chain"
   }
   ```
   - If `borderline: true`, run one shifted call ±1–2 seconds across the boundary edge.
2. **`calculate_vedic_chart`**:
   ```json
   {
     "datetime": "YYYY-MM-DDTHH:MM:SS+05:30",
     "latitude": 0.0,
     "longitude": 0.0,
     "ayanamsa": "true_lahiri",
     "output": "chain",
     "levels": 5,
     "include": ["dignity", "vargas", "aspects", "bhavabala", "chara", "nakshatra_houses", "shadbala"],
     "vargas": ["D1", "D3", "D9", "D60"],
     "as_of": "YYYY-MM-DDTHH:MM:SS+05:30"
   }
   ```
3. **Extract the 5 Anchor Facts for `<TargetNakshatra>`**:
   - **Anchor 1 (Two Masters of the Chart)**: Lagna (`degree + Nakshatra-Pada + Charana 1–9`), **Lagna Lord** (`house + Nakshatra-Pada`), and **Moon** (`house + Nakshatra-Pada`).
   - **Anchor 2 (House & Rashi Span)**: Which D-1 House(s) and Rashi(s) hold `<TargetNakshatra>` (`13°20'` within one sign, or split `3°20'+10°00'` / `6°40'+6°40'` across two adjacent signs/houses).
   - **Anchor 3 (Equal-House Cusp vs. Target Nakshatra)**: Using the Lagna degree as the Equal-House cusp (`30° Bhava Madhya`) for all 12 houses (matching the rising sign's Charana index `1–9`), determine:
     - Does the house cusp itself fall **inside** `<TargetNakshatra>`? If yes, identify the **exact Cusp Pada (`1–4`)**.
     - If the house cusp lands in an adjacent Nakshatra of that sign (e.g., Lagna at `23°50'` puts the Aries `4H` cusp in `Bharani Pada 4` while `Ashwini` spans `0°00'–13°20' Aries` in the first half of `4H`), note both the **House Cusp Pada** and the **4 Padas of `<TargetNakshatra>`** inside that house.
   - **Anchor 4 (Resident Planets vs. Empty Status)**: List every planet (and *Gulika / Mandi / Arudha Pada / Indu Lagna*) sitting inside `<TargetNakshatra>` with its exact degree and **Pada (`1–4`)**—or explicitly mark `<TargetNakshatra>` as **Unoccupied (Empty)** (so the reading runs via Cusp/House + Nakshatra Lord + Dispositor + D-9 houses holding its 4 Pada signs).
   - **Anchor 5 (Nakshatra Lord & Rashi Dispositor)**: Identify the **Nakshatra Lord** (e.g., `Ketu` for Ashwini/Magha/Mula; `Venus` for Bharani/Purva Phalguni/Purva Ashadha) and **Rashi Dispositor(s)**, their D-1/D-9 houses, and the house count from `<TargetNakshatra>` to them.

---

## Step 1: Technique 1 — Pure Nakshatra + *Bhavat Bhavam* ("Mythological Offset & Relative-Derivation Engine")

**Atomic Technique Loader (Priority Rule)**: Before reading prose rulebooks, check `Nakshtra Knowledge Base/Nakshtra course/lecture techniques/` for the matching zero-noise atomic technique registry (for example, `01_Ashwini_Techniques.md` for Ashwini). Whenever present, load it first and evaluate every matching `IF → THEN` trigger (`ASH-001` onward) deterministically against the MCP coordinates computed in Step 0, then cross-check the remaining rulebooks in `Nakshtra Knowledge Base/` (`01_Ashwini_Rules.md`–`12_Pending_Karma_Rules.md`), [02_Blank_Chart_Cusps_and_Offsets_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/02_Blank_Chart_Cusps_and_Offsets_Matrix.md), and `Nakshtra Knowledge Base/youtube nakshtra/Nakshatra-extraction/`:

### 1.1 Evolutionary Stage, Deity & Progression/Regression Diagnostic
1. **Soul Evolution Stage**:
   - **Cycle 1 (`Ashwini → Ashlesha`, Nature/Psychological Plane)**: `Ashwini` (bodiless free soul searching for womb; Ketu's 3-parameter triangle: Family + Time + Place; pickiness, detachment, 1st-attempt block, transport/healing) $\rightarrow$ `Bharani` (upside-down in womb, Yamaraj's strict discipline, no mid-way) $\rightarrow$ `Krittika` (blade cutting umbilical cord, sacrifice/*Ahuti*, #1 independence) $\rightarrow$ `Rohini` (Brahma's original creation, food/stockpiling, *infrasonics*) $\rightarrow$ `Mrigashira` (searching deer, herd conformity, Soma ritual curse) $\rightarrow$ `Ardra` (Rudra's storm shattering rigid norms) $\rightarrow$ `Punarvasu` (Lord Ram validating outcasts, 4–5 yr life reset) $\rightarrow$ `Pushya` (*Kala Brahmin* behind-the-curtain kingmaker, silence as weapon) $\rightarrow$ `Ashlesha` (Naga secrecy & psychological warfare).
   - **Cycle 2 (`Magha → Jyeshtha`, Royal/Societal Plane)**: `Magha` (Ketu's territorial flag, boundary power struggle, Leo separation rule) $\rightarrow$ `Purva Phalguni` (royal *bhoga*, make-or-break advisors, Palash fire illusion/heartburn/jealousy) $\rightarrow$ `Vishakha → Anuradha → Jyeshtha` (Rishi focus & Age 35 woman/alcohol trap $\rightarrow$ *Bhakti* bridge $\rightarrow$ Indra's throne).
2. **Progression vs. Regression Check**: State how to tell if the native is **regressing** into the preceding Nakshatra (e.g., Purva Phalguni slipping back into Magha/Ashlesha scheming; Vishakha falling from Jyeshtha back to zero via indulgence; Ashwini stuck in choosy paralysis instead of graduating to Bharani discipline) or **progressing** into the next Nakshatra.

### 1.2 *Bhavat Bhavam* Relative Derivation of the House Holding `<TargetNakshatra>`
Decode **which family relatives** are signified by the house(s) holding `<TargetNakshatra>` via derived house counting:
- `1H` = Self | `2H` = Family / Speech / Eyes | `3H` = Younger Sibling & **`12th from 4th` (Mother's final exit/funeral)**
- `4H` = Mother, Home, Construction, Peace | `5H` = First Child & **`9th from 9th` (Paternal Grandfather / Baba)**
- `6H` = Service, Litigation, Debt & **`3rd from 4th` (Maternal Uncle / *Mama* & Maternal Aunt / *Mausi*)**
- `7H` = Spouse, Partners | `8H` = Spouse's Family/Resources (`2nd from 7th`), Inheritance, Sudden Transformation
- `9H` = Father, Guru, Boss, Coronation/Status-Change Ceremony | `10H` = Career, Father's Family (`2nd from 9th`), Child's Legs/Knees (`6th from 5th` / `10th from 5th`)
- `11H` = Elder Sibling, Paternal Uncle (`3rd from 9th`) | `12H` = **`9th from 4th` (Maternal Grandfather / *Nana*)** & **`4th from 9th` (Paternal Grandmother / *Dadi*)**, Final Rites, Hospitals, Foreign Lands.

### 1.3 Fixed Mythological House Offsets Counted *FROM* `<TargetNakshatra>`
Always fire the blank-chart offsets counted **from the house/sign containing `<TargetNakshatra>`**:

| Target Nakshatra | Mythological *Bhavat Bhavam* Offsets Counted FROM `<TargetNakshatra>` |
| :--- | :--- |
| **Ashwini** (`0°–13°20' Ar`) | • **1st (Ashwini House)**: "Horse Rider" spotlight—native shows off this house as bait to woo the 7th house; holds the "starter key"; travels light & leaves early; 1st-attempt block (settles on 3rd attempt).<br>• **3rd from Ashwini (`0°–13°20' Gemini`)**: Planet or house significator here reveals a relative with a hushed, taboo, or transactional ("friends-with-benefits") relationship (plus `3rd` sibling dedicates/sacrifices for studies).<br>• **4th / 5th / 6th / 8th from Ashwini**: Check `02_Blank_Chart_Cusps_and_Offsets_Matrix.md` for domestic, progeny (`Santan Anusthan`), service, and longevity triggers.<br>• **7th from Ashwini (`Libra`)**: Partner attraction axis & loyalty test (open/free default vs. `3/6/12` paid/transactional modifier; lightweight ceremony logistics vs. spotlight persona).<br>• **11th from Ashwini (`Aquarius`) at Age 36**: Triggers business/animal/theft losses at **Age 36** *(flips 180° to major gains if Aquarius falls in `6H, 8H, or 12H` or holds `6L/8L/12L`)*. |
| **Bharani** (`13°20'–26°40' Ar`) | • **1st (Bharani House)**: Womb gestation & first 108 days; "No Mid-Way" extremes; helpless fetus fear; "My Baby" project ownership; kingmaker (#2 dependent on #1 figure of that house); never off-duty; people wait outside to meet them and get turned away; marriage triggers a family death; recent death in family matches incoming child's gender (`Male dies → Boy`, `Female dies → Girl`).<br>• **Count from Aries (Bharani) to Venus**: The counted house (`N`-th from Aries) is where the native gains superior knowledge and undergoes a **life-and-death transformation every 8 years**. |
| **Krittika** (`26°40' Ar–10° Ta`) | • **1st (Krittika House)**: *Ahuti* (sacrifice), razor/blade cutting umbilical cord, solo #1 leader, post-birth surgical/septic/skin issues, or **missing body part / surgically removed organ** in the signified relative if afflicted.<br>• **9th from Taurus (`Capricorn`)**: ~75% okay (minor impact).<br>• **10th from Taurus (`Aquarius`)**: Blank-chart rule—the person/relative signified by the house holding **Aquarius** gets cheated in sexual/relationship life, falls into honey traps, or faces sexual-life issues. |
| **Rohini** (`10°–23°20' Ta`) | • **1st (Rohini House)**: Unmatched original creation (takes no advice), youngest & smartest achiever (sparking intense peer jealousy/rumors), silent *infrasonic* bond, food/stockpiling, loose clothes, anti-9-to-5 burst worker.<br>• **5th from Rohini (`Virgo`)**: Disobedience & zero gratitude (Brahma's children never obeyed him)—asking for help or expecting gains from the **5th house from Rohini** brings refusal once in life.<br>• **7th from Rohini (`Scorpio`)**: Undeserved curse / silent jealousy.<br>• **4th & 10th from Rohini (`Leo` & `Aquarius`)**: `10th from 7th` career/authority rotation (plus 7 instant blank-chart predictions when Leo Lagna puts Rohini in `10H`). |
| **Mrigashira** (`23°20' Ta–6°40' Ge`) | • **1st (Mrigashira House)**: Endless searching quest; herd/social-pressure conformity; **Jupiter withholds ritual blessings** (rushed/disrupted ceremonies, *Griha Pravesh* fights in `4H`, wedding Pandit/Havan fights in `7H`, skipped childhood *Sanskaras* with `Mercury`, missed funerals in `3H/12H`).<br>• **12th-From-Next-House Funeral Rule**: Mrigashira's house is the `12th` (final rites) of the following house's relative—never skip that relative's funeral.<br>• **7th from Mrigashira (`Scorpio` & `Sagittarius`) at Age 38 & 50**: **3 months before 38th birthday** triggers `7th from Taurus` (`Scorpio`); **3 months after 38th birthday** triggers `7th from Gemini` (`Sagittarius`). |
| **Ardra** (`6°40'–20° Ge`) | • **1st (Ardra House)**: Rudra's awakening storm shattering SOPs/taboos; Kashi / Kaal Bhairav activation.<br>• **9th from Ardra (`Aquarius`)**: Suffers repeated shocks/accidents/thefts whenever Rahu transits Ardra.<br>• **2nd, 7th, 9th from Ardra / 7th from Moon**: Key Ardra dasha/transit hit points (`07_Ardra_Rules.md`). |
| **Punarvasu** (`20° Ge–3°20' Cn`) | • **1st (Punarvasu House)**: Recharging/filter after Ardra's storm; Lord Ram idealism (*"Log kya kahenge"*); validating social outcasts; exploited/underpaid "yes-man"; **4–5 year complete life-reset cycle**; things happening **twice**.<br>• **3rd from Punarvasu**: Always afflicted (`08_Punarvasu_Rules.md`). |
| **Pushya** (`3°20'–16°40' Cn`) | • **1st (Pushya House)**: *Kala Brahmin* (`Jupiter + Saturn`), Chanakya kingmaker advising from behind the curtain (frustrated if forced onto throne or lacking a worthy king), **silence as weapon** (walks out quietly when disrespected), lotus humility law; **Age 37y 5m 10d (+12n)** traveler test. |
| **Ashlesha** (`16°40'–30° Cn`) | • **1st (Ashlesha House)**: Naga guardian of secrets, hides knowledge, 3-moves-ahead psychological warfare, attracts complex/Rahu people, `10–20%` capacity cap vs `28°–29°` Gandanta power; **Pada 1 (`4/9` Cancer-Sagittarius `1–6` axis)** = father absent/insulted at marriage or coronation ceremony. |
| **Magha** (`0°–13°20' Le`) | • **1st (Magha House)**: Ketu's territorial flag, boundary power struggle, **Leo/Magha separation rule** (people move away when activated); **Inborn Royalty (`Sun/Mars`)** keeps silent/secretive for security vs. **Achievers (`Saturn/Venus/Mercury`)** flexing territory/spouse/work on social media. |
| **Purva Phalguni** (`13°20'–26°40' Le`) | • **1st (Purva Phalguni House)**: Royal *bhoga*, **make-or-break reliance on advisors** (Shakuni flattery vs. Krishna/Karna blunt truth), Palash forest-fire illusion (*bhram*), chest burning/heartburn (*seene mein jalan*), and comparison/jealousy in the placed planet's karaka. |
| **Vishakha** (`20° Li–3°20' Sc`) | • **1st (Vishakha House)**: *Indragni* laser focus, "failed saint" craving isolation, pacing habit, OCD problem-solver; **Age 35 temptation trap** (woman/affair, alcohol, or bad habit right at the peak of mastery); **Triad progression**: `Vishakha` (focus/temptation) $\rightarrow$ `Anuradha` (*Bhakti* protection bridge) $\rightarrow$ `Jyeshtha` (Indra's throne, falling back to Vishakha if *Punya* is exhausted by indulgence). |

### 1.4 3-Direction Sarvatobhadra Chakra (`SBC`) Vedha Network
Check [02_Blank_Chart_Cusps_and_Offsets_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/02_Blank_Chart_Cusps_and_Offsets_Matrix.md) for all **3 SBC aspect directions** connecting `<TargetNakshatra>` to natal and transiting planets (remembering **Abhijit** exists *only* inside SBC).

---

## Step 2: Technique 2 — Rashi + Nakshatra + Cusp Pada ("Sign-Cusp Filter & `D-1 ↔ D-9` Axis Bridge")

### 2.1 Rashi Backbone + Equal-House Cusp / Split-Sign Filter
1. **Anchor the Rashi Environment**: Overlay Deepanshu Giri's **12-Sign Keyword Backbone** (`Book P1 p. 11`: `Ar` new/energy/survival, `Ta` resources/family/food/eyes, `Ge` comm./trader/hands/cruel for money-shares, `Cn` peace/masses/food/water, `Le` chair/power/past deeds/king, `Vi` hard work/intestines/barren/service, `Li` balance/checklist/marriage, `Sc` hidden/problems/inheritance, `Sg` dharma/father/guru/boss, `Cp` father's family/profession, `Aq` friends/gains/salary, `Pi` end/sleep/expenses).
2. **Check Equal-House Cusp Alignment**:
   - Compare the house's Equal-House cusp degree (`= Lagna degree`) against `<TargetNakshatra>`'s degree span.
   - For **split-sign Nakshatras** (`Krittika`, `Mrigashira`, `Punarvasu`, `Uttara Phalguni`, `Chitra`, `Vishakha`, `Uttara Ashadha`, `Dhanishta`, `Purva Bhadrapada`), specify **which of the two houses** receives the primary cusp hit based on whether the Lagna degree falls in the early or late sign segment—and evaluate **both** houses when timing dual windows (such as Mrigashira's ±3-month Age 38 split).

### 2.2 The Dusthana (`6/8/12`) Reversal Rule
Check whether `<TargetNakshatra>`'s Rashi—or its projected target Rashi (e.g., **Aquarius / Sign 11** at Age 36 from Ashwini)—falls in the **6th, 8th, or 12th house** from Lagna, OR holds the **6th, 8th, or 12th Lord**:
- If **yes**, state the **Dusthana Reversal**: negative classical dictums flip into positive breakthroughs for that house (`6H` = winning litigation/disputes/job rise; `8H` = positive transformation; `12H` = foreign/government/unexpected gains).

### 2.3 Active Pada(s) & `D-1 Rashi → D-9 Rashi` (`X-Y`) *Karma Vipaka Samhita* Decoding
Consult [01_36_Pada_Karma_Vipaka_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/01_36_Pada_Karma_Vipaka_Matrix.md) (and consolidated profiles `05`–`08` in `Predictive_Engine/`):
1. **Select the Active Pada(s) to Decode**:
   - **Priority 1 (Resident Planet Pada)**: Every planet sitting inside `<TargetNakshatra>` activates its exact `3°20'` Pada (`1–4`) at full 220V potency (`Resident Planet > Cusp Pada`).
   - **Priority 2 (Equal-House Cusp Pada)**: If the house's Equal-House cusp (`30° Bhava Madhya`) falls inside `<TargetNakshatra>`, decode that exact Cusp Pada (`1–4`).
   - **Priority 3 (Empty Nakshatra with Cusp Outside Its Span)**: If `<TargetNakshatra>` has no resident planets *and* the house cusp lands in another Nakshatra of that sign, map **where the 4 Pada Navamsa signs (`Y1..Y4`) of `<TargetNakshatra>` fall in D-9**—highlighting any Pada sign that holds a D-9 planet, D-9 Lagna, or forms a `1–6` / `1–7` axis!
2. **Decode the *Karma Vipaka Samhita* Story & Structural Axes**:
   - State the **`D-1 Sign / D-9 Sign` (`X-Y`) code**, the **Shiva–Parvati past-life narrative**, and its **modern symbolic meaning** (never naive literalism).
   - Note **Backlog Depth**: Charana index `1–9` within the sign = how many lifetimes old the karma is (**Vargottama = `0` past-life backlog**, maximum free will). Check **Pushkara** status and **D-3 Budha Nadi** (`100% Nakshatra Pada` vs `80% Parivartana Pada`).
   - Flag **Structural Rashi-to-Navamsha Axes**:
     - **`1–7` Axis (`D-9 Sign` is `7th` from `D-1 Sign`, e.g., `Ardra P1` `3/9`, `Mars in Aries → Libra D-9`)**: Relationship betrayal / abandoning originality for status.
     - **`1–6` / `1–8` Axis (`D-9 Sign` is `6th` or `8th` from `D-1 Sign`, e.g., `Ashlesha P1` `4/9`, `Pushya P2` `4/6`)**: Debt, resource waste, or conflict with the significations of the D-9 sign.
3. **Trace the Pada's Navamsa Sign (`Y`) in Both `D-1` and `D-9`**:
   - **In D-1 (Seed / Action Arena)**: Which D-1 house does Sign `Y` occupy, how strong is its *Bhava Bala*, and what planets aspect or occupy it?
   - **In D-9 (Fruit / Manifestation — Active from Birth)**: Which D-9 house does Sign `Y` occupy, and which D-9 planets sit in or aspect it? *(Never calculate Nakshatras inside D-9.)*

---

## Step 3: Technique 3 — Rashi + Nakshatra + House + Planet ("4-Key Master Synthesis & Dispositor Engine")

Consult [03_Planet_in_Nakshatra_and_Snapshots_Matrix.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/03_Planet_in_Nakshatra_and_Snapshots_Matrix.md):

### 3.1 Resident Planet(s) Dual Reading (`Mode A: Pure Karaka` + `Mode B: House Lordship`)
For each planet occupying `<TargetNakshatra>`:
1. **Mode A — Pure Natural *Karaka* (Ignore House Lordship)**:
   - Identify **who in the family** or **which physical/psychological faculty** carries `<TargetNakshatra>`'s exact imprint (e.g., in `Bharani`: `Venus` = wife's mother had womb cyst/hysterectomy; `Sun` = father's mother; `Moon/Jupiter` = native in the womb; `Saturn` = servants/work extremes; in `Ashwini`: `Moon` = 15+ Ayurvedic *churan* bottles & experimental summer drinks; `Mars` = warrior/weapon statue on display; `Jupiter` = large framed Guru photos; in `Mrigashira`: `Mercury` = VPN/disabled read receipts/hiding wife's pregnancy & listening comprehension disconnect; `Jupiter` = reading 3 books at once; in `Magha`: `Mars/Sun` = fortress secrecy vs `Saturn/Venus/Mercury` = social-media territory/trophy-spouse flexing).
2. **Mode B — House Lordship, Placement & Dispositor (*Paribhramana Paddhati*)**:
   - Synthesize the **houses owned** by the resident planet + the **house occupied** + **planets sitting in the resident planet's signs** (who the resident planet *disposes*).
   - Check modifiers: **`3°20'` tight conjunction/aspect orb**, **combustion / planetary war**, **`300%` retrograde *Cheshta Bala***, **Ashlesha `10–20%` capacity cap vs `28°–29°` Gandanta power**, and **Kaal Sarp `1, 2, 3, 4` axis trapping**.

### 3.2 Nakshatra-to-Nakshatra-Lord Distance & Rashi Dispositor Chain (*Always Run—Even If `<TargetNakshatra>` Is Empty!*)
1. **Count Houses from `<TargetNakshatra>`'s House to Its Nakshatra Lord**:
   - Locate the **Nakshatra Lord** (`Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury`) in D-1 and D-9.
   - Count houses from `<TargetNakshatra>`'s house to the Nakshatra Lord's house (`N`-th house from `<TargetNakshatra>`):
     - **For Bharani (`Venus`)**: The `N`-th house from Aries to Venus is the exact domain where the native acquires extraordinary knowledge and undergoes a **major life-and-death transformation every 8 years**.
     - **For All Nakshatras**: The house where the **Nakshatra Lord** sits—and the `N`-th house count from `<TargetNakshatra>` to its Nakshatra Lord—shows *where* the Nakshatra's energy is channeled and *how* its periodic cycle manifests.
2. **Locate the Rashi Dispositor & Repeating Cycle House**:
   - Check the **Rashi Dispositor** of `<TargetNakshatra>` (e.g., **Mars** for Aries/Ashwini/Bharani: wherever Mars sits undergoes a **4-year transformation cycle**; **Venus** for Bharani/Taurus: **3- & 8-year cycle**; **Sun** for Krittika/Leo: **7-year cycle**; **Jupiter** for Punarvasu: **4–5 year complete life reset**; **Mars/Saturn** for Mrigashira/Pushya: **12-year & 25-year cycles**).
3. ***Budha Nadi Jeeva* Reverse Circuit**:
   - Check which other natal planets sit in **other Nakshatras ruled by the same Nakshatra Lord**—or if `<TargetNakshatra>` holds Planet `P` while its Nakshatra Lord `J` acts as *Jeeva* delivering `P`'s houses during `J`'s dasha (noting the `3/6/8/12` Seshadri Iyer Vipreet exchange exception).

---

## Step 4: Multi-Clock Timing, Recurring Cycles & "Magic Point" Encounters

Consult [04_Age_and_Dasha_Timing_Engine.md](../../../Nakshtra%20Knowledge%20Base/Predictive_Engine/04_Age_and_Dasha_Timing_Engine.md) and verify across **3 Timelines** (`Pre-birth / Womb`, `Post-birth / Childhood`, `Adult & Upcoming Windows`):

1. **Nakshatra Fixed Activation Ages & Repeating Cycles**:
   - Note `running year = completed age + 1` and Nakshatra-specific benchmark ages:
     - **Ashwini**: Good running years `28, 29` | Bad `42, 46` | Offset ages `20, 24, 26, 30, 33, 34` | **Age 36** (`11th from Ashwini` Aquarius activation) | **4-Year Mars cycle**.
     - **Bharani**: **First 108 days** after birth | **10–15 days** birth/death link | **21-day** fever/work cycle | **3- & 8-Year Venus transformation cycle** | Ages `28–33` grind.
     - **Krittika**: **7-Year cycle** (`7, 14, 21, 28, 35, 42, 49…`) | **Age 16** scarcity end | **Peak Summer** seasonal trigger.
     - **Rohini**: Early-life effortless gains (earned from past-life Krittika *punya*) + age-specific `2H / 7H / 8H` activations.
     - **Mrigashira**: **Age 38 & Age 50 (12-Year cycle)** (`3 months before 38th birthday` = `7th from Taurus [Scorpio]`; `3 months after 38th birthday` = `7th from Gemini [Sagittarius]`) | **25-Year cycle** (`25, 50`) | **42–43 day** travel rhythm.
     - **Ardra**: **5y 9m**, **Ages 16, 32, 42, 48, 61** | **12 days after visiting Kashi / Kaal Bhairav**.
     - **Punarvasu**: **4–5 Year life-reset cycle** | Gemini Padas (`1–3`): **Ages 27, 30, 39, 42** | Cancer Pada (`4`): **Ages 4, 8, 16, 28, 31, 32** | **10th year of marriage**.
     - **Pushya**: **Age 37 years, 5 months, 10 days** (`+ 12 years = 49y 5m 10d`) Pada 3 traveler test | **Ages 16, 24, 33, 34 (`Ju in Cp`), 64** | Move every `4–10` years.
     - **Ashlesha**: Running years **17, 33, 41** (`completed ages 16, 32, 40`).
     - **Vishakha**: **Age 35** peak-mastery distraction test (woman/alcohol/bad habit).
2. **Annual Birthday-to-Degree Window & "Magic Point" Encounter**:
   - Formula: **`Birthday + (Planet or Cusp Degree within Sign × ~10–12 days)`** (e.g., `0°` = right after birthday; `5°` = ~50–60 days after birthday).
   - Describe the **"Magic Point" human manifestation**: at this window (and during active dasha/cycle triggers), the Graha physically walks into the native's life disguised as an ordinary person embodying **`Planet + Rashi + House + Nakshatra`** to test or collect the debt.
3. **Dasha & Transit Convergence**:
   - **Vimshottari Dasha + *Laghu Parashari* Shloka 1 (`MD / 4`)**: A planet delivers its **Nakshatra Lord's results** specifically in the **Mahadasha Quarter (`Q1–Q4`) matching its occupied Pada (`1–4`)** (plus Exception 1: `NL + X` conjunction flip; Exception 2: `3–5` conjoined planets lowest↔highest degree swap).
   - **Dasha Progression (*Chandra Kala Nadi*)**: Progress the active Mahadasha lord `1 Sign per (MD Duration / 12)` from its natal sign (noting when it crosses Aries debilitation reset vs. Taurus resource recovery or its exaltation sign).
   - **Kalachakra (`True Lahiri`, `Gati`, `Deha/Jiva`) + Chara (`Bhava Bala` sum vs. `N × Chart Avg`) + Gochar (`natal_hits ≤ 2°`, stations, Latta on Indu Lagna)**.

---

## Step 5: Pre-Remedy Lineage Verification, Voluntary Settlement, Single-Pada *KVS* Remedy & Vastu

1. **Mandatory Pre-Remedy Verification Question**:
   - Never prescribe a remedy blindly—first ask/verify the exact **lineage or behavioral root cause** matching the `D-9 House + Rashi Resource + Nakshatra Pada` (e.g., *Ashwini P2 in 9H Taurus D-9*: "Did your father refuse to feed Brahmins on religious occasions?"; *Bharani*: "Did a grandfather/family member habitually complain about or waste food, or did you bring home someone else's temple footwear?"; *Krittika P1*: "Was electricity, water, or footwear hoarded/misused near a temple?"; *Krittika*: "Did you start eating fire-roasted/baked non-veg food before the career dip?"; *Pushya P3*: "Did you put up a 'Do Not Park/Sit Here' sign or refuse a traveler asking for water/money?").
2. **Voluntary Karmic Settlement (Prerequisite)**:
   - State the non-ritual behavioral settlement required to stop fighting the chart's ledger (e.g., releasing the disputed property/share, stopping free unsolicited advice for `Krittika P4 Mercury`, charging fair pay for `12H Pisces Saturn`, apologizing/reconciling with spouse for `10L Moon in 7H Bharani`, making 10-second snapshot decisions for `Ashwini`).
3. **Single-Pada *Karma Vipaka Samhita* Master-Key Remedy**:
   - Prescribe **only** the specific active Pada's remedy from `01_36_Pada_Karma_Vipaka_Matrix.md` (and check the **Indu Lagna `6/8/12` guardrail** before wealth rituals).
4. **Nakshatra / Bhrigu Vastu & Rapid-Fire Verification Tells**:
   - Include any home/Vastu check linked to the placement (e.g., shoe rack under Ganesha/deity picture at entrance blocking loan repayment; display of warrior statue for `Mars in Ashwini`, Ganesha statues for `Ketu in 4H Ashwini`, Guru photos for `Jupiter in Ashwini`, 15+ *churan* bottles for `Moon in Ashwini`; broken bed / South-West dead phones & money plant for `Saturn+Mercury`).
   - Provide **5 Rapid-Fire Behavioral/Physical Verification Tells** for the client.

---

## Required Output Structure

Present every particular-Nakshatra analysis in this exact 6-section layout:

1. **Nakshatra Coordinates & Chart Anchors**:
   - Calculation settings (`ayanamsa: "true_lahiri"`, `charan_window`, `borderline` check).
   - **Two Masters of the Chart** (`Lagna / Lagna Lord` & `Moon`).
   - **Target Nakshatra Map**: D-1 House(s) & Rashi span, Equal-House Cusp (`30° Bhava Madhya`) vs. Target Nakshatra span (`Charana 1–9`), Resident Planet(s) with exact degree & Pada (`1–4`) (or `Empty/Unoccupied` status), and **Nakshatra Lord + Rashi Dispositor** coordinates.
2. **Technique 1 — Pure Nakshatra + *Bhavat Bhavam* (Blank-Chart & Mythological Offsets)**:
   - Evolutionary archetype, Deity/Symbol mechanics, and Progression vs. Regression status.
   - *Bhavat Bhavam* derived family relatives mapped to the Target Nakshatra's house.
   - Every fixed mythological house offset counted **from** `<TargetNakshatra>` (`3rd, 5th, 7th, 9th, 10th, 11th, 12th-from-next`, etc.) applied to the chart's actual houses + 3-direction `SBC` Vedha hits.
3. **Technique 2 — Rashi + Nakshatra + Cusp/Planet Pada (`D-1 ↔ D-9` Axis Bridge)**:
   - Rashi keyword environment + Equal-House cusp / split-sign degree filter + Dusthana (`6/8/12`) reversal check.
   - Exact **`D-1 Sign / D-9 Sign` (`X-Y`) *Karma Vipaka Samhita* Story & Symbolic Decoding** for the active Pada(s) (`Backlog Depth 1–9` vs `Vargottama = 0`, `1–6` / `1–7` axis, `D-3 Budha Nadi 100%/80%`).
   - Where the Pada's **Navamsa Sign (`Y`)** lands in **D-1 (Seed/Action house + *Bhava Bala*)** and **D-9 (Fruit/Manifestation house + occupants/aspects)**.
4. **Technique 3 — Rashi + Nakshatra + House + Planet (4-Key Synthesis & Dispositor/Nakshatra-Lord Engine)**:
   - **Resident Planet(s) Dual Reading**: `Mode A (Pure Natural Karaka)` + `Mode B (House Lordship, Placement & Modifiers)`.
   - **Nakshatra-to-Nakshatra-Lord House Count & Rashi Dispositor Chain (*Paribhramana Paddhati* & *Budha Nadi Jeeva*)**: Exact house count from `<TargetNakshatra>` to its Nakshatra Lord and Rashi Dispositor, what domain transforms, and who disposes whom.
5. **Multi-Clock Timing, Recurring Cycles & "Magic Point" Human Encounters**:
   - Fixed Nakshatra ages (`running year = completed + 1`) + repeating planetary cycles (`4-yr, 5-yr, 7-yr, 8-yr, 12-yr, 25-yr`).
   - Annual Birthday-to-Degree activation window (`Birthday + Degree × ~10–12 days`) & the exact **"Magic Point" human profile** to watch for.
   - Synchronized Vimshottari (`LP Q1–Q4`), Dasha Progression, Kalachakra (`Gati`), Chara (`Bhava Bala`), and Gochar windows.
6. **Lineage Verification, Voluntary Settlement, Single-Pada Remedy & Rapid-Fire Tells**:
   - Mandatory Pre-Remedy Lineage/Habit Verification Question.
   - Voluntary Karmic Settlement + Single-Pada *KVS* Master-Key Remedy + Bhrigu/Nakshatra Vastu check.
   - 5 Rapid-Fire Verification Tells.

For a complete worked demonstration of **analyzing Ashwini Nakshatra** across all 3 Technique Tiers (both when occupied by a planet and via its blank-chart/cusp/offset engine), read [references/ashwini-worked-analysis.md](./references/ashwini-worked-analysis.md).
