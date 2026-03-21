#!/usr/bin/env python3
"""YouTube AI News Summarizer — Daily agent.

Usage:
    python main.py              # Run today's summary
    python main.py --days 3     # Also look back 3 days for videos
    python main.py --rebuild    # Rebuild the HTML dashboard from saved JSON
"""

import argparse
import datetime
import json
import logging
import sys
from pathlib import Path

from config import MAX_AGE_DAYS, MAX_DAYS_IN_DASHBOARD, OUTPUT_DIR, DASHBOARD_PATH
from youtube_search import search_videos
from transcript_fetcher import fetch_transcripts
from summarizer import summarize_transcript, create_daily_digest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def run_daily_summary(max_age_days: int = MAX_AGE_DAYS) -> dict:
    """Run the full pipeline: search → transcripts → summarize → digest."""
    today = datetime.date.today().isoformat()
    logger.info("=== AI News Summary for %s ===", today)

    # 1. Search for videos
    import config
    original = config.MAX_AGE_DAYS
    config.MAX_AGE_DAYS = max_age_days
    videos = search_videos()
    config.MAX_AGE_DAYS = original

    if not videos:
        logger.warning("No recent AI news videos found.")
        return {"date": today, "videos": [], "digest": "No AI news videos found today."}

    # 2. Fetch transcripts
    videos_with_transcripts = fetch_transcripts(videos)

    if not videos_with_transcripts:
        logger.warning("Could not get transcripts for any videos.")
        return {"date": today, "videos": [], "digest": "Found videos but could not retrieve any transcripts."}

    # 3. Summarize each video
    video_summaries = []
    for video in videos_with_transcripts:
        logger.info("Summarizing: %s", video["title"])
        summary = summarize_transcript(video)
        if summary:
            video_summaries.append(
                {
                    "id": video["id"],
                    "title": video["title"],
                    "channel": video["channel"],
                    "url": video["url"],
                    "duration_seconds": video["duration_seconds"],
                    "published_text": video["published_text"],
                    "summary": summary,
                }
            )

    # 4. Create daily digest
    digest = create_daily_digest(video_summaries) if video_summaries else "No summaries available."

    result = {
        "date": today,
        "generated_at": datetime.datetime.now().isoformat(),
        "video_count": len(video_summaries),
        "videos": video_summaries,
        "digest": digest,
    }

    # 5. Save to JSON
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / f"{today}.json"
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)
    logger.info("Saved results to %s", output_file)

    return result


def build_dashboard():
    """Build the HTML dashboard from all saved JSON files."""
    json_files = sorted(OUTPUT_DIR.glob("*.json"), reverse=True)[:MAX_DAYS_IN_DASHBOARD]

    all_days = []
    for jf in json_files:
        with open(jf) as f:
            all_days.append(json.load(f))

    dashboard_data = json.dumps(all_days, indent=2)

    html = _generate_dashboard_html(dashboard_data)
    with open(DASHBOARD_PATH, "w") as f:
        f.write(html)
    logger.info("Dashboard written to %s", DASHBOARD_PATH)


def _generate_dashboard_html(data_json: str) -> str:
    """Generate the self-contained HTML dashboard."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI News Daily Digest</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f1a;
            color: #e0e0e0;
            min-height: 100vh;
        }}
        .header {{
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            padding: 2rem;
            text-align: center;
            border-bottom: 2px solid #e94560;
        }}
        .header h1 {{
            font-size: 2rem;
            color: #fff;
            margin-bottom: 0.5rem;
        }}
        .header .subtitle {{
            color: #a0a0b0;
            font-size: 1rem;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }}
        .day-section {{
            margin-bottom: 3rem;
        }}
        .day-header {{
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #2a2a4a;
        }}
        .day-date {{
            font-size: 1.4rem;
            font-weight: 700;
            color: #e94560;
        }}
        .video-count {{
            background: #e94560;
            color: #fff;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }}
        .digest {{
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            line-height: 1.7;
        }}
        .digest h3 {{
            color: #e94560;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }}
        .digest-content h2, .digest-content h3, .digest-content h4 {{
            color: #7ec8e3;
            margin: 1rem 0 0.5rem;
            font-size: 1rem;
        }}
        .digest-content ul {{
            padding-left: 1.5rem;
            margin: 0.5rem 0;
        }}
        .digest-content li {{
            margin-bottom: 0.4rem;
        }}
        .digest-content strong {{
            color: #f0f0f0;
        }}
        .videos-grid {{
            display: grid;
            gap: 1rem;
        }}
        .video-card {{
            background: #1a1a2e;
            border: 1px solid #2a2a4a;
            border-radius: 10px;
            padding: 1.2rem;
            transition: border-color 0.2s;
        }}
        .video-card:hover {{
            border-color: #e94560;
        }}
        .video-card .video-title {{
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.3rem;
        }}
        .video-card .video-title a {{
            color: #7ec8e3;
            text-decoration: none;
        }}
        .video-card .video-title a:hover {{
            text-decoration: underline;
        }}
        .video-card .video-meta {{
            color: #888;
            font-size: 0.85rem;
            margin-bottom: 0.8rem;
        }}
        .video-card .video-summary {{
            font-size: 0.92rem;
            line-height: 1.6;
        }}
        .video-card .video-summary ul {{
            padding-left: 1.2rem;
        }}
        .video-card .video-summary li {{
            margin-bottom: 0.3rem;
        }}
        .toggle-btn {{
            background: #2a2a4a;
            border: 1px solid #3a3a5a;
            color: #ccc;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-bottom: 1rem;
            display: inline-block;
        }}
        .toggle-btn:hover {{
            background: #3a3a5a;
        }}
        .empty-state {{
            text-align: center;
            padding: 4rem 2rem;
            color: #666;
        }}
        .empty-state h2 {{
            margin-bottom: 1rem;
            color: #888;
        }}
        .back-link {{
            display: inline-block;
            margin-top: 1rem;
            color: #7ec8e3;
            text-decoration: none;
        }}
        .back-link:hover {{
            text-decoration: underline;
        }}
        code {{
            background: #2a2a4a;
            padding: 0.1rem 0.4rem;
            border-radius: 3px;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AI News Daily Digest</h1>
        <p class="subtitle">Auto-generated summaries from YouTube AI news channels</p>
    </div>
    <div class="container" id="app"></div>

    <script>
    const DATA = {data_json};

    function formatDuration(seconds) {{
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + String(s).padStart(2, '0');
    }}

    function simpleMarkdown(text) {{
        if (!text) return '';
        return text
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>')
            .replace(/(<\\/ul>\\s*<ul>)/g, '')
            .replace(/\\n/g, '<br>');
    }}

    function render() {{
        const app = document.getElementById('app');

        if (!DATA || DATA.length === 0) {{
            app.innerHTML = `
                <div class="empty-state">
                    <h2>No summaries yet</h2>
                    <p>Run the agent to generate your first daily digest:</p>
                    <p><code>cd youtube_ai_news && python main.py</code></p>
                    <a href="index.html" class="back-link">&larr; Back to main site</a>
                </div>`;
            return;
        }}

        let html = '<a href="index.html" class="back-link">&larr; Back to main site</a>';

        DATA.forEach((day, dayIdx) => {{
            html += `<div class="day-section">`;
            html += `<div class="day-header">
                <span class="day-date">${{day.date}}</span>
                <span class="video-count">${{day.video_count || day.videos.length}} videos</span>
            </div>`;

            // Digest
            html += `<div class="digest">
                <h3>Daily Digest</h3>
                <div class="digest-content">${{simpleMarkdown(day.digest)}}</div>
            </div>`;

            // Individual videos toggle
            if (day.videos && day.videos.length > 0) {{
                html += `<button class="toggle-btn" onclick="
                    var el = document.getElementById('videos-${{dayIdx}}');
                    el.style.display = el.style.display === 'none' ? 'grid' : 'none';
                    this.textContent = el.style.display === 'none' ? 'Show individual videos' : 'Hide individual videos';
                ">Show individual videos</button>`;

                html += `<div class="videos-grid" id="videos-${{dayIdx}}" style="display:none">`;
                day.videos.forEach(v => {{
                    html += `<div class="video-card">
                        <div class="video-title"><a href="${{v.url}}" target="_blank">${{v.title}}</a></div>
                        <div class="video-meta">${{v.channel}} &middot; ${{formatDuration(v.duration_seconds)}} &middot; ${{v.published_text}}</div>
                        <div class="video-summary">${{simpleMarkdown(v.summary)}}</div>
                    </div>`;
                }});
                html += `</div>`;
            }}

            html += `</div>`;
        }});

        app.innerHTML = html;
    }}

    render();
    </script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="YouTube AI News Summarizer")
    parser.add_argument("--days", type=int, default=MAX_AGE_DAYS, help="Look back N days for videos")
    parser.add_argument("--rebuild", action="store_true", help="Only rebuild the HTML dashboard from saved JSON")
    args = parser.parse_args()

    if args.rebuild:
        build_dashboard()
        return

    result = run_daily_summary(max_age_days=args.days)
    build_dashboard()

    # Print summary to terminal
    print(f"\\n{'='*60}")
    print(f"  AI News Digest — {{result['date']}}")
    print(f"  Videos summarized: {{result['video_count']}}")
    print(f"{'='*60}\\n")
    print(result["digest"])
    print()


if __name__ == "__main__":
    main()
