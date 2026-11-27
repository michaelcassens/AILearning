# Holiday Helpers Gift Drive

Shared, live checklist for three wish lists (YWCA, Student 2603, Veteran 2606). No logins; claiming is anonymous
(name optional). Everyone sees claims instantly (Server-Sent Events). Claims are saved to disk permanently.

    cd holiday-helpers && npm start        # http://localhost:3000

| Env var | Purpose |
|---|---|
| `PORT` | listen port (default 3000) |
| `DATA_DIR` | where `claims.json` + `history.jsonl` (audit log) live — **must be a persistent disk** in production |
| `ADMIN_PIN` | optional; "Organizer sign-in" in the footer lets you remove any claim |
| `TRUST_PROXY=1` | set behind a reverse proxy (Render/Fly/nginx) |

Edit `lists.json` to change items (keep each `id` unique; changing an id orphans its existing claims).
YWCA items allow many donors ("I'll bring one"); student/veteran items are one-claim-only.
Each device gets a secret token per claim so only the claimer can Undo from that device.

## Hosting
Needs a Node host with a persistent volume (GitHub Pages can't run it). Examples: Render web service + 1 GB disk mounted at
`/data`, or Fly.io volume, or `docker build -t hh . && docker run -p 3000:3000 -v hh-data:/data -e ADMIN_PIN=... hh`.
Back up by copying `DATA_DIR`.
