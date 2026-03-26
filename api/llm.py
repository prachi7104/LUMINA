"""
LLM wrapper for all agent calls with automatic retry and fallback logic.
"""

import logging
import time

from openai import APIStatusError, OpenAI, RateLimitError

from api.config import settings

logger = logging.getLogger(__name__)


def call_llm(
    model: str,
    system: str,
    user: str,
    max_tokens: int = 1500,
    json_mode: bool = False
) -> str:
    """
    Call LLM with automatic retry and fallback logic.

    Args:
        model: Model identifier (e.g., "llama-3.1-70b-versatile", "llama-3.1-8b-instant")
        system: System prompt
        user: User prompt
        max_tokens: Maximum tokens in response (default: 1500)
        json_mode: Enable JSON response format (default: False)

    Returns:
        String response from the LLM

    Raises:
        RuntimeError: If both Groq and Google fallback fail

    Logic:
        - Selects Groq API key based on model size (70b -> HEAVY, 8b -> LIGHT)
        - Retries Groq up to 3 times with exponential backoff (1s, 2s, 4s)
        - Falls back to Google AI Studio (gemini-2.5-flash) if Groq fails
        - Logs all retries and fallbacks at INFO level
    """
    # Determine which Groq API key to use
    if "70b" in model:
        groq_api_key = settings.GROQ_API_KEY_HEAVY
    elif "8b" in model:
        groq_api_key = settings.GROQ_API_KEY_LIGHT
    else:
        groq_api_key = settings.GROQ_API_KEY_LIGHT  # Default to light

    # Prepare request parameters
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user}
    ]

    request_params = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }

    if json_mode:
        request_params["response_format"] = {"type": "json_object"}

    # Try Groq with exponential backoff
    groq_client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )

    backoff_delays = [1, 2, 4]
    for attempt, delay in enumerate(backoff_delays, start=1):
        try:
            logger.info(f"Groq attempt {attempt}/3 for model {model}")
            response = groq_client.chat.completions.create(**request_params)
            content = response.choices[0].message.content
            if content is None:
                logger.warning(
                    "LLM returned None content for model=%s on attempt %s. Returning empty string.",
                    model,
                    attempt,
                )
                return ""
            return content

        except (RateLimitError, APIStatusError) as e:
            if isinstance(e, APIStatusError) and e.status_code != 429:
                raise  # Re-raise non-429 status errors

            logger.info(
                f"Groq rate limit hit on attempt {attempt}/3 for {model}. "
                f"Retrying in {delay}s..."
            )
            if attempt < 3:
                time.sleep(delay)
            else:
                logger.info(
                    f"All 3 Groq attempts failed for {model}. "
                    "Falling back to Google AI Studio..."
                )

    # Fallback to Google AI Studio
    google_client = OpenAI(
        api_key=settings.GOOGLE_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )

    fallback_params = {
        "model": "gemini-2.5-flash",
        "messages": messages,
        "max_tokens": max_tokens,
    }

    if json_mode:
        fallback_params["response_format"] = {"type": "json_object"}

    try:
        logger.info("Calling Google AI Studio (gemini-2.5-flash) as fallback")
        response = google_client.chat.completions.create(**fallback_params)
        content = response.choices[0].message.content
        if content is None:
            raise RuntimeError("Google AI Studio returned None content for model=gemini-2.5-flash")
        return content

    except Exception as e:
        logger.error(f"Google AI Studio fallback failed: {e}")
        raise RuntimeError(
            f"Both Groq and Google AI Studio failed. Groq: rate limited. Google: {e}"
        ) from e
