---
name: jhora-verification
description: Verify and calibrate the Swiss Ephemeris MCP server against Jagannatha Hora (JHora, JH). Holds the reference charts' birth details and JH settings, every JH value already checked (Kalachakra to deha, ashtakavarga, shadbala, aspect strengths, D-9, KP lords), what JH does differently from textbooks, how to read JH screens, and a script that compares a pasted JH Kalachakra export with the server. Use this whenever the user shares JH screenshots or pasted JH dasha text, says "test/cross-check/calibrate against JHora", reports that the server disagrees with JH, asks for the Sagar, Varsha or Dhruvit reference chart details or JH settings, or before changing any Kalachakra, shadbala, ashtakavarga, aspect, varga or dasha rule in this repository.
---

# Verifying the server against Jagannatha Hora

Jagannatha Hora is the user's reference software. The server's defaults are meant to reproduce it, so
every disagreement is either a bug, an unmatched JH setting, or a JH method choice we have not
copied yet. JH screenshots are expensive for the user to make, so record every value they send (in a
fixture and a test) and ask for the specific screens that would settle an open question.

## Reference charts

| Chart | Birth (as entered in JH) | Place | Notes |
|---|---|---|---|
| Sagar | 1999-06-06 15:30:00 +05:30 | Bhavnagar, 21°46'N 72°09'E | JH file Sagar.jhd; most JH data below. AstroSage comparisons used 15:30:03 at Botad 22°10'N 71°40'E with Lahiri |
| Varsha | 1979-08-16 05:25:00 +05:30 | Botad, 22.1667 N 71.6667 E | Acceptance tests T1-T8. Rectified to +4.65...+5.60 s under the pre-1.1.0 Kalachakra rule; needs re-checking (see open items) |
| Dhruvit | 2001-06-09 06:30:45 +05:30 | Surat, 21°10'N 72°49'E | JH Ishta/Kashta known |

Machine-readable JH values: `test/fixtures/jhora-sagar.json` (a copy is in `references/` for use
outside the repo). JH's Kalachakra text export for Sagar: `references/sagar-kalachakra-jh.txt`.

## JH settings to match before comparing anything

- Ayanamsa Traditional Lahiri, no correction (Select Ayanamsa dialog). Our `traditional_lahiri`.
- True positions (not apparent), true nodes, true sidereal solar years for dashas.
- Kalachakra: starting point Janma tara (Moon), Rasi D-1, "Full cycle fraction, MDs strictly from
  cycle, ADs from MD like MDs from navamsa (SM Singh)", Rohini 4th pada = Leo navamsa.
- Times in the birth offset. Our lagna sits about 13" from JH's; Kalachakra times differ from JH by
  up to about 50 s (Moon position and ΔT); Vimshottari by up to about 40 s. Anything larger is a real difference.

## Workflow

1. **Name what each screenshot shows** (tab, sub-tab, chart, settings visible) and check the settings
   above. If a dialog hides part of a table, use what is visible and ask for the rest.
2. **Transcribe** the values into the chart's fixture (`test/fixtures/jhora-<chart>.json`, same keys
   as the Sagar file). Read north-Indian charts with the layout below; bar-graph numbers are rounded.
3. **Environment**: the server needs `swetest` on `PATH` and `SE_EPHE_PATH` pointing at the ephemeris
   files (`vendor/swisseph` in the repo). Without them the tests skip instead of failing.
4. **Compare**:
   - Kalachakra text pasted from JH: save it to a file and run
     `node .claude/skills/jhora-verification/scripts/compare-kalachakra.mjs --birth <datetime> --file <file>`
     from the repo root. It walks every MD/AD/PD/SD/PAD/deha line, drills down with JH pada labels
     (needed because a sign can occur twice in one period) and prints label and time differences.
   - Chart values: call `calculate_vedic_chart` with the matching `include` (e.g. `["shadbala"]`,
     `["ashtakavarga"]`, `["vargas"]`) through `test/mcp-client.js` and compare per planet/sign.
5. **When something differs**, work out JH's rule rather than nudging numbers: compute the value JH
   implies (e.g. JH total minus our other parts), list candidate rules, and test them all against
   every JH number available. Keep a rule only if it explains all the data; if it rests on one chart,
   say so and ask for a second chart. Keep the textbook alternative selectable (an option named in
   `settings`) when it differs from JH, since other software (AstroSage) follows it.
6. **Lock it in**: add the values to `test/jhora.test.js` (or a new test), run `npm test` (all suites
   must pass), and note behaviour changes in `CHANGELOG.md`. A JH correction can change frozen
   acceptance results (as it did T8): keep the old behaviour reachable by an option, re-pin the old
   test to that option, and tell the user plainly what changed for their charts.

## What JH does (verified on Sagar's chart)

- **Kalachakra sub-period direction**: a period's sub-periods run forward when its pada is in the same
  savya/apasavya group as its *parent's* pada (the Moon's pada for a mahadasha), backward otherwise.
  Comparing with the Moon's pada instead is wrong below a savya period inside an apasavya one (Sagar
  Sg Sata4 > Sc PSha4 > Le Anu1 proved it). Option `subperiod_direction: "natal"` keeps the old rule.
- **Ashtakavarga tables**: JH's Moon BAV takes the 9th from the Moon, not the 9th from Mars, and
  Jupiter's places 1,2,4,7,8,10,11; Venus BAV takes the 4th from Mars instead of the 5th. Totals
  are unchanged. `ashtakavarga_tables: "bphs"` gives AstroSage's tables.
- **Shadbala** (`shadbala_method: "jh"`; `"raman"` reproduces AstroSage):
  - Saptavargaja uses JH's default D-2: parivritti hora with even signs reversed (Ar: Ar,Ta; Ta: Cn,Ge;
    Ge: Le,Vi; Cn: Sc,Li ...), relationships from D-1.
  - Moon's paksha bala = 2 x (Moon-Sun distance / 3); the Sun's and Moon's cheshta bala are shown but
    not added to their totals (already inside the doubled ayana/paksha bala).
  - Special aspects rise linearly from the normal value 30° before the exact aspect to 60 at it, then
    fall back over the next 30° (Mars 90°/210°, Jupiter 120°/240°, Saturn 60°/270°). This reproduced
    JH's aspected-body table to 0.005%.
  - Drik bala benefics: Jupiter, Venus, the Moon from Shukla Ashtami to Krishna Ashtami, Mercury unless
    combust or with more malefics (Sagar's combust Mercury is a malefic in JH: one chart so far).
  - Cheshta uses B.V. Raman's mean longitudes; year/month lords from his ahargana; hora from sunrise.
- **D-9** standard Parashara; **KP** star/sub/sub-sub lords of lagna and planets match.

## Reading JH screens

- North-Indian charts (D-1, D-9, ashtakavarga mini charts): house 1 is the top centre diamond and
  houses run counter-clockwise: 2 top-left triangle, 3 left upper, 4 left diamond, 5 left lower,
  6 bottom-left, 7 bottom centre, 8 bottom-right, 9 right lower, 10 right diamond, 11 right upper,
  12 top-right. Sign of house n = lagna sign + n - 1 (Sagar: house 1 = Libra).
- Kalachakra labels: sign plus JH pada label. Pada labels used by JH: Aswi Bhar Krit Rohi Mrig Ardr Puna
  Push Asre Magh PPha UPha Hast Chit Swat Visa Anu Jye Mool PSha USha Srav Dhan Sata PBha UBha Reva
  (Krit, Rohi, Mrig, Puna, Asre, PPha, UPha, Visa, Anu, Jye, PSha, Dhan, Sata, PBha, UBha, Reva seen;
  the others assumed). Times print as `2026-09-21 (1:35:05)` in the birth zone.
- Strengths > Bar graphs: sthana/kala/total rounded to integers, dig/cheshta/drik/naisargika to 0.1.
- Basics > aspected body table: rows are the lagna degree + 30° x (n - 1), not house cusps; values are
  virupas / 60 in percent; columns are the aspecting planets.
- KP tab columns: nakshatra lord, sub, prati-sub, sookshma-sub, praana-sub, deha-sub.

## Open items: screenshots worth asking for

- KP tab without the ayanamsa dialog, and Basics > Houses: JH's 12th cusp (sub lord Rahu) points to
  Sripati/Porphyry cusps, while the server's KP cusps are Placidus.
- Basics > aspected body table scrolled to the planet rows (confirms drik bala directly).
- Strengths > Ashtakavarga for Jupiter, Venus and Saturn (only SAV, lagna, Sun-Mercury seen).
- Strengths > Other strengths (bhava bala, ishta/kashta, vimshopaka) for Sagar.
- A second chart's shadbala bar graphs, to confirm the combust-Mercury rule; Sagar's Venus kala bala
  is still about 1.4 virupas below JH (cause unknown).
- Varsha: Kalachakra for the Sg mahadasha down to pratyantardasha around 2023-2026. Under JH's
  sub-period rule her 14 rectification events no longer intersect anywhere within ±1 hour.
- Dasas > Rasi dasas (Chara, Narayana) and Nakshatra dasas (Yogini, Ashtottari) for any of the charts:
  these follow documented rules but have not been compared with JH.
