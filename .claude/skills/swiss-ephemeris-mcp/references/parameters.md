# Parameters (defaults in brackets)

Common: `datetime` (birth, ISO with offset and seconds), `latitude`, `longitude`,
`ayanamsa` [traditional_lahiri] | lahiri | kp_new | kp_old | raman | yukteshwar | fagan_bradley,
`position_type` [true] | apparent, `node_type` [true] | mean, `current_timezone` (IANA name).

## calculate_vedic_chart
- `as_of` date or list (≤200) [now]; `levels` 1-6 (1 MD … 6 deha) [chain: 3, other dashas 2];
  `output` [full] | chain (use chain); `dasha_year_days` (fixed year, e.g. 365.25) [true solar].
- `include` [dignity, vargas, aspects] | "all" | list of: dignity vargas aspects ashtakavarga
  shadbala bhavabala kp_significators yogini ashtottari chara narayana.
- vargas: `vargas` [D1,D9] | "all" (D1-D60); `varga_method` {D2: parashara|parivritti|pvr,
  D3/D30: parashara|parivritti}; `vimshopaka_method` [jh] | bphs.
- dignity: `rahu_exaltation` [Ta] | Ge, `moolatrikona`, `combustion_limits`, `war_winner`
  [latitude] | brightness, `stationary_ratio` [0.1].
- aspects: `rahu_ketu_aspects` none | [5_9] | 5_7_9_12, `aspect_strength`, `jaimini_aspects`,
  `drishti_rule` [jh] | bphs.
- strength: `shadbala_method` [jh] | raman, `sunrise` [standard] | hindu, `moon_benefic`
  [ashtami] | waxing, `ashtakavarga_tables` [jh] | bphs, `shodhana`.
- others: `kp_significators` (bool), `chara_method` [pvn_rao] | kn_rao,
  `subperiod_direction` [parent] | natal (Kalachakra).
- rectification: `birth_time_sweep` {from_seconds, to_seconds, step_seconds} (≤3601 times),
  `sweep_output` [auto] | ranges | flips, `sweep_dasha` [vimshottari] | yogini | ashtottari,
  `event_tests` [{id, as_of, level, expect:[...]} | {…, house_from_lagna:[...]}, system?].

## calculate_kalachakra_dasha (only `datetime` needed)
`as_of` (≤200), `levels` [6], `output` [full] | chain, `drill_down` ["Ta"], ["Ta","Vi"] or JH
labels "Ta Dhan3" / "Sc (Visa1)" / "Sc#2" when a sign repeats; `gati_list`
{from, to, levels, types?, near_events?}; `birth_time_sweep`, `sweep_output`, `event_tests`;
`subperiod_direction`; `ayanamsa_override` (research only).

## calculate_gochar
`as_of` date or list (≤200) [now]; `from`/`to` range (≤100 years) with `search_planets`
[all but Moon] and `search_events` [sign, nakshatra, station]; `orb` [1];
`kantaka_includes_first` [false]; `output` [full] | chain.

## calculate_ruling_planets (only `latitude`, `longitude` needed)
`datetime` moment [now]; `birth_datetime` adds the hour trigger; `keep_retrograde` [false];
`dasha_year_days`.

## rectify_by_transit
`anchors` [{as_of, planet, target: cusp1-cusp12 | lagna | mc | natal planet, weight?}] (1-20),
`window_seconds` [600] (10-7200).

## Western tools
`calculate_planetary_positions` (datetime, latitude, longitude), `calculate_transits`
(birth_datetime, latitude, longitude), `calculate_solar_revolution` (birth_datetime,
birth_latitude, birth_longitude, return_year, return_latitude?, return_longitude?),
`calculate_synastry` (person1_/person2_ datetime, latitude, longitude). Tropical.
