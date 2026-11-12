---
name: jhora-verification
description: Verify and calibrate the Swiss Ephemeris MCP server against Jagannatha Hora (JHora, JH). Holds the reference chart's birth details (Data 9: Sagar, 1999-06-06 15:30:01 IST, Bhavnagar) and JH settings (True Lahiri / Chitrapaksha, SM Singh, True nodes), every JH value verified on Data 9 (94 Kalachakra periods down to deha, positions, Rasi D-1, Navamsa D-9, Bhrigu Bindu, panchanga), what JH does differently from textbooks, how to read JH screens, and a script that compares a pasted JH Kalachakra export with the server. Use this whenever the user shares JH screenshots or pasted JH dasha text, says "test/cross-check/calibrate against JHora", reports that the server disagrees with JH, asks for the Data 9 reference chart details or JH settings, or before changing any Kalachakra, shadbala, ashtakavarga, aspect, varga, Vimshopaka or dasha rule in this repository.
---

# Verifying the server against Jagannatha Hora

Jagannatha Hora is the user's reference software. The server's defaults are meant to reproduce it, so
every disagreement is either a bug, an unmatched JH setting, or a JH method choice we have not
copied yet. JH screenshots are expensive for the user to make, so record every value they send (in a
fixture and a test) and ask for the specific screens that would settle an open question.

## Reference chart (Data 9)

| Chart | Birth (as entered in JH) | Place | JH file |
|---|---|---|---|
| Data 9 (Sagar) | 1999-06-06 15:30:01 +05:30 | Bhavnagar, 21°46'N 72°09'E (21.7667, 72.15) | `C:\Program Files (x86)\Jagannatha Hora\data\Sagar` |

Data 9 (Sagar's chart at `1999-06-06T15:30:01+05:30`) is the only verified reference chart in the repository:
every test and fixture runs on Data 9 alone. Do not add another chart to the tests or fixtures unless the user
gives it as verified.

Machine-readable JH values: `test/fixtures/jhora-data9.json` (copied in `references/jhora-data9.json`).
JH's Kalachakra text export for Data 9 (94 periods across MD, AD, PD, SD, PAD, and Deha):
`test/fixtures/jhora-data9-kalachakra.txt` (copied in `references/jhora-data9-kalachakra.txt`).
`test/helpers.js` exports it as `D9` / `JH` and the birth as `SAGAR` / `SAGAR_KC`.

## JH settings to match before comparing anything (Deepanshu Giri / Lunar Astro methodology)

- **Ayanamsa**: `True Lahiri / Chitrapaksha (Spica in the middle of Chitra always)`, no correction (`0° 0' 0"`, `23-50-00.12` at birth). Server setting: `true_lahiri` (the automatic default for Kalachakra in both `calculate_kalachakra_dasha` and `calculate_vedic_chart`, and selectable via `ayanamsa: "true_lahiri"` for all chart calculations).
- **Planet Calculation Options**: `Geocentric positions`, `True positions` (not apparent; `Don't use refraction`), `True nodes` (the server's default).
- **Dasha Year**: `True sidereal solar years` (`360° Sidereal Solar Years`).
- **Kalachakra Dasha Options**:
  - Starting point: `Janma tara (Moon)`
  - Base divisional chart: `Rasi (D-1)`
  - Calculation method: `Full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa (SM Singh)`
  - Rohini 4th pada rule: `Rohini 4th pada is Leo navamsa` (Parasara/BPHS consistency; never Cancer navamsa)
  - Event lookup sub-period level: `Prana-antardasa (PAD)` (`level: 5`)
- **Precision & Drift**:
  - Times in the birth offset (`+05:30`).
  - Planets in Data 9 match JH's table within `0.5"` (`Rahu 0.33"`).
  - Our lagna is `12.61"` above JH's (`0 Li 40' 42.84"` vs JH `0 Li 40' 30.23"`): exactly the nutation in longitude at birth (`12.61"`), because JH subtracts the ayanamsa without nutation from the true ascendant while keeping planets true.
  - Across all 94 verified Kalachakra periods in Data 9, labels are 100% identical and timestamps match within 18–58 seconds (2023–2028 periods within 18–28 s; earlier/later differences come from 0.0002" of Moon longitude multiplied by 83 years and JH's older ΔT extrapolation).

## Workflow

1. **Name what each screenshot shows** (tab, sub-tab, chart, settings visible) and check the settings
   above. If a dialog hides part of a table, use what is visible and ask for the rest.
2. **Transcribe** the values into `test/fixtures/jhora-data9.json` or `test/fixtures/jhora-data9-kalachakra.txt`
   (and copy to `references/`).
3. **Environment**: the server needs `swetest` on `PATH` and `SE_EPHE_PATH` pointing at the ephemeris
   files (`vendor/swisseph` in the repo). Without them the tests skip instead of failing.
4. **Compare**:
   - Kalachakra text pasted from JH: save it to `test/fixtures/jhora-data9-kalachakra.txt` and run
     `node .claude/skills/jhora-verification/scripts/compare-kalachakra.mjs --birth 1999-06-06T15:30:01+05:30 --file test/fixtures/jhora-data9-kalachakra.txt`
     from the repo root. It walks every MD/AD/PD/SD/PAD/deha line, drills down with JH pada labels
     (needed because a sign can occur twice in one period) and prints label and time differences.
   - Chart values: call `calculate_vedic_chart` with `ayanamsa: "true_lahiri"` and the matching `include`
     through `test/mcp-client.js` and compare per planet/sign.
5. **When something differs**, work out JH's rule rather than nudging numbers: compute the value JH
   implies, list candidate rules, and test them all against every JH number available.
6. **Lock it in**: add the values to `test/data9.test.js` or `test/jhora.test.js`, run `npm test`
   (all suites must pass), and note behaviour changes in `CHANGELOG.md`.

## What JH does (verified on Data 9)

Verified directly against Data 9 (`1999-06-06T15:30:01+05:30`, True Lahiri, SM Singh, True nodes):
- **Kalachakra Dasha** (`test/fixtures/jhora-data9-kalachakra.txt`):
  - Summary line: `From Moon of D-1, Apasavya, Paramayush: 83 yr, Deha: Ta, Jiva: Ge`
  - 94 periods across all 6 levels (9 Mahadashas, 9 `Ta Dhan3` Antardashas, 4 Pratyantardashas, 5 Sookshma-antardashas, 13 Praana-antardashas including all 9 PADs of `Vi Bhar2`, and 54 Deha-antardashas across 6 PADs).
- **Positions, Rasi (D-1), Navamsa (D-9), Bhrigu Bindu & Panchanga** (`test/fixtures/jhora-data9.json`):
  - All 10 bodies (`Lagna`, `Sun`..`Ketu`) match longitude, nakshatra, pada, D-1 sign (`rasi`), and D-9 sign (`navamsa`).
  - `Bhrigu Bindu` (`1 Sc 29' 39.69"`) matches within `0.5"`.
  - Recorded in `jhora-data9.json` for reference: Chara Karakas, Maandi, Gulika, Special Lagnas, Upagrahas, Sphutas, V2–V12, Kunda, and Panchanga.
- **Kalachakra sub-period direction**: a period's sub-periods run forward when its pada is in the same
  savya/apasavya group as its *parent's* pada (the Moon's pada for a mahadasha), backward otherwise.
  Option `subperiod_direction: "natal"` keeps the old rule.

## Reading JH screens

- North-Indian charts (D-1, D-9, ashtakavarga mini charts): house 1 is the top centre diamond and
  houses run counter-clockwise: 2 top-left triangle, 3 left upper, 4 left diamond, 5 left lower,
  6 bottom-left, 7 bottom centre, 8 bottom-right, 9 right lower, 10 right diamond, 11 right upper,
  12 top-right. Sign of house n = lagna sign + n - 1 (Data 9: house 1 = Libra).
- Kalachakra labels: sign plus JH pada label (`Aswi Bhar Krit Rohi Mrig Ardr Puna Push Asre Magh PPha UPha Hast Chit Swat Visa Anu Jye Mool PSha USha Srav Dhan Sata PBha UBha Reva`). Times print as `2026-11-12 (3:26:54)` in the birth zone.

## Optional Data 9 screenshots / exports if further JHora tab calibration is desired

Currently, JHora calibration is focused on **Kalachakra Dasha** and the **Data 9 Natal Chart / Positions / D-1 / D-9** export. If in the future you want to calibrate additional JHora tabs specifically under Data 9 (`1999-06-06 15:30:01`, True Lahiri, True nodes), you can share:
- **Vimshottari Dasha** text export under Data 9 (True Lahiri)
- **KP tab** text export / screenshot under Data 9 (True Lahiri, True nodes)
- **Strengths > Other strengths** and **Ashtakavarga** under Data 9 (True Lahiri, True nodes)
- **Divisional charts (D-3, D-7, D-10, D-60)** under Data 9 (True Lahiri, True nodes)
