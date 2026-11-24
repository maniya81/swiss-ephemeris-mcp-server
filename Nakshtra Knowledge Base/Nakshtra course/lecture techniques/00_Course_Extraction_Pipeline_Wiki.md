# Predictive Nakshatra Course — Forensic Technique Extraction Pipeline & Prompt Playbook

> **Purpose:** Repeatable end-to-end SOP and verbatim prompt library for extracting **100% of zero-noise predictive techniques**, PPT slides, JHora example charts, and book/PDF rules from Deepanshu Giri's *Predictive Nakshatra Course* into `lecture techniques/<NN>_<Topic>_Techniques.md`.
> **Method Used:** **Method 1 (Drive-Bridged Multimodal Video Extraction + Local Swiss Ephemeris MCP Verification)**
> **Target Output Folder:** `d:\SagarEpemeris\swiss-ephemeris-mcp-server\Nakshtra Knowledge Base\Nakshtra course\lecture techniques\`
> **Account & Model Verified On:** `maniyasagar20@gmail.com` (`20`) · Google AI Studio **`Gemini 4 Neon`** (Thinking Level: **`High`**, Max Output Tokens: **`65536`**)

---

## 1. Architecture & Why Each Step Exists

```
Local Course MP4 (>400 MB)
   │  [Step 1] ffmpeg -c copy (<385 MB chunks, ~35-40 min each)
   ▼
Local Scratch Chunks (.tmp_<topic>_chunks/)
   │  [Step 2] gdrive mutate upload -> <topic>_chunks_tmp/
   ▼
Google Drive (maniyasagar20@gmail.com) + Companion Book/Class PDF
   │  [Step 3] Google AI Studio (+ -> Drive picker, fresh chat per file)
   │           Video Chunks: Pass A (Atomic Rules) + Pass B (Visuals/Charts/Q&A)
   │           Companion PDF: Book Extraction Prompt
   ▼
Raw Timestamped Extractions (Clip [MM:SS] + Full-Video Offset -> [HH:MM:SS])
   │  [Step 4] Local Swiss Ephemeris MCP Audit (startServer() in test/mcp-client.js)
   ▼
MCP-Verified Facts + Cross-Check vs. *_Rules.md & youtube nakshtra/
   │  [Step 5] Deduplicate & enforce Source Authority
   ▼
lecture techniques/<NN>_<Topic>_Techniques.md  ──► [Step 6] nakshatra-deep-analysis/SKILL.md
```

### Hard Platform Constraints This Pipeline Solves
1. **AI Studio `400 MB` Video Cap:** Attaching a full 500 MB–1.25 GB lecture from Drive fails immediately with `Video file size cannot exceed 400MB.` Lossless `-c copy` splitting into `<385 MB` chunks (`~35–40 min`) satisfies the cap **and** improves 1 fps visual clarity on JHora charts/PPT slides.
2. **Browser `upload_file` Sandbox Restriction on Windows:** `mcp_chrome_devtools_upload_file` rejects local Windows disk paths (`is not within any of the configured workspace roots`). Uploading the `<385 MB` chunks once via the `gdrive` CLI lets AI Studio attach them directly via `+ -> Drive`.
3. **Single-Chat Context Dilution:** Running Pass A + Pass B in a **fresh `new_chat` per chunk** keeps output under the `65536`-token ceiling and prevents the second half of a 2.5-hour lecture from being summarized or truncated.

---

## 2. Step-by-Step Execution Runbook

### Step 1: Split the Local MP4 Losslessly Into `<385 MB` Chunks
All 13 course MP4s already live locally at:
`d:\SagarEpemeris\swiss-ephemeris-mcp-server\Nakshtra Knowledge Base\Nakshtra course\Course-content\Predictive Nakshtra Course English videos\`

Check the video's duration first with `ffprobe`, decide chunk boundaries so every part is **`< 385 MB`** (typically `30–38 min` per part for ~1 GB files), and split with `ffmpeg -c copy` (takes ~5 seconds, zero re-encoding):

```powershell
$in = "d:\SagarEpemeris\swiss-ephemeris-mcp-server\Nakshtra Knowledge Base\Nakshtra course\Course-content\Predictive Nakshtra Course English videos\<VIDEO_FILENAME>.mp4"
$outDir = "C:\Users\Sagar\.gemini\antigravity\brain\<CONVERSATION_ID>\scratch\<topic>_chunks"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Inspect total duration first
ffprobe -v error -show_entries format=duration -sexagesimal -of default=noprint_wrappers=1:nokey=1 $in

# Example 4-part split (~38 min each -> offset +00:00:00, +00:38:00, +01:16:00, +01:54:00)
ffmpeg -y -v error -ss 00:00:00 -t 00:38:00 -i $in -c copy "$outDir\<topic>_part1.mp4"
ffmpeg -y -v error -ss 00:38:00 -t 00:38:00 -i $in -c copy "$outDir\<topic>_part2.mp4"
ffmpeg -y -v error -ss 01:16:00 -t 00:38:00 -i $in -c copy "$outDir\<topic>_part3.mp4"
ffmpeg -y -v error -ss 01:54:00              -i $in -c copy "$outDir\<topic>_part4.mp4"

# Mandatory check: confirm every chunk is strictly < 385 MB
Get-ChildItem $outDir | ForEach-Object {
    $dur = (ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $_.FullName)
    [PSCustomObject]@{ Name=$_.Name; SizeMB=[math]::Round($_.Length/1MB, 2); DurationSec=[math]::Round([double]$dur, 1) }
} | Format-Table -AutoSize
```

> [!TIP]
> If a chunk is `<= 400 MB` natively (e.g., `10 Ashlesha Part-1.mp4` at `255.5 MB`), skip splitting and upload the single file directly. If any split chunk exceeds `385 MB`, reduce `-t` to `00:25:00` or `00:30:00` for that segment before uploading.

---

### Step 2: Authenticate `gdrive` (If Needed) & Upload Chunks to Google Drive
Verify `gdrive` is logged into `maniyasagar20@gmail.com` (`20`), locate any companion book/class PDF already in Drive, create `<topic>_chunks_tmp`, and upload all chunks:

```powershell
# 1. Check auth (if not logged in, run `gdrive auth login` as background task & open printed OAuth URL)
gdrive auth status

# 2. Verify companion PDF already on Drive
gdrive readonly search --name-contains "Predict-Using-Nakshatra-Padas-Part-" --json

# 3. Create temp Drive folder (Note: `mutate mkdir` prints plain text, NOT JSON — query ID separately)
gdrive mutate mkdir "<topic>_chunks_tmp"
$folders = gdrive readonly search --name-exact "<topic>_chunks_tmp" --json | ConvertFrom-Json
$fid = $folders[0].id
if (-not $fid) { throw "Folder not found" }
Write-Host "Using Folder ID: $fid"

# 4. Upload all chunks into $fid
Get-ChildItem $outDir -Filter "*.mp4" | Sort-Object Name | ForEach-Object {
    Write-Host "Uploading $($_.Name) ..."
    gdrive mutate upload $_.FullName --parent $fid
}

# 5. Verify Drive listing
gdrive readonly ls $fid --json
```

---

### Step 3: Run Google AI Studio Extractions via `+ -> Drive` (Browser Subagent)
Invoke or reuse a `browser` subagent signed into **`maniyasagar20@gmail.com`** on `https://aistudio.google.com/prompts/new_chat`.
For **every** file (each MP4 chunk + any companion book/PPT PDF), open a **fresh `new_chat`** and set:
- **Model:** `Gemini 4 Neon` (strongest available Pro/Neon model)
- **Thinking Level:** `High`
- **Max Output Tokens:** `65536`
- **Attachment:** Click **`+ -> Drive`** and select the file from `<topic>_chunks_tmp` (or PDF by filename). Wait until video/PDF processing finishes and the Run button is active.

Run **Prompt 1 (Pass A)** and **Prompt 2 (Pass B)** in each MP4 chunk's chat, and **Prompt 3** in the companion PDF's chat (see **Section 3: Verbatim Prompt Library** below). Always extract complete DOM/copy text so nothing is collapsed or truncated.

---

### Step 4: Offset Timestamps & Verify On-Screen Charts via Local Swiss Ephemeris MCP
1. **Normalize Timestamps:** Add each chunk's base offset (`+00:00:00`, `+00:38:00`, `+01:16:00`, `+01:54:00`) to every `[MM:SS]` clip timestamp so all final cards cite exact full-lecture `[HH:MM:SS]` timestamps.
2. **Verify Charts via Local MCP (`AGENTS.md` Compliant):** For every example birth chart that includes birth date, time, and place on screen or in the book:
   - Probe through `startServer()` in `test/mcp-client.js` with **`MCP_SERVER_URL` unset** (hits local `index.js` directly).
   - Call `calculate_vedic_chart` (with `ayanamsa: "true_lahiri"`, `vargas: ["D1", "D9"]`, or `traditional_lahiri` if JHora chart matches traditional) and `nakshatra_house_map`.
   - Flag and fix any visual OCR misreads from AI Studio (180° South/North Indian chart flips, planet degrees, pada boundaries, or D-9 Lagna swaps) **before** writing the final cards.

---

### Step 5: Cross-Check Existing Knowledge & Write Zero-Noise Atomic Technique File
1. Compare extracted cards against existing repository files for that topic:
   - `Nakshtra course/<NN>_<Topic>_Rules.md` (and cross-topic files like `04_Nakshatra_Application_QA_Rules.md`, `11_Nakshatra_Timings_Rules.md`, `12_Pending_Karma_Rules.md`)
   - `youtube nakshtra/Nakshatra-extraction/` files covering the same Nakshatra
2. **Enforce Strict Source Authority:**
   `Course Video [Tier 1] > YouTube Deepanshu [Tier 1] > Books/PPT [Tier 1] > Magazine Contributors [Tier 2]`
3. Write `d:\SagarEpemeris\swiss-ephemeris-mcp-server\Nakshtra Knowledge Base\Nakshtra course\lecture techniques\<NN>_<Topic>_Techniques.md` using the **Standard Output File Template** (Section 4), keeping **zero storytelling, jokes, greetings, or prose fluff**.

---

### Step 6: Wire Into Execution Skill & Clean Up Temporary Artifacts
1. Ensure `.claude/skills/nakshatra-deep-analysis/SKILL.md` (Step 1) loads `Nakshtra Knowledge Base/Nakshtra course/lecture techniques/<NN>_<Topic>_Techniques.md` first whenever present and evaluates every card's `Trigger Condition` deterministically against the MCP output.
2. Clean up any temporary local chunks inside the repository working tree (e.g., if chunks were placed inside `.tmp_<topic>_chunks/`) and optionally ask/notify the user if the temporary Drive folder `<topic>_chunks_tmp` can be trashed.

---

## 3. Verbatim Prompt Library (Copy-Paste Ready)

### Prompt 1 — Video Pass A (Exhaustive Zero-Noise Technique Extraction)
*Replace `<TOPIC>`, `<PART_NUM>`, `<TOTAL_PARTS>`, `<OFFSET_HH_MM_SS>`, and `<PREFIX>` (e.g., `P1`, `P2`).*

```text
You are a forensic Vedic astrology knowledge engineer. Watch this ENTIRE video segment from start to finish (this is Part <PART_NUM> of <TOTAL_PARTS> for <TOPIC>; base offset is <OFFSET_HH_MM_SS> in the full lecture) and extract EVERY SINGLE predictive technique, rule, formula, exception, behavioral tell, Vastu indicator, age/dasha trigger, planetary/pada rule, mythological offset, and remedy taught here.

STRICT RULES:
- REMOVE ALL NOISE: no greetings, jokes, filler, marketing, story retelling fluff, or repetition.
- DO NOT SKIP ANYTHING: include every micro-technique mentioned in side comments, student Q&A, or while pointing at a slide/chart.
- Use exact Sanskrit/Hindi astrological terms (clarifying Hindi terms in English).
- Give `[MM:SS]` timestamp within this clip for EVERY technique.
- Format EVERY technique as a structured card:
  - `ID`: `<PREFIX>-01`, `<PREFIX>-02`, ...
  - `Category`: (`Pure Nakshatra / Offset` | `Rashi / Cusp / D1-D9 Pada` | `Planet / NL / Dispositor` | `Timing / Age / Dasha / Cycle` | `Vastu / Behavioral Tell / Remedy`)
  - `Trigger Condition`: exact chart condition
  - `Rule / Prediction`: crisp, actionable prediction
  - `Exceptions / Modifiers`: Dusthana reversal, aspects, orbs, etc. (or `None stated`)
  - `Timestamp`: `[MM:SS]`
- Confirm at the end that you covered up to the final minute of this clip without truncation.
```

---

### Prompt 2 — Video Pass B (Visual Slides, On-Screen JHora Charts & Missed Q&A Sweep)
*Run as a follow-up prompt in the **same** AI Studio chat immediately after Pass A completes.*

```text
Now do a second forensic pass over this ENTIRE clip specifically for anything visual or missed in Pass A:
1. Transcribe every bullet/diagram from every PPT slide or whiteboard shown on screen (with `[MM:SS]`).
2. List EVERY example birth chart shown on screen (JHora or whiteboard): exact birth date/time/place if visible, Lagna, D-1 planet placements, D-9 placements, active dashas, and the exact technique demonstrated on that chart (with `[MM:SS]`).
3. Scan the entire clip again (especially Q&A and the final 10 minutes) for ANY subtle 1-line technique, exception, age trigger, Vastu tell, or remedy not already in Pass A, and output them as additional `<PREFIX>-XX` cards.
```

---

### Prompt 3 — Companion Book / PDF Forensic Extraction
*Use in a fresh `new_chat` with `Predict-Using-Nakshatra-Padas-Part-1.pdf` (or `Part-2` / `Part-3` / Class PPT PDF) attached via `+ -> Drive`. Replace `<TOPIC>`, `<PDF_FILENAME>`, and `<PREFIX>` (e.g., `BK1`).*

```text
You are a forensic Vedic astrology knowledge engineer. Read this ENTIRE PDF (`<PDF_FILENAME>`) from first page to last page and extract:
1. EVERY general Nakshatra-Pada foundation rule relevant to applying this system (e.g., 12-Sign Keyword Backbone, Equal House 30-degree cusp method, Charana/backlog calculation, psychological vs. physical plane, etc.) with exact Page Numbers.
2. EVERY <TOPIC> Nakshatra technique, blank-chart cusp rule, Technique #1/#2/#3 rule, planet-in-<TOPIC> rule, Pada 1-4 Karma Vipaka Samhita story & remedy, exact age trigger, Vastu/behavioral tell, and exception/reversal rule with exact Page Numbers.
3. EVERY <TOPIC> or Nakshatra-Pada example birth chart in the PDF: exact name/label, birth date/time/place, Lagna & degree, D-1 planets/degrees, D-9 Lagna & planets, and exact technique demonstrated with Page Numbers.

STRICT RULES:
- REMOVE ALL NOISE: no motivational text, book promo, or storytelling fluff.
- DO NOT SKIP ANYTHING relevant to <TOPIC> or the core Nakshatra-Pada engine.
- Format every extracted rule as an atomic card (`<PREFIX>-01`, `<PREFIX>-02`, ...) with `Category`, `Trigger Condition`, `Rule / Prediction`, `Exceptions / Modifiers`, and `Page No.`.
```

---

### Prompt 4 — Browser Subagent Orchestration Template
*Use when delegating all AI Studio chats for a topic to a `browser` subagent.*

````text
All MP4 chunks for <TOPIC> are uploaded to your `maniyasagar20@gmail.com` Google Drive inside folder `<TOPIC_FOLDER_NAME>` (`<DRIVE_FOLDER_ID>`), and companion PDF `<PDF_FILENAME>` is also in Drive (`<PDF_DRIVE_ID>`).

Please run <N_CHATS> fresh chats in Google AI Studio (`https://aistudio.google.com/prompts/new_chat`, account `maniyasagar20@gmail.com`, model **`Gemini 4 Neon`**, Thinking Level **`High`**, Max Output Tokens **`65536`**):

1. Video Chunks (`<topic>_part1.mp4` .. `<topic>_partK.mp4` from `<TOPIC_FOLDER_NAME>`):
   - Open a fresh `new_chat` per chunk, click `+ -> Drive`, attach the chunk, wait for processing.
   - Run **Prompt 1 (Pass A)** with the exact Part number and base offset (`+00:00:00`, `+00:38:00`, ...).
   - Once complete, run **Prompt 2 (Pass B)** in the same chat.
   - Extract the COMPLETE verbatim text of both Pass A and Pass B via DOM/Copy (ensure nothing is collapsed or truncated).

2. Companion PDF (`<PDF_FILENAME>`):
   - Open a fresh `new_chat`, click `+ -> Drive`, attach `<PDF_FILENAME>`.
   - Run **Prompt 3** verbatim and extract the COMPLETE verbatim response via DOM/Copy.

If any attachment or generation hits a quota/size/timeout error, stop and return all completed verbatim chats + the exact error on the failing chat. Otherwise, return the COMPLETE verbatim text of all chats cleanly without summarizing or dropping any cards.
````

---

## 4. Standard Atomic Card Schema & Output File Template

Save every completed extraction at `Nakshtra course/lecture techniques/<NN>_<Topic>_Techniques.md` with these exact **7 sections**:

1. **Metadata Header:** Source MP4 + duration, chunk offsets, companion PDF(s), AI Studio model & settings, MCP verification status, total deduplicated card count.
2. **Section 1 — Pure Nakshatra, Core Mechanics & Blank-Chart Offsets**
3. **Section 2 — Rashi, Equal-House Cusp & `D-1 ↔ D-9` Pada Rules**
4. **Section 3 — Resident Planets, Empty Nakshatra, Nakshatra Lord & Dispositor Rules**
5. **Section 4 — Multi-Clock Timing, Ages, Cycles & Dasha Rules**
6. **Section 5 — Vastu, Remedies & Rapid-Fire Verification Tells**
7. **Section 6 — PPT Slide Extracts & MCP-Verified Example Charts**
8. **Section 7 — Delta Summary:** New techniques captured from video/PDF vs. existing `<NN>_<Topic>_Rules.md`

**Atomic Card Format:**
```markdown
### [<TAG>-001] <Short Descriptive Title>
- **Layer / Category:** Tier 1 (`<Category>`)
- **Trigger Condition:** `<Exact MCP-checkable chart condition>`
- **Rule / Prediction:** <Crisp, zero-noise executable statement>
- **Exceptions / Modifiers:** <Dusthana reversal / cusp boundary / orbs / `None stated`>
- **Sources:** `[Course Video @ HH:MM:SS]`, `[Book P1 p.XX]` | **Authority:** Tier 1 | **Status:** MCP-Verified / Unverified
```

---

## 5. Course Batch Reference (All 13 Local MP4s & Companion PDFs)

Sizes below come directly from `Course-content/Predictive Nakshtra Course English videos/`. Split rule: **target `<350 MB` per chunk** (`400 MB` hard cap in AI Studio).

| # | Local MP4 File | Size (MB) | Suggested AI Studio Split | Existing Rules File |
| :---: | :--- | :---: | :---: | :--- |
| 01 | `1 Ashiwini Nakshtra.mp4` | `1131.09` | **4 chunks** (`~38 min` each) | `01_Ashwini_Rules.md` |
| 02 | `2 Bharani- Star of Transformation.mp4` | `722.75` | **3 chunks** | `02_Bharani_Rules.md` |
| 03 | `3 Kritika Nakshatra.mp4` | `757.80` | **3 chunks** | `03_Krittika_Rules.md` |
| 04 | `4 Nakshatra Application- QA.mp4` | `810.62` | **3 chunks** | `04_Nakshatra_Application_QA_Rules.md` |
| 05 | `5 Rohini & Brahma.mp4` | `631.94` | **2 chunks** | `05_Rohini_Rules.md` |
| 06 | `6 Mrighshira.mp4` | `510.41` | **2 chunks** | `06_Mrigashira_Rules.md` |
| 07 | `7 Ardra- The Storm.mp4` | `1068.24` | **4 chunks** | `07_Ardra_Rules.md` |
| 08 | `8 Punar-Vasu.mp4` | `551.79` | **2 chunks** | `08_Punarvasu_Rules.md` |
| 09 | `9 Pushya.mp4` | `1257.01` | **4 chunks** | `09_Pushya_Rules.md` |
| 10a | `10 Ashlesha Part-1.mp4` | `255.50` | **1 chunk (no split)** | `10_Ashlesha_Rules.md` |
| 10b | `10 Ashlesha Part-2.mp4` | `544.29` | **2 chunks** | `10_Ashlesha_Rules.md` |
| 11 | `11 Nakshatra Timings.mp4` | `666.49` | **3 chunks** | `11_Nakshatra_Timings_Rules.md` |
| 12 | `12 Pending Karma- Live Charts.mp4` | `909.66` | **3 chunks** | `12_Pending_Karma_Rules.md` |

**Companion Book & Class PDFs in `Course-content/`:**
- `1 Ashiwni Nakshtra pdf (1).pdf` (`0.59 MB`)
- `Predict-Using-Nakshatra-Padas-Part-1.pdf` (`5.36 MB`)
- `Predict-Using-Nakshatra-Padas-Part-2.pdf` (`2.53 MB`)
- `Predict-Using-Nakshatra-Padas-Part-3.pdf` (`18.90 MB`)

---

## 6. Known Pitfalls & Exact Fixes

| Symptom / Error | Root Cause | Exact Fix |
| :--- | :--- | :--- |
| `Video file size cannot exceed 400MB.` in AI Studio | Full course MP4 > 400 MB attached from Drive | Split locally with `ffmpeg -c copy` into `<385 MB` parts before uploading to `<topic>_chunks_tmp`. |
| `Error: Access denied: path ... is not within any of the configured workspace roots` | `mcp_chrome_devtools_upload_file` sandbox check rejects Windows disk paths | Never upload local files through Chrome DevTools; upload via `gdrive mutate upload` and attach via AI Studio `+ -> Drive`. |
| `ConvertFrom-Json : Invalid JSON primitive: Created.` after `gdrive mutate mkdir` | `gdrive mutate mkdir` outputs human text (`Created ...`), not JSON | Run `gdrive mutate mkdir "<name>"` without JSON parsing, then fetch the folder ID with `gdrive readonly search --name-exact "<name>" --json`. |
| `[aac @ ...] channel element X is not allocated` during `ffmpeg -c copy` | Benign AAC container warnings on recorded Zoom/stream audio | Safe to ignore if command exits with code `0` and `ffprobe` confirms expected duration and size. |
| Example chart check hits wrong server / remote state | `MCP_SERVER_URL` set in shell env | Unset `MCP_SERVER_URL` and probe through `startServer()` in `test/mcp-client.js` so checks run against local `index.js` + `swetest`. |
