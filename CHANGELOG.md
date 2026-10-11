# Changelog

## 1.1.0

Vedic, KP and rectification features. Defaults follow Jagannatha Hora; every classical choice is selectable and named in each response's `settings`. Errors are JSON with a `reason` and the `parameter` to fix.

### New tools

- `calculate_gochar`: transits over the natal chart. Positions with house from the Moon, lagna and KP cusps. Saturn states from the Moon (Sade Sati phases, Ashtama, Kantaka, Ardhashtama) with exact spans including retrograde re-entries, and Jupiter/Rahu/Ketu stays. Tara and chandra bala, and Jupiter/Saturn/Rahu/Ketu hits on natal points with the exact dates. Sign/nakshatra ingresses and stations in a `from`/`to` range. Parameters: `as_of`, `from`, `to`, `search_planets`, `search_events`, `orb` (1°), `kantaka_includes_first` (false), `ayanamsa`, `node_type`, `position_type`, `output`, `current_timezone`.
- `calculate_ruling_planets`: KP day lord, Moon and lagna sign/star/sub lords, the ordered set with Rahu/Ketu, and the cleaned set. With `birth_datetime` it adds the hour trigger. Parameters: `datetime`, `latitude`, `longitude`, `birth_datetime`, `keep_retrograde` (false), `ayanamsa`, `node_type`, `position_type`, `dasha_year_days`, `current_timezone`.
- `rectify_by_transit`: the birth time per anchor (`{as_of, planet, target}`; target `cusp1`-`cusp12`, `lagna`, `mc` or a natal planet), the residuals at the window edges, a least-squares best fit and its spread. Parameters: `anchors`, `window_seconds` (600), `ayanamsa`, `node_type`, `position_type`.

### `calculate_vedic_chart`: new parameters

- `include`: blocks to add, default `["dignity","vargas","aspects"]`, or `"all"`. The blocks are `dignity`, `vargas`, `aspects`, `ashtakavarga`, `shadbala`, `bhavabala`, `kp_significators`, `yogini`, `ashtottari`, `chara` and `narayana`.
- `vargas` (default `["D1","D9"]`, or `"all"` for D1-D60) and `varga_method` (`parashara`/`parivritti` for D2, D3, D30). The vargas block includes the D-60 deity, `vargottama`, Vimshopaka bala and `lagna_sign_change`.
- Dignity: `rahu_exaltation` (`Ta`/`Ge`), `moolatrikona`, `combustion_limits`, `war_winner` (`latitude`/`brightness`), `stationary_ratio` (0.1).
- Aspects: `rahu_ketu_aspects` (`none`, `5_9` default, `5_7_9_12`), `aspect_strength`, `jaimini_aspects`.
- Ashtakavarga: `shodhana`. With a single `as_of`, the transit bindus and kakshyas are included.
- Shadbala: `sunrise` (`standard`/`hindu`), `moon_benefic` (`ashtami` default, or `waxing`).
- `kp_significators` (boolean). With a single `as_of` it adds the hour trigger.
- `chara_method` (`pvn_rao` default, or `kn_rao`).
- Rectification: `birth_time_sweep`, `sweep_output` (`auto`/`ranges`/`flips`), `event_tests` and `sweep_dasha` (`vimshottari`/`yogini`/`ashtottari`).

### `calculate_kalachakra_dasha`: new parameters

- `sweep_output`, `event_tests` (with `latitude`/`longitude` for `house_from_lagna`), `gati_list` (`from`, `to`, `levels`, `types`, `near_events`), and `ayanamsa_override` (research only; the response warns that Kalachakra is very sensitive to the ayanamsa).

### Changed

- `calculate_vedic_chart` with `output: "chain"` is now a compact format: one string per planet and cusp (`cusps`, formerly the `houses` objects), `settings` in short form, and one line per block. The running chains default to 3 levels (the other dashas to 2); `levels` gives up to 6. With every block on, the response is about 2,800 tokens (cl100k count).
- The previous `chain` format (full chart objects, `houses`, running chains as objects, `periods` in date lists) still works for this release as `output: "chain_v1"`. It will be removed in the next release.
- Kalachakra outputs are unchanged apart from added fields.

### Tests

- `npm test` runs `node:test` suites. They cover the acceptance tests T1-T8, Jagannatha Hora D-9, Ishta/Kashta and the Narayana progression table, AstroSage ashtakavarga, Shadbala and Bhavabala, Sade Sati spans with re-entries, KP, the other dashas and the compact-size check. Tests that need `swetest` are skipped when it is not on `PATH`.
