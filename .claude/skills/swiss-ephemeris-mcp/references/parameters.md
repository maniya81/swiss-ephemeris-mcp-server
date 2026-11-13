# Parameters (defaults in brackets)

Common (5 general Vedic tools — `calculate_vedic_chart`, `calculate_gochar`, `calculate_ruling_planets`, `rectify_by_transit`, `nakshatra_house_map`): `datetime` (ISO8601; omitted offset assumes IST `+05:30`; optional on `calculate_ruling_planets`), `latitude`, `longitude` (`nakshatra_house_map` may omit these if `lagna` is given),
`ayanamsa` [`traditional_lahiri`] | `true_lahiri` | `lahiri` | `kp_new` | `kp_old` | `raman` | `yukteshwar` | `fagan_bradley`,
`position_type` [`true`] | `apparent`, `node_type` [`true`] | `mean`.
`current_timezone` (IANA name): supported on `calculate_vedic_chart`, `calculate_kalachakra_dasha`, `calculate_gochar`, `calculate_ruling_planets`.

## calculate_vedic_chart
- `as_of` date or list (≤200) [now]; `levels` `1-6` (1 MD … 5 PAD … 6 deha) [`full`: 6; `chain`: running chains 3, extra dashas 2];
  `output` [`full`] | `chain` | `chain_v1` (deprecated) (use `chain`; `as_of` list also forces compact); `dasha_year_days` (fixed days, e.g. `365.25`) [true sidereal solar year].
- `kalachakra_ayanamsa` [`true_lahiri`] — Kalachakra always defaults to True Lahiri / Chitrapaksha (`true_lahiri`), SM Singh method, True nodes, Rohini 4th pada = Leo navamsa, 360° Sidereal Solar Years.
- `include` [`dignity`, `vargas`, `aspects`] | `"all"` (11 standard blocks) | list of: `dignity` `vargas` `aspects` `ashtakavarga`
  `shadbala` `bhavabala` `kp_significators` `yogini` `ashtottari` `chara` `narayana`, plus opt-in `nakshatra_houses` (excluded from `"all"`).
- `locate` [optional] nakshatra name for `nakshatra_houses` (auto-includes `nakshatra_houses`).
- vargas: `vargas` [`D1`,`D9`] | `"all"` (D1-D60); `varga_method` `{D2: parashara|parivritti|pvr,
  D3/D30: parashara|parivritti}`; `vimshopaka_method` [`jh`] | `bphs`.
- dignity: `rahu_exaltation` [`Ta`] | `Ge`, `moolatrikona`, `combustion_limits`, `war_winner`
  [`latitude`] | `brightness`, `stationary_ratio` [`0.1`].
- aspects: `rahu_ketu_aspects` `none` | [`5_9`] | `5_7_9_12`, `aspect_strength`, `jaimini_aspects`,
  `drishti_rule` [`jh`] | `bphs`.
- strength: `shadbala_method` [`jh`] | `raman`, `sunrise` [`standard`] | `hindu`, `moon_benefic`
  [`ashtami`] | `waxing`, `ashtakavarga_tables` [`jh`] | `bphs`, `shodhana`.
- others: `kp_significators` (bool alias for `include: ["kp_significators"]`; single `as_of` adds `hour_trigger`), `chara_method` [`pvn_rao`] | `kn_rao`,
  `subperiod_direction` [`parent`] | `natal` (Kalachakra).
- rectification: `birth_time_sweep` `{from_seconds, to_seconds, step_seconds}` (≤3601 times),
  `sweep_output` [`auto`] | `ranges` | `flips`, `sweep_dasha` [`vimshottari`] | `yogini` | `ashtottari`,
  `event_tests` `[{id?, as_of, level, expect:[...] | {house_from_lagna:[...]} | {house_from_moon:[...]}, system?, ayanamsa?}]`.

## calculate_kalachakra_dasha (only `datetime` needed; optional `latitude`/`longitude` for `house_from_lagna` tests)
Does not take `ayanamsa`, `position_type`, or `node_type`. Defaults: `True Lahiri / Chitrapaksha` (`true_lahiri`), `SM Singh` method, `True nodes`, `Geocentric true positions`, `Janma tara (Moon)` in `Rasi (D-1)`, `Rohini 4th pada = Leo navamsa`, `360° Sidereal Solar Years`.
Parameters: `as_of` (≤200), `levels` [`6`] (always 6 by default, even with `output: "chain"`), `output` [`full`] | `chain`, `drill_down` `["Ta"]`, `["Ta","Vi"]` or JH
labels `"Ta Dhan3"` / `"Sc Visa1"` / `"Sc#2"` when a sign repeats; `gati_list`
`{from, to, levels?[3], types?, near_events?}` (forces compact output); `birth_time_sweep`, `sweep_output`, `event_tests`;
`subperiod_direction` [`parent`] | `natal`; `ayanamsa_override` (research only).

## calculate_gochar
`as_of` date or list (≤200) [now]; `from`/`to` range (≤100 years) with `search_planets`
[all but Moon] and `search_events` [`sign`, `nakshatra`, `station`]; `orb` [`1`];
`kantaka_includes_first` [`false`]; `output` [`full`] | `chain`.

## calculate_ruling_planets (only `latitude`, `longitude` needed; no `output` param)
`datetime` moment [now in IST]; `birth_datetime` adds `hour_trigger`; `keep_retrograde` [`false`];
`dasha_year_days`.

## rectify_by_transit (no `output` or `current_timezone` param)
`anchors` `[{as_of, planet, target: cusp1-cusp12 | lagna | mc | natal planet, weight?[1]}]` (1-20),
`window_seconds` [`600`] (10-7200).

## nakshatra_house_map (no `current_timezone` param; `charan_window` uses birth local clock)
Either birth data (`datetime`, `latitude`, `longitude`, optional `ayanamsa`, `position_type`, `node_type`) OR `lagna` (`"Cn 6°23'15\""` or `{sign, deg, min?, sec?}`);
optional `locate` (nakshatra name), `output` [`full`] | `chain` (`full` also returns per-house `bhava_span` for exact `±15°` boundaries).

## Western tools (Tropical zodiac; pass explicit UTC offset or `Z`, no `output` / `current_timezone`)
- `calculate_planetary_positions`: `datetime`, `latitude`, `longitude`
- `calculate_transits`: `birth_datetime`, `latitude`, `longitude`
- `calculate_solar_revolution`: `birth_datetime`, `birth_latitude`, `birth_longitude`, `return_year` (1900-2100), `return_latitude?`, `return_longitude?`
- `calculate_synastry`: `person1_datetime`, `person1_latitude`, `person1_longitude`, `person2_datetime`, `person2_latitude`, `person2_longitude`
