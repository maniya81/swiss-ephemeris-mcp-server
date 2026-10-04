# Host on Google Cloud and Connect to Claude

This guide deploys the server to **Google Cloud Run** as a public HTTPS endpoint, then adds it to Claude as a custom connector. The setup is tuned to stay inside Google Cloud's free tier, so for personal use it should cost nothing.

It also covers running the server locally for **Claude Desktop** and **VS Code (GitHub Copilot)** without any hosting.

- [How it fits together](#how-it-fits-together)
- [Cost](#cost)
- [Part 1: Deploy to Cloud Run](#part-1-deploy-to-cloud-run)
- [Part 2: Connect to Claude](#part-2-connect-to-claude)
- [Part 3: Local use without hosting](#part-3-local-use-without-hosting)
- [Updating, logs and removal](#updating-logs-and-removal)
- [Troubleshooting](#troubleshooting)

## How it fits together

```
Claude (web, desktop, mobile)
        │  HTTPS, MCP Streamable HTTP
        ▼
Cloud Run service  ──►  https://<service>.run.app/mcp
        │
        ▼
Docker container: node index.js (MCP_HTTP_MODE=true)  ──►  swetest + vendor/swisseph data
```

Claude's servers call your Cloud Run URL. Your own computer is not involved after deployment, so the region you pick doesn't affect the speed you see.

## Cost

| Service | What it's used for | Free tier (per month)* | Expected use |
|---|---|---|---|
| Cloud Run | Runs the container | 2M requests, 180,000 vCPU-seconds, 360,000 GiB-seconds | A chart takes under a second |
| Cloud Build | Builds the Docker image on deploy | 2,500 build-minutes | A few minutes per deploy |
| Artifact Registry | Stores the image | 0.5 GB | About 300 MB with a cleanup policy |
| Cloud Storage | Holds the uploaded source during deploy | 5 GB in US regions only | A few MB |

\* Free tier limits can change. Check the [Google Cloud pricing pages](https://cloud.google.com/free/docs/free-cloud-features) for the current numbers.

These choices keep it free:

- **`--min-instances 0`** scales to zero when idle, so you only pay while a request is running.
- **`us-central1`** is used because Cloud Storage's free tier only applies in US regions.
- **`--memory 256Mi`** is enough for this server and uses the free allowance slowly.
- **`--max-instances 1`** caps the cost if someone abuses the public URL.
- **A cleanup policy** keeps only the newest images, so redeploys stay under 0.5 GB.
- **A budget alert** emails you before any real charge.

The server is also built for this: it refuses the optional long-lived `GET /mcp` stream (405), because an open stream would count as a busy instance the whole time.

A Compute Engine `e2-micro` VM looks free but costs more in practice. It needs its own HTTPS certificate, and Google charges for its public IPv4 address.

## Part 1: Deploy to Cloud Run

### Prerequisites

1. A Google Cloud project with a **billing account linked**. Google requires one even when you stay inside the free tier.
2. The [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`).
3. A local clone of this repository on `main`.

You don't need Docker locally. Cloud Build builds the image in the cloud.

### Step 1: One-time setup

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### Step 2: Deploy

Run this from the repository root.

**Windows PowerShell** (a backtick `` ` `` continues the line):

```powershell
gcloud run deploy swiss-ephemeris-mcp `
  --source . `
  --region us-central1 `
  --memory 256Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 1 `
  --set-env-vars MCP_HTTP_MODE=true `
  --allow-unauthenticated
```

**macOS / Linux** (a backslash `\` continues the line):

```bash
gcloud run deploy swiss-ephemeris-mcp \
  --source . \
  --region us-central1 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars MCP_HTTP_MODE=true \
  --allow-unauthenticated
```

If it asks to create an Artifact Registry repository named `cloud-run-source-deploy`, answer **Y**.

What the flags do:

| Flag | Why |
|---|---|
| `--source .` | Uploads the code and builds the `Dockerfile` with Cloud Build. |
| `--set-env-vars MCP_HTTP_MODE=true` | Required. Without it the container starts in stdio mode, never listens on a port, and the deploy fails. |
| `--allow-unauthenticated` | Required. Claude's servers must be able to reach the URL. |
| `--min-instances 0` | Scales to zero when idle. The first request after a quiet spell takes 1–3 seconds. |
| `--max-instances 1` | Caps cost. One instance is plenty for personal use. |
| `--memory 256Mi --cpu 1` | The smallest size that runs this server comfortably. |

You don't need to set `PORT`. Cloud Run sets it and the server reads it.

### Step 3: Get the URL and check it

```powershell
gcloud run services describe swiss-ephemeris-mcp --region us-central1 --format "value(status.url)"
```

Open `<URL>/health` in a browser. You should see:

```json
{ "status": "ok", "server": "swiss-ephemeris-mcp-server", ... }
```

Your MCP endpoint is **`<URL>/mcp`**. You'll need it in Part 2.

### Step 4: Add an image cleanup policy

Every deploy stores a new image. This policy keeps only the 2 newest images.

**Windows PowerShell:**

```powershell
@'
[
  {"name": "keep-latest", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 2}},
  {"name": "delete-rest", "action": {"type": "Delete"}, "condition": {"tagState": "any"}}
]
'@ | Out-File -Encoding ascii cleanup.json

gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy `
  --location us-central1 --policy cleanup.json --no-dry-run
Remove-Item cleanup.json
```

**macOS / Linux:**

```bash
cat > cleanup.json <<'EOF'
[
  {"name": "keep-latest", "action": {"type": "Keep"}, "mostRecentVersions": {"keepCount": 2}},
  {"name": "delete-rest", "action": {"type": "Delete"}, "condition": {"tagState": "any"}}
]
EOF
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy \
  --location us-central1 --policy cleanup.json --no-dry-run
rm cleanup.json
```

### Step 5: Set a budget alert

1. In the Google Cloud console, go to **Billing → Budgets & alerts → Create budget**.
2. Set the amount to something small, such as **$1** (or ₹100).
3. Keep email alerts at **50%, 90% and 100%**.

A budget alert only notifies you; it doesn't stop the service. `--max-instances 1` is what caps the spend.

## Part 2: Connect to Claude

### Claude web, desktop and mobile apps

1. Go to [claude.ai](https://claude.ai), then **Settings → Connectors → Add custom connector**.
2. Fill in the form:
   - **Name:** `Swiss Ephemeris`
   - **URL:** `https://<your-service>.run.app/mcp` (don't forget `/mcp`)
3. Leave the OAuth fields empty. The server has no login.
4. Click **Add**.

A connector added on claude.ai is also available in the Claude desktop and mobile apps on the same account. Whether you can add custom connectors, and how many, depends on your plan. On Team and Enterprise plans an owner may need to add or allow it.

### Use it in a chat

1. Start a new chat.
2. Open the tools menu (the **+** or sliders icon) and make sure **Swiss Ephemeris** is turned on.
3. Ask, for example:

   > Use calculate_vedic_chart with the Lahiri ayanamsa for 1999-06-06T15:30:03+05:30, latitude 22.1667, longitude 71.6667. Show the Lagna, each planet's nakshatra and sub lord, and the current dasha chain.

4. Approve the tool call when Claude asks.

Tips for good results:

- **Always give the birth time with its timezone**, such as `+05:30` for IST, or convert it to UTC with `Z`. A time without a timezone may be read as UTC.
- Longitude is **positive east**. India is about +68 to +97.
- For KP work, ask for `ayanamsa: kp_new` (Krishnamurti-Senthilathiban) or `kp_old` (original Krishnamurti).

### Available tools

| Tool | Use it for |
|---|---|
| `calculate_vedic_chart` | Sidereal Vedic/KP chart: nakshatra, pada, star/sub/sub-sub lords, KP cusps, Vimshottari dasha |
| `calculate_planetary_positions` | Tropical (Western) chart |
| `calculate_transits` | Tropical natal chart plus the current sky |
| `calculate_solar_revolution` | Tropical solar return |
| `calculate_synastry` | Tropical chart comparison with aspects |

See the [README](../README.md#usage) for each tool's parameters.

## Part 3: Local use without hosting

Both options run the server in Docker on your own computer, over stdio. Docker avoids building `swetest` yourself. It is also the only way to run the server on Windows: the server starts `swetest` with Unix shell syntax, which fails in a native Windows install.

First, install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and build the image from the repository root:

```powershell
docker build -t swiss-ephemeris-mcp .
```

Rebuild it whenever you pull new code.

### VS Code (GitHub Copilot Chat)

The repository already includes `.vscode/mcp.json`:

```json
{
  "servers": {
    "swissEphemeris": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "swiss-ephemeris-mcp"]
    }
  }
}
```

1. Open the repository folder in VS Code and open `.vscode/mcp.json`.
2. Click **Start** above `"swissEphemeris"`. It should change to **Running** with 5 tools.
3. In Copilot Chat, switch to **Agent** mode, click the tools icon, and tick the `swissEphemeris` tools.
4. Ask for a chart as in the example above.

The `-i` flag is required, because the server talks over stdin/stdout.

To use the hosted server instead of Docker, replace the entry with:

```json
{
  "servers": {
    "swissEphemeris": {
      "type": "http",
      "url": "https://<your-service>.run.app/mcp"
    }
  }
}
```

### Claude Desktop (local only)

You only need this if you don't want to host the server. A hosted connector from Part 2 already works in Claude Desktop.

1. Open the config file:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add the server:

   ```json
   {
     "mcpServers": {
       "swissEphemeris": {
         "command": "docker",
         "args": ["run", "-i", "--rm", "swiss-ephemeris-mcp"]
       }
     }
   }
   ```

3. Fully quit Claude Desktop (from the system tray or menu bar) and reopen it.

This only works while Docker Desktop is running.

## Updating, logs and removal

**Redeploy after code changes.** Pull `main` and run the Step 2 command again. The URL stays the same, so the Claude connector keeps working.

```powershell
git checkout main
git pull
# then the gcloud run deploy command from Step 2
```

**Read the logs:**

```powershell
gcloud run services logs read swiss-ephemeris-mcp --region us-central1 --limit 50
```

**Remove everything:**

```powershell
gcloud run services delete swiss-ephemeris-mcp --region us-central1
gcloud artifacts repositories delete cloud-run-source-deploy --location us-central1
```

After that, also remove the connector in Claude: **Settings → Connectors**.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Deploy fails with "container failed to start and listen on the port" | `MCP_HTTP_MODE=true` is missing. Add `--set-env-vars MCP_HTTP_MODE=true`. |
| Claude says it can't connect | Check that the URL ends in `/mcp`, that `<URL>/health` works, and that you deployed with `--allow-unauthenticated`. |
| `403 Forbidden` from the URL | The service requires authentication. Run `gcloud run services add-iam-policy-binding swiss-ephemeris-mcp --region us-central1 --member allUsers --role roles/run.invoker`. If your organization blocks public services, use a project outside that organization. |
| First call after a while is slow | That's a cold start (1–3 s) from scaling to zero. Use `--min-instances 1` to keep it warm, but that is no longer free. |
| `405` on `GET /mcp` in the logs | This is expected. The server doesn't offer the optional SSE stream, and clients fall back to plain POST. |
| `404 Session not found` in the logs | This is expected after a cold start. Claude starts a new session automatically. |
| `Failed to execute swetest` | The image wasn't built from this repository's `Dockerfile`. Redeploy with `--source .`. |
| Dasha dates differ by a few days from other software | Ayanamsa values and Moon positions differ slightly between programs. Check that you used the same ayanamsa (`lahiri`, `kp_new`, `kp_old`), and set `dasha_year_days` to match the other software. |
| Unexpected charges | Check **Billing → Reports**. Make sure `--min-instances` is `0` and the cleanup policy is in place. |

## Security notes

- The endpoint is **public and has no login**. Anyone who finds the URL can run chart calculations. The server stores no data and has no secrets, so the main risk is someone using your free allowance; `--max-instances 1` limits that.
- Birth details you send are processed in memory and not stored. The server doesn't log request bodies; it only logs the request method and new session IDs.
- To take the server offline, delete the service (see above) or redeploy without `--allow-unauthenticated`. The second option also disconnects Claude.
