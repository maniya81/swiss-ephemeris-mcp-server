---
name: swiss-ephemeris-mcp
description: How to call the Swiss Ephemeris MCP server (Vedic/KP astrology tools calculate_vedic_chart, calculate_kalachakra_dasha, calculate_gochar, calculate_ruling_planets, rectify_by_transit, plus western positions/transits/synastry) with the fewest tokens - which tool answers which question, the arguments that keep responses small, and real example requests and responses. Use it whenever these tools are available and the user asks about a birth chart, lagna, nakshatra, KP sub lords, any dasha (Vimshottari, Kalachakra, Yogini, Ashtottari, Chara, Narayana), what period is running or when it ends, transits, Sade Sati, ruling planets, shadbala, ashtakavarga, vargas, or birth-time rectification - even a casual "what's my dasha now?" or "when does Saturn leave Pisces?".
---

# Swiss Ephemeris MCP: minimal-token usage

Defaults already match Jagannatha Hora (Traditional Lahiri, true positions, true nodes, true
sidereal solar years, Kalachakra SM Singh). Pass a setting only when the user asks for another one.

## Inputs (all tools)
- `datetime`: `YYYY-MM-DDTHH:mm:ss+05:30` with the seconds exactly as given. No zone given → IST.
- `latitude`/`longitude`: decimal, north and east positive (Bhavnagar 21.7667, 72.15). Kalachakra
  needs only `datetime`.
- Only on request: `ayanamsa` (`kp_new` for KP users), `node_type: "mean"`, `position_type: "apparent"`.
- Error → `{"error":{"reason":"…","parameter":"vargas"}}`: fix that parameter and retry once.

## Pick the tool

| Question | Call |
|---|---|
| Lagna, planets, KP lords, running Vimshottari + Kalachakra | `calculate_vedic_chart` `output:"chain"`, `include:[]` |
| Period on several dates (events) | same, `as_of:[…]` (≤200) |
| Kalachakra detail / sub-periods | `calculate_kalachakra_dasha` `output:"chain"` or `drill_down` |
| Transits, Sade Sati, Jupiter/Rahu stays, tara bala | `calculate_gochar` `output:"chain"` |
| Ingress/station dates | `calculate_gochar` `from`,`to`,`search_planets`,`search_events` |
| KP ruling planets, hour trigger | `calculate_ruling_planets` (+`birth_datetime`) |
| Shadbala, ashtakavarga, vargas, dignity, other dashas | `calculate_vedic_chart` `output:"chain"`, `include:[blocks]` |
| Rectify birth time from events | `calculate_kalachakra_dasha` or `calculate_vedic_chart` with `birth_time_sweep` + `event_tests` |
| Rectify from a transit on a cusp | `rectify_by_transit` |

Blocks: `dignity vargas aspects ashtakavarga shadbala bhavabala kp_significators yogini ashtottari
chara narayana` (or `"all"`). Parameter list: `references/parameters.md`.

## Keep responses small (sizes for one chart)
- Always `output:"chain"`: the default `full` chart is about 18k tokens, `chain` with `include:[]`
  about 1.5k, with every block 2.8k. Kalachakra `full` 7k, `chain` 1.3k.
- `levels`: 2-3 for "what is running"; 6 (to deha) only when asked.
- One call for many dates (`as_of` list) instead of one call per date.
- Sub-periods of one period: `drill_down` steps (`"Ta"`, or JH labels `"Ta Dhan3"` when a sign
  repeats), never a full tree.
- Native abroad: `current_timezone:"Australia/Melbourne"` adds `*_local`; never convert yourself.
- Read `ends_in`/`next` from the response instead of computing dates.

## Examples (Sagar, 1999-06-06 15:30:00 IST, Bhavnagar; responses trimmed with …)

**1. What is running now** - one call gives both dashas.
```json
{"datetime":"1999-06-06T15:30:00+05:30","latitude":21.7667,"longitude":72.15,"output":"chain","include":[],"as_of":"2026-10-11T12:00:00+05:30","levels":2}
```
```json
{"lagna":"Li 0°39'33\" Chitra 3 Ma/Me/Ve",
 "planets":{"Moon":"Aq 12°05'23\" Shatabhisha 2 Ra/Sa/Ra WS5 KP5", …},
 "vimshottari_dasha":{"current":{"chain":"Saturn-Saturn","levels":[
   "mahadasha Saturn: 2026-02-09T00:25:36+05:30 -> 2045-02-08T21:16:54+05:30 (ends in 6695d 09:16:54; next Mercury)", …]}},
 "kalachakra_dasha":{"direction":"Apasavya","paramayush":83,"current":{"chain":"Ta-Cn","levels":[
   "mahadasha Ta Dhanishta 3: 2014-05-24T04:23:17+05:30 -> 2030-05-24T06:44:32+05:30 (ends in 1320d 18:44:32; next Ge Purva Bhadrapada 3)",
   "antardasha Cn Rohini 4 [Manduka]: 2023-10-24T23:58:22+05:30 -> 2027-10-07T22:24:53+05:30 …"]}}}
```
Planet strings: sign degree nakshatra pada star/sub/sub-sub lords, WS = whole-sign house, KP = KP
house, R = retrograde. `[Manduka]` = gati (jump) into that period.

**2. Several event dates** - `as_of` list, compact chains.
```json
{"datetime":"1999-06-06T15:30:00+05:30","latitude":21.7667,"longitude":72.15,"include":[],"as_of":["2017-06-01T12:00:00+05:30","2026-09-22T12:00:00+05:30"],"levels":3}
```
```json
{"vimshottari_dasha":{"chains":[{"as_of":"2017-06-01T12:00:00+05:30","chain":"Jupiter-Ketu-Mars"},{"as_of":"2026-09-22T12:00:00+05:30","chain":"Saturn-Saturn-Mercury"}]},
 "kalachakra_dasha":{"chains":[{"as_of":"2017-06-01T12:00:00+05:30","chain":"Ta-Pi-Cn"},{"as_of":"2026-09-22T12:00:00+05:30","chain":"Ta-Cn-Ta"}]}}
```

**3. Kalachakra sub-periods of one antardasha** (Ta MD > Cn AD)
```json
{"datetime":"1999-06-06T15:30:00+05:30","drill_down":["Ta Dhan3","Cn Rohi4"],"output":"chain","levels":1}
```
```json
{"drill_down":{"path":[…],"pratyantardashas":[
  {"sign_abbr":"Sc","pada":"Magha 1","start":"2023-10-24T23:58:22+05:30","end":"2024-01-31T08:19:32+05:30"},
  …]}}
```

**4. Transits and Sade Sati**
```json
{"datetime":"1999-06-06T15:30:00+05:30","latitude":21.7667,"longitude":72.15,"as_of":"2026-10-11T12:00:00+05:30","output":"chain"}
```
```json
{"positions":{"Saturn":"Pi 16°32'09\" Uttara Bhadrapada 4 M2 L6 KP6 R", …},
 "saturn":["sade_sati setting: 2020-01-24T08:24:25+05:30 -> 2028-02-23T18:01:06+05:30 in 6 spans (…)", …],
 "slow":"Jupiter Cn M6 L10 (2025-10-18T19:06:02+05:30 -> 2027-06-26T04:29:10+05:30, 3 spans); …",
 "tara_bala":"Parama Mitra (9, favourable) until 2026-10-11T22:32:43+05:30", …}
```
M = house from the natal Moon, L = from the lagna. Spans include retrograde re-entries.

**5. KP ruling planets with the hour trigger**
```json
{"datetime":"2026-10-11T12:00:00+05:30","latitude":21.7667,"longitude":72.15,"birth_datetime":"1999-06-06T15:30:00+05:30"}
```
```json
{"ruling_planets":["Ketu","Jupiter","Mars","Venus","Sun","Mercury"],"excluded":[{"planet":"Venus","reason":"retrograde"}],
 "cleaned":["Ketu","Jupiter","Mars","Sun","Mercury"],
 "hour_trigger":{"running_chain":"Saturn-Saturn-Mercury-Moon-Rahu-Saturn","moon_sub_lord":"Mercury","moon_sub_lord_matches":["pratyantardasha"],"triggered":true}}
```

**6. Strength blocks** - one line each in `chain` output.
```json
{"datetime":"1999-06-06T15:30:00+05:30","latitude":21.7667,"longitude":72.15,"output":"chain","include":["shadbala","ashtakavarga"],"levels":1}
```
```json
{"shadbala":"Su 8.99 1.8x #1, Mo 6.14 1.02x #7, Ma 7.17 1.43x #2, Me 7.49 1.07x #6, Ju 7.29 1.12x #4, Ve 7.3 1.33x #3, Sa 5.6 1.12x #5",
 "ashtakavarga":{"sav":"Ar27 Ta24 Ge21 Cn29 Le34 Vi19 Li29 Sc33 Sg31 Cp26 Aq32 Pi32 = 337 (337 ok)","bav_totals":"Su 48, Mo 49, …"}}
```
Shadbala: rupas, ratio to the required minimum, rank.

**7. Rectification against events**
```json
{"datetime":"1999-06-06T15:30:00+05:30","as_of":["2026-09-22T12:00:00+05:30"],"levels":5,
 "birth_time_sweep":{"from_seconds":-30,"to_seconds":30,"step_seconds":1},
 "event_tests":[{"id":"move","as_of":"2026-09-22T12:00:00+05:30","level":5,"expect":["Sc"]}]}
```
```json
{"event_tests":{"tests":[{"id":"move","passes_at_given_birth_time":true,"windows":[…,{"from_s":-1.036,"to_s":1.635}, …]}],"intersection":[…]}, …}
```
Give several events; `intersection` is the birth-time window all of them allow. Use
`sweep_output:"flips"` if ranges are long.

## Answering
- Quote times with seconds; with `current_timezone`, give both columns (birth zone, local).
- Mention any non-default setting the response's `settings` shows.
