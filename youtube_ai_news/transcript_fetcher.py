"""Fetch transcripts from YouTube videos."""

import logging

from youtube_transcript_api import YouTubeTranscriptApi

from config import MAX_TRANSCRIPT_CHARS

logger = logging.getLogger(__name__)


def fetch_transcript(video_id: str) -> str | None:
    """Fetch and concatenate the transcript for a YouTube video.

    Returns the transcript text (truncated to MAX_TRANSCRIPT_CHARS),
    or None if no transcript is available.
    """
    try:
        fetched = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        text = " ".join(segment["text"] for segment in fetched)
        if len(text) > MAX_TRANSCRIPT_CHARS:
            text = text[:MAX_TRANSCRIPT_CHARS] + "..."
        return text
    except Exception:
        logger.warning("Could not fetch transcript for video %s", video_id)
        return None


def fetch_transcripts(videos: list[dict]) -> list[dict]:
    """Add transcript text to each video dict.

    Videos without transcripts are removed from the list.
    """
    results = []
    for video in videos:
        transcript = fetch_transcript(video["id"])
        if transcript:
            video["transcript"] = transcript
            results.append(video)
            logger.info("Got transcript for: %s", video["title"])
        else:
            logger.info("No transcript for: %s", video["title"])
    logger.info("Got transcripts for %d / %d videos", len(results), len(videos))
    return results
