---
name: jhora-verification
description: Verify and calibrate the Swiss Ephemeris MCP server against Jagannatha Hora (JHora, JH). Holds the reference chart's birth details (Sagar, the only verified chart) and JH settings, every JH value already checked (Kalachakra to deha, Vimshottari, ashtakavarga, shadbala bars and totals, Ishta/Kashta, Vimshopaka, aspect strengths, D-3, D-9, KP lords), what JH does differently from textbooks, how to read JH screens, and a script that compares a pasted JH Kalachakra export with the server. Use this whenever the user shares JH screenshots or pasted JH dasha text, says "test/cross-check/calibrate against JHora", reports that the server disagrees with JH, asks for the Sagar reference chart details or JH settings, or before changing any Kalachakra, shadbala, ashtakavarga, aspect, varga, Vimshopaka or dasha rule in this repository.
---

# Verifying the server against Jagannatha Hora

Jagannatha Hora is the user's reference software. The server's defaults are meant to reproduce it, so
every disagreement is either a bug, an unmatched JH setting, or a JH method choice we have not
copied yet. JH screenshots are expensive for the user to make, so record every value they send (in a
fixture and a test) and ask for the specific screens that would settle an open question.

## Reference chart

| Chart | Birth (as entered in JH) | Place | JH file |
|---|---|---|---|
| Sagar | 1999-06-06 15:30:00 +05:30 | Bhavnagar, 21°46'N 72°09'E (21.7667, 72.15) | Sagar.jhd |

Sagar's chart is the only verified data: the user confirmed its birth details are exact, so every
test and fixture uses it alone. Other people's charts (earlier Varsha and Dhruvit) were removed on
the user's instruction. Do not add another chart to the tests or fixtures unless the user gives it
as verified; a one-off check of someone else's chart is fine, just keep it out of the repository.

Machine-readable JH values: `test/fixtures/jhora-sagar.json` (a copy is in `references/` for use
outside the repo). JH's Kalachakra text export for Sagar: `references/sagar-kalachakra-jh.txt`.
`test/helpers.js` exports it as `JH` and the birth as `SAGAR`.

## JH settings to match before comparing anything

- Ayanamsa Traditional Lahiri, no correction (Select Ayanamsa dialog). Our `traditional_lahiri`.
- Geocentric, true positions (not apparent), true sidereal solar years for dashas.
- **Nodes** (Planet Calculation Options): every Sagar screen recorded so far was made with **mean
  nodes**. The server's default is true nodes (the user's choice), with `node_type: "mean"` only on
  explicit request. So compare node-dependent JH values with `node_type: "mean"` unless the screen
  was made after JH was switched to True nodes, and record which setting each new screen used.
  Node-dependent: Rahu/Ketu degrees, nakshatra and KP lords, their varga signs (D-3 and D-9 happen
  to agree for Sagar; D-7, D-10, D-20, D-24, D-27, D-40, D-45, D-60 differ), Rahu's Vimshopaka,
  KP significators and ruling planets involving the nodes, Chara/Narayana (node co-lordship),
  Ashtottari's Rahu rule, transit Rahu/Ketu. Not node-dependent: Kalachakra, Vimshottari,
  Shadbala, Ishta/Kashta, Ashtakavarga, the seven planets' Vimshopaka, lagna/cusps.
- Kalachakra: starting point Janma tara (Moon), Rasi D-1, "Full cycle fraction, MDs strictly from
  cycle, ADs from MD like MDs from navamsa (SM Singh)", Rohini 4th pada = Leo navamsa.
- Times in the birth offset. Our lagna sits about 13" from JH's. Kalachakra times differ from JH by
  up to about 52 s and Vimshottari by up to 15 s until about 2030. Later dates drift by about
  1.5 s a year (Vimshottari +141 s by 2112, Kalachakra -52 s in 2007 to +42 s in 2080): JH
  extrapolates delta-T with an older, larger model, so its future dates come earlier. That drift
  is not a rule difference; anything beyond it is.

## Workflow

1. **Name what each screenshot shows** (tab, sub-tab, chart, settings visible) and check the settings
   above. If a dialog hides part of a table, use what is visible and ask for the rest.
2. **Transcribe** the values into `test/fixtures/jhora-sagar.json` (and its copy in `references/`).
   Read north-Indian charts with the layout below; bar-graph numbers are rounded.
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
   every JH number available. Keep a rule only if it explains all the data, and say that it rests on
   Sagar's chart alone. A JH Ishta/Kashta pair, or a JH total minus our other parts, often pins one
   component exactly. Keep the textbook alternative selectable (an option named in `settings`) when
   it differs from JH, since other software (AstroSage) follows it. If no rule fits, leave the code
   alone, record the gap under open items and ask for the screen that would isolate it.
6. **Lock it in**: add the values to `test/jhora.test.js` (or a new test on Sagar's chart), run
   `npm test` (all suites must pass), and note behaviour changes in `CHANGELOG.md`. When a JH
   correction changes earlier results, keep the old behaviour reachable by an option and tell the
   user plainly what changed (e.g. birth-time windows found with the old Kalachakra rule).
   Features JH has not shown (gochar, KP significators, other dashas) are tested on Sagar's chart
   against the ephemeris or the defining rule, never against frozen output.

## What JH does (verified on Sagar's chart)

Verified so far: Kalachakra (88 periods to deha, summary line), Vimshottari mahadashas, D-3,
D-9, KP lords of the lagna/Sun/Moon/12th cusp, SAV and BAV (lagna, Sun-Mercury), shadbala bar
graphs, Other strengths (shadbala totals, rupas, %, Ishta/Kashta, Vimshopaka in four schemes),
house aspect strengths, key info (weekday, hora lord, nakshatra).

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
    The Sun's cheshta is (sayana *mean* Sun + 90°)/3 (Meeus L0; JH 54.80, shown in Ishta/Kashta).
  - Ishta = sqrt(uchcha x cheshta), Kashta = sqrt((60 - uchcha)(60 - cheshta)): a JH Ishta/Kashta
    pair gives JH's uchcha and cheshta bala exactly, which is how the mean-Sun rule was found.
- **Vimshopaka** (`vimshopaka_method: "jh"`): own sign 20, else the compound relationship with the
  sign lord (adhimitra 18, mitra 15, sama 10, shatru 7, adhishatru 5) where the *temporary*
  relationship is read in that divisional chart itself; D-2 is the parivritti hora with even signs
  reversed; exaltation earns nothing extra. Saptavarga weights are D1 5, D2 2, D3 3, D7 1, D9 2.5,
  D12 4.5, D30 2 (not BPHS's D7 2.5, D9 4.5, D12 2, D30 1). All 28 values match. JH prints 11.925
  as 11.92 once and 11.93 once, so compare to 0.01.
  Rahu is scored the same way with these natural relationships: Venus and Saturn friends, Mercury
  and Jupiter neutral, the Moon an enemy (all four of JH's Rahu values match with the mean node;
  the Sun and Mars were not tested and are taken as enemies). Ketu's row has not been seen.
- **D-3** and **D-9** standard Parashara; **KP** star/sub/sub-sub lords of lagna and planets match.
- **Vimshottari**: true sidereal solar years from the true Sun (a fixed-length year is 5.5 h off at
  the first mahadasha end, the true Sun matches to 3 s).

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
- Strengths > Other strengths: shadbala virupas, rupas and % to 0.01; Ishta/Kashta; Vimshopaka
  columns Dasa (10), Shodasa (16), Sapta (7), Shad (6) varga, Sun-Saturn plus Rahu (and Ketu below).
- Basics > aspected body table: rows are the lagna degree + 30° x (n - 1), not house cusps; values are
  virupas / 60 in percent; columns are the aspecting planets.
- KP tab columns: nakshatra lord, sub, prati-sub, sookshma-sub, praana-sub, deha-sub.

## Open items: screenshots worth asking for

- **Kala bala breakdown** (Nathonnata, Paksha, Tribhaga, Abda, Masa, Vara, Hora, Ayana) if JH can
  show it. JH's exact totals imply a day strength (nathonnatha) of about 46.64 for Sagar against
  our 45.83 (linear from apparent midnight); midnight, LMT, unequal-hour, altitude and ecliptic
  variants were all tried and none gives 46.64. After that, Venus's kala bala is still about 0.5
  higher in JH and Jupiter's about 0.2 lower, which points at ayana bala, but no declination rule
  tried fits both.
- Mercury's cheshta bala: JH 16.04 (from Ishta/Kashta) against our 15.80; Mars/Jupiter/Venus/Saturn
  agree within 0.08.
- **After switching JH to True nodes** (Settings > Planet Calculation Options > True nodes), for
  Sagar: Basics planet table (Rahu/Ketu degrees), the KP tab rows for Rahu and Ketu, Strengths >
  Other strengths scrolled to the Rahu and Ketu Vimshopaka rows, and D-7/D-10/D-60 (or any varga
  table) with Rahu/Ketu. The server predicts, with true nodes: Rahu Cn 20°52'02" Ashlesha 2, KP
  Me/Ve/Sa; Ketu Cp 20°52'02" Shravana 4, KP Mo/Ve/Su; Rahu Vimshopaka Dasa 11.80, Shodasa 11.00,
  Sapta 12.63, Shad 11.20. With mean nodes it gives Rahu Cn 22°16'02" (KP Me/Mo/Mo) and JH's
  11.20/10.63/12.48/11.20. Ketu's Vimshopaka needs its JH row before it can be added.
- KP tab without the ayanamsa dialog, and Basics > Houses: JH's 12th cusp (sub lord Rahu) points to
  Sripati/Porphyry cusps, while the server's KP cusps are Placidus.
- Basics > aspected body table scrolled to the planet rows (confirms drik bala directly).
- Strengths > Ashtakavarga for Jupiter, Venus and Saturn (only SAV, lagna, Sun-Mercury seen).
- Strengths > Bhava bala for Sagar (the Other strengths screen has no bhava bala).
- Vimshottari antardashas of the current mahadasha (Saturn, 2026-2045) to check sub-period times.
- Dasas > Rasi dasas (Chara, Narayana) and Nakshatra dasas (Yogini, Ashtottari) for Sagar: these
  follow documented rules but have not been compared with JH.
