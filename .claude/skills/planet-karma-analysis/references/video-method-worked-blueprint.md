# Worked Example Blueprint from Video `R9KFt2Wp2Sg` (*Planet-Karma / Remedies of Nakshatra Pad by Mahakaal*)

This is the **sole main worked example** for the `planet-karma-analysis` skill, following the exact **5-step diagnostic sequence** demonstrated by Deepanshu Giri in `https://youtu.be/R9KFt2Wp2Sg` 

---

## Resolved Birth Data & Calculation Settings (Verified Against Video Screenshots)
- **Date & Time**: **`1970-01-07 08:50:00 IST`** (`1970-01-07T08:50:00+05:30`, `03:20:00 UT`, Wednesday)
- **Place in India**: **Hyderabad, Telangana, India** — **`17°23'N, 78°28'E`** (`latitude: 17.383333`, `longitude: 78.466667`, exact `jhlite.adb` atlas entry; across the Indian equal-Lagna curve `8°N–27°N`, central latitudes `~13°N–22°N` also place *Prana Pada* (`PP`) in Sagittarius alongside `Mo, Su, Ve` as shown in the video's Rasi diagram).
- **MCP / JHora Settings**:
  - `ayanamsa: "true_lahiri"` (`True Lahiri / Chitrapaksha`, `23°25'28"`)
  - `position_type: "true"` (`Geocentric True`)
  - `node_type: "mean"` (`Mean Nodes`)
  - JHora Vimshottari year length: *mean sidereal solar years* (`365.256363` d/yr → `Rah MD` `2013-04-24` to `2031-04-25`, `Rah–Sat` `2018-05-31` to `2021-04-06`; MCP default *true sidereal solar year* → `Rah MD` `2013-04-22` to `2031-04-23`, `Rah–Sat` `2018-05-30` to `2021-04-04`).
- **Residual Check vs Video JHora Screenshots**:
  - All 11 planetary longitudes (`Sun` through `Pluto` + `mean Node`) match within **`0.00"–0.01"`**.
  - `Lagna`: `23 Cp 50' 20.35"` (`swetest -sid27 -true -nonut`, `-1.31"` vs screenshot `23 Cp 50' 21.66"`) / `23°50'17"` via `calculate_vedic_chart` (`-5.14"`).
  - `charan_window`: `08:48:12.8`–`08:59:56.4 IST` (`borderline: false`, `margin_arcsec: 1817`).

---

## Calculated Natal Chart (`calculate_vedic_chart` + `nakshatra_house_map`)

### D-1 Planetary Positions & D-9 / D-60 Coordinates (`true_lahiri`, `true`, `mean` node)
| Body | D-1 Position | House | Nakshatra / Pada | D-9 (`Leo` Lagna) | D-60 (`Sg` Lagna) | Shadbala (Rupas / Ratio / Rank) | Key Notes |
|---|---|---|---|---|---|---|---|
| **Lagna** | `Cp 23°50'17"` | 1 | `Dhanishta 1` (`Mars`) | `Le 4°32'33"` | `Sg` (`Apampathi`) | — | Charan `8`; equal cusp `23°50'17"` |
| **Sun** (`AmK`) | `Sg 22°59'47"` | 12 | `Purva Ashadha 3` (`Venus`) | `Li` (3H) | `Vi` (`Komala`, B) | `6.19` / `1.24` / #4 | 8L in 12H; `adhimitra` sign |
| **Moon** (`MK`) | `Sg 12°46'29"` | 12 | `Mula 4` (`Ketu`) | `Cn` (12H) | `Cp` (`Ardra`, B) | `4.86` / `0.81` / #7 | 7L in 12H; **combust** (`10.222°` orb); `kashta 51.43` |
| **Mars** (`AK`) | `Aq 23°23'44"` | 2 | `Purva Bhadrapada 2` (`Jupiter`) | `Ta` (10H) | `Sg` (`Seetala`, B) | `6.41` / `1.28` / #3 | 4L & 11L in 2H with Rahu |
| **Mercury (R)** (`DK`) | `Cp 5°48'48"` | 1 | `Uttara Ashadha 3` (`Sun`) | `Aq` (7H) | `Sg` (`Chandramukhi`, B) | `9.62` / `1.37` / #2 | 6L & 9L in 1H (**disposited by Saturn**); `retrograde` |
| **Jupiter** (`PiK`) | `Li 9°42'14"` | 10 | `Swati 1` (`Rahu`) | `Sg` (5H) | `Ta` (`Komala`, B) | `6.75` / `1.04` / #5 | 3L & 12L in 10H; aspects `2H, 4H (Sa), 6H (Ge)` |
| **Venus** (`BK`) | `Sg 18°45'59"` | 12 | `Purva Ashadha 2` (`Venus`) | `Vi` (2H) | `Cp` (`Amrita`, B) | `5.05` / `0.92` / #6 | 5L & 10L in 12H; **combust** (`4.23°` orb) |
| **Saturn** (`PK`) | `Ar 8°38'26"` | **4** | **`Ashwini 3` (`Ketu`)** | **`Ge` (11H)** | `Vi` (`Indu`, B) | **`7.12` / `1.42` / #1** | **Lagna & 2L debilitated in 4H**; `kashta 36.15` vs `ishta 11.8` |
| **Rahu** (`GK`) | `Aq 21°32'15"` | 2 | `Purva Bhadrapada 1` (`Jupiter`) | `Ar` (9H) | `Vi` (`Kaala`, M) | — | With `Mars` (4L); D-9 in `Aries` (Saturn's D-1 sign) |
| **Ketu** | `Le 21°32'15"` | 8 | `Purva Phalguni 3` (`Venus`) | `Li` (3H) | `Pi` (`Kaala`, M) | — | Aspects `12H, 2H (Ma, Ra), 4H (Sa)` |

### Equal-House (`30° Bhava Madhya`) Cusps & *Bhava Bala* Highlights
- **H1 (`Cp 23°50'17"`)**: `Dhanishta 1` (`Le` D-9) · `500.81` virupas (`8.35` rupas, #5)
- **H2 (`Aq 23°50'17"`)**: `Purva Bhadrapada 2` (`Ta` D-9) · `512.29` virupas (`8.54` rupas, #3)
- **H4 (`Ar 23°50'17"`)**: `Bharani 4` (`Sc` D-9) · `463.73` virupas (`7.73` rupas, #6) — *Bhava span* `Ar 8°50'17" – Ta 8°50'17"`
- **H6 (`Ge 23°50'17"`)**: `Punarvasu 2` (`Ta` D-9) · **`627.59` virupas (`10.46` rupas, Rank #1 strongest house)**; aspected by **6 grahas** (`Sun, Moon, Jupiter, Venus, Saturn, Rahu`)
- **H9 (`Vi 23°50'17"`)**: `Chitra 1` (`Le` D-9) · **`592.98` virupas (`9.88` rupas, Rank #2 strongest house)**

---

## Step-by-Step Execution (Video's 5-Step Method)

### Step 1: Locate the "Masters of the Chart" (`4:10–5:20`, `20:05–20:37`, `29:51–30:06`)
- **Ascendant**: **Capricorn (`23°50'17"`, Dhanishta 1)**.
- **Ascendant Lord**: **`Saturn`** (also **2nd Lord** of family/assets), sitting debilitated in **4th house Aries (`8°38'26"`)** yet **Rank #1 in Shadbala (`7.12` rupas, `1.42` ratio)** with heavy `kashta_phala` (`36.15` vs `ishta_phala` `11.8`).
- **Moon**: **`Sg 12°46'29"` (`Mula 4`)** in **12th house**, combust (`10.222°`) and **Rank #7 in Shadbala (`4.86` rupas, `0.81` ratio)**.
- Because **Saturn is the Ascendant Lord**, its **`Rahu–Saturn` Antardasha (`2018-05-30` to `2021-04-04` MCP / `2018-05-31` to `2021-04-06` JHora)** is guaranteed to surface major life events to **balance unpaid past-life debt (*Karza*)** (`0:15–2:35`, `9:30–9:45`).

### Step 2: Blank-Chart Cusp & Dual Planetary Layer (`4:15–4:55`, `10:28–11:14`, `25:54–26:15`)
- **4th House Baseline (`Ar 23°50'17"`, `Bharani 4`)**: Governs home, property construction, vehicles, mother, and mental peace (`02_Blank_Chart_Cusps_and_Offsets_Matrix.md`).
- **Dual Reading of Saturn (`Ar 8°38'26"`, `Ashwini 3`)**:
  - **As Pure *Karaka***: Saturn governs **construction**—wherever Saturn sits, the native constructs, yet classic Jyotish states debilitated Saturn in the 4th deprives the native of domestic peace or forces leaving home/hometown, and whatever is constructed ends up serving someone else (`10:36–11:05`, `12:43–13:00`).
  - **By House Lordship**: Saturn rules the **1st house (self)** and **2nd house (family/assets)**, aspects **1st (`Mercury`), 6th (`Gemini`), 10th (`Libra/Jupiter`)**, and disposits **Mercury (`6th` disputes/litigation & `9th` father)** in Capricorn (1H). Meanwhile, **4th lord Mars** sits with **Rahu** in the **2nd house (family wealth, Aquarius)**.

### Step 3: Read the *Karma Vipaka Samhita* Story for `Ashwini Pada 3` (`5:21–6:48`, `20:44–22:00`)
- **Lord Shiva's Dialogue with Maa Parvati**: A hunter named *Chol Singh* went hunting in the forest with a Brahmin friend (who did not perform priestly duties). After killing a deer, they argued over **who would take the larger share**, and Chol Singh killed his friend.
- **Karmic Result Warned by Shiva**: Unless remediated, in this life the native faces **opposition and boycott from brothers, neighbors, and surrounding society**, plus conflicts while traveling/driving (`01_36_Pada_Karma_Vipaka_Matrix.md`, `#03 Ashwini Pada 3`, `1-3` backlog depth).
- **Symbolic Decoding (Never Naive Literalism, `3:35–3:51`)**: The deer-share murder represents **forcefully seizing more than one's fair share from partners/kin in a past life**, creating an active debt that collects in this lifetime through family property division.

### Step 4: Trace the Pada's Navamsa Sign (`Gemini`) in `D-1` & `D-9` + Dispositor & Multi-Clock Circuit (`6:48–13:30`, `22:35–26:45`)
- **`Ashwini Pada 3` (`1-3`, `6°40'–10°00'` Aries) → Gemini Navamsa**:
  - **Gemini Significations**: Division/shares, siblings, neighbors, friends, documents, and driving (`6:56–8:10`, `22:18–22:45`).
  - **In D-1 (Capricorn Lagna)**: Gemini is the **6th house** (disputes, litigation, partition fights, `11:22`) — **Rank #1 in Bhavabala (`10.46` rupas)** and aspected by **6 planets** (`Sun, Moon, Jupiter, Venus, Saturn, Rahu`).
  - **In D-9 (Leo Lagna)**: **`Saturn` itself sits in `Gemini` (11th house of D-9 = gains/elder siblings)** while `Gemini`'s lord **Mercury** (`6L & 9L` in D-1) sits in **Aquarius (7H D-9)**, **Rahu** sits in **Aries (9H D-9, father/dharma)**, and **Sun + Ketu** sit in **Libra (3H D-9, siblings)**.
  - **Dispositor & Timing Convergence (`Rahu–Saturn`, `2018–2021`)**:
    - **Vimshottari**: `Rahu–Saturn` (`2018-05-30` to `2021-04-04` MCP; `2018-05-31` to `2021-04-06` JHora), linking `Rahu` (in 2H Aquarius, `Aries D-9`) and `Saturn` (`1L/2L` in 4H Aries, `Gemini D-9`, dispositor of `6L/9L` Mercury).
    - **Kalachakra (`Savya` from `Mula 4`, `Deha: Cn`, `Jiva: Pi`)**: `Virgo–Virgo` MD/AD (`2018-06-23` to `2019-06-05`, **Virgo = 9th house of father/ancestral property**) shifting into **`Libra–Libra`** (`2019-06-05` to `2022-07-07`, **Libra = 10th house holding Jupiter aspecting 2H/4H/6H, aspected by Rahu & Saturn**).
    - **Chara Dasha (P.V.R. Narasimha Rao)**: **`Gemini` Mahadasha (`2017-01-07` to `2024-01-08`)** — activating **6H Gemini (`10.46` rupas)** directly — running **`Gemini–Virgo`** (`2018-10-10` to `2019-05-08`), **`Gemini–Aries`** (`2019-05-08` to `2019-12-09`, **4H debilitated Saturn**), **`Gemini–Cancer`** (`2019-12-09` to `2020-07-09`), and **`Gemini–Libra`** (`2020-07-09` to `2021-02-05`).
    - **Gochar (`May–June 2019`)**: Transit **`Rahu` (`Gemini 25°27'`, Punarvasu 2)** crossed **natal `cusp6` exact (`2019-06-11`)** directly inside Ashwini 3's Navamsa sign (`Gemini`), while Transit **`Saturn + Ketu` (`Sagittarius 25°`)** crossed **`cusp12` exact (`2019-06-11`–`2019-06-14`)** during **Peak Sade Sati** over natal Moon, Sun, and Venus.
- **How the Ledger Balanced in Real Life (`11:46–13:15`, `24:36–25:54`)**:
  - The native moved in with his elderly father (who lived alone) to care for parents and **built/renovated the house** (`Saturn` in 4th = construction).
  - His siblings had **already taken their rightful property share earlier**, yet during `Rahu–Saturn` (`2018–2021`) they **demanded a share in this newly built house too**, sparking bitter property disputes, father/sibling stress, and total loss of mental peace (`4th`).
  - **Root Cause**: In a past life the native took an extra/unearned share (`Ashwini 3` *Chol Singh* story); now, until that debt is settled, **Saturn in the 4th refuses mental peace and transfers the construction to others**.

### Step 5: Prescribe Voluntary Settlement + Shiva's *KVS* Remedy (`6:02–6:20`, `8:15–9:05`, `13:15–14:55`, `21:36–23:39`, `26:53–27:50`)
1. **Voluntary Karmic Settlement (Mandatory First)**:
   - Deepanshu explicitly warns that **no yantra, mantra, or tantra** can retain property owed to karmic balance (`13:48–14:05`, `26:53–27:15`).
   - The native must **willingly give up / settle the disputed property share** (`13:15–14:35`, `27:06–27:45`)—once released, mental peace returns immediately and the Ascendant Lord (`Saturn`) unlocks growth across the chart.
2. **Exact *Karma Vipaka Samhita* Remedy (`Ashwini Pada 3`)**:
   - Construct or fund a **well, pond, lake, or modern public drinking-water cooler/station alongside a main road or pathway** (`6:05–6:20`, `8:21–9:05`, `21:42–23:20`) so thirsty passersby and travelers can drink water freely—directly clearing the *Chol Singh* karma.
