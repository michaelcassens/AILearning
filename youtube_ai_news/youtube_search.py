"""Search YouTube for recent AI news videos."""

import datetime
import logging
from typing import Optional

import scrapetube

from config import (
    MAX_AGE_DAYS,
    MAX_TOTAL_VIDEOS,
    MAX_VIDEO_LENGTH_SECONDS,
    MAX_VIDEOS_PER_QUERY,
    SEARCH_QUERIES,
)

logger = logging.getLogger(__name__)


def _parse_duration(duration_text: Optional[str]) -> int:
    """Parse duration like '12:34' or '1:02:34' into seconds."""
    if not duration_text:
        return 0
    parts = duration_text.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return int(parts[0])
    except (ValueError, IndexError):
        return 0


def _published_recently(text: Optional[str], max_days: int) -> bool:
    """Check if the 'published time' text indicates a recent upload.

    YouTube returns strings like '1 hour ago', '2 days ago', etc.
    """
    if not text:
        return False
    text = text.lower()
    if any(w in text for w in ["just now", "second", "minute", "hour"]):
        return True
    if "day" in text:
        try:
            num = int("".join(c for c in text if c.isdigit()) or "0")
            return num <= max_days
        except ValueError:
            return False
    return False


def search_videos() -> list[dict]:
    """Search YouTube for recent AI news videos.

    Returns a deduplicated list of video metadata dicts:
        {id, title, channel, duration_seconds, url, published_text}
    """
    seen_ids: set[str] = set()
    results: list[dict] = []

    for query in SEARCH_QUERIES:
        logger.info("Searching YouTube for: %s", query)
        try:
            videos = scrapetube.get_search(
                query, limit=MAX_VIDEOS_PER_QUERY, sort_by="upload_date"
            )
            for v in videos:
                vid_id = v.get("videoId", "")
                if not vid_id or vid_id in seen_ids:
                    continue

                # Extract metadata
                title = (
                    v.get("title", {}).get("runs", [{}])[0].get("text", "Unknown")
                )
                channel = (
                    v.get("ownerText", {}).get("runs", [{}])[0].get("text", "Unknown")
                )
                duration_text = v.get("lengthText", {}).get(
                    "simpleText", ""
                )
                published_text = v.get("publishedTimeText", {}).get(
                    "simpleText", ""
                )

                duration_sec = _parse_duration(duration_text)

                # Filter: must be recent
                if not _published_recently(published_text, MAX_AGE_DAYS):
                    continue

                # Filter: skip very long videos (livestreams, podcasts)
                if duration_sec > MAX_VIDEO_LENGTH_SECONDS:
                    logger.debug("Skipping long video (%ds): %s", duration_sec, title)
                    continue

                # Filter: skip very short videos (< 1 min likely not news)
                if duration_sec < 60:
                    continue

                seen_ids.add(vid_id)
                results.append(
                    {
                        "id": vid_id,
                        "title": title,
                        "channel": channel,
                        "duration_seconds": duration_sec,
                        "url": f"https://www.youtube.com/watch?v={vid_id}",
                        "published_text": published_text,
                    }
                )

                if len(results) >= MAX_TOTAL_VIDEOS:
                    break

        except Exception:
            logger.exception("Error searching for query: %s", query)

        if len(results) >= MAX_TOTAL_VIDEOS:
            break

    logger.info("Found %d candidate videos", len(results))
    return results
