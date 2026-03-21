"""Summarize video transcripts using the Claude API."""

import logging

import anthropic

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, MAX_SUMMARY_TOKENS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI news analyst. You will receive a transcript from a YouTube video about AI/ML news.
Your job is to produce a concise, informative summary covering:
- Key announcements, product launches, or research breakthroughs mentioned
- Important companies, models, or technologies discussed
- Any notable opinions or predictions from the presenter

Format the summary as 3-6 bullet points. Each bullet should be one clear, complete sentence.
If the transcript seems unrelated to AI news, say so briefly."""

DAILY_DIGEST_PROMPT = """You are an AI news curator. Below are summaries from multiple YouTube videos about AI news from today.
Create a unified daily digest that:
1. Groups related news items together
2. Removes duplicate information across videos
3. Highlights the most important developments first
4. Notes if multiple sources covered the same story (indicates importance)

Format as a clean digest with section headers and bullet points.
Keep it concise but comprehensive — this should be a quick read that covers all the day's AI news."""


def summarize_transcript(video: dict) -> str | None:
    """Generate a bullet-point summary of a single video transcript."""
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY not set")
        return None

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_SUMMARY_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Video: {video['title']} by {video['channel']}\n\n"
                        f"Transcript:\n{video['transcript']}"
                    ),
                }
            ],
        )
        return message.content[0].text
    except Exception:
        logger.exception("Error summarizing video: %s", video["title"])
        return None


def create_daily_digest(video_summaries: list[dict]) -> str | None:
    """Combine individual video summaries into one daily digest."""
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY not set")
        return None

    if not video_summaries:
        return "No AI news videos found today."

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    combined = "\n\n---\n\n".join(
        f"**{v['title']}** (by {v['channel']})\n{v['summary']}"
        for v in video_summaries
    )

    try:
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2048,
            system=DAILY_DIGEST_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Here are today's AI news video summaries:\n\n{combined}",
                }
            ],
        )
        return message.content[0].text
    except Exception:
        logger.exception("Error creating daily digest")
        return None
