"""Configuration for the YouTube AI News Summarizer."""

import os
from pathlib import Path

# Directory paths
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
DASHBOARD_PATH = BASE_DIR.parent / "ai_news_dashboard.html"

# YouTube search settings
SEARCH_QUERIES = [
    "AI news today",
    "artificial intelligence news",
    "AI breakthroughs",
    "machine learning news today",
]
MAX_VIDEOS_PER_QUERY = 5
MAX_TOTAL_VIDEOS = 15
# Only include videos shorter than this (seconds) — filters out multi-hour livestreams
MAX_VIDEO_LENGTH_SECONDS = 45 * 60  # 45 minutes
# Only include videos published within the last N days
MAX_AGE_DAYS = 1

# Transcript settings
MAX_TRANSCRIPT_CHARS = 15000  # Truncate very long transcripts

# Claude API settings
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_SUMMARY_TOKENS = 1024

# Dashboard settings
MAX_DAYS_IN_DASHBOARD = 14  # Keep 2 weeks of summaries
