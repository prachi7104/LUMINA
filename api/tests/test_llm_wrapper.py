"""
Unit tests for LLM wrapper function with retry and fallback logic.
"""

from unittest.mock import MagicMock, Mock

import httpx
import pytest
from openai import RateLimitError

from api.llm import call_llm


@pytest.fixture
def mock_openai_response():
    """Create a mock OpenAI response structure."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = "Test response"
    return response


@pytest.fixture
def mock_rate_limit_error():
    """Create a properly structured RateLimitError for testing."""
    mock_response = Mock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.headers = {}
    return RateLimitError("Rate limit exceeded", response=mock_response, body=None)


@pytest.fixture
def mock_settings(mocker):
    """Mock the settings object with test API keys."""
    mock = mocker.patch("api.llm.settings")
    mock.GROQ_API_KEY_HEAVY = "test-heavy-key"
    mock.GROQ_API_KEY_LIGHT = "test-light-key"
    mock.GOOGLE_API_KEY = "test-google-key"
    return mock


def test_uses_heavy_key_for_70b_model(mocker, mock_settings, mock_openai_response):
    """Test that 70b models use GROQ_API_KEY_HEAVY."""
    mock_openai = mocker.patch("api.llm.OpenAI")
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_openai_response
    mock_openai.return_value = mock_client

    call_llm(
        model="llama-3.3-70b-versatile",
        system="Test system",
        user="Test user"
    )

    # First call to OpenAI should be for Groq with heavy key
    assert mock_openai.call_args_list[0][1]["api_key"] == "test-heavy-key"
    assert mock_openai.call_args_list[0][1]["base_url"] == "https://api.groq.com/openai/v1"


def test_uses_light_key_for_8b_model(mocker, mock_settings, mock_openai_response):
    """Test that 8b models use GROQ_API_KEY_LIGHT."""
    mock_openai = mocker.patch("api.llm.OpenAI")
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_openai_response
    mock_openai.return_value = mock_client

    call_llm(
        model="llama-3.1-8b-instant",
        system="Test system",
        user="Test user"
    )

    # First call to OpenAI should be for Groq with light key
    assert mock_openai.call_args_list[0][1]["api_key"] == "test-light-key"
    assert mock_openai.call_args_list[0][1]["base_url"] == "https://api.groq.com/openai/v1"


def test_retries_on_rate_limit_then_succeeds(
    mocker, mock_settings, mock_openai_response, mock_rate_limit_error
):
    """Test retry logic when Groq rate limit is hit, then succeeds."""
    # Mock time.sleep to avoid delays
    mocker.patch("api.llm.time.sleep")

    mock_openai = mocker.patch("api.llm.OpenAI")
    mock_client = MagicMock()

    # First call raises RateLimitError, second succeeds
    mock_client.chat.completions.create.side_effect = [
        mock_rate_limit_error,
        mock_openai_response
    ]
    mock_openai.return_value = mock_client

    result = call_llm(
        model="llama-3.1-8b-instant",
        system="Test system",
        user="Test user"
    )

    assert result == "Test response"
    assert mock_client.chat.completions.create.call_count == 2


def test_falls_back_to_google_after_3_groq_failures(
    mocker, mock_settings, mock_rate_limit_error
):
    """Test fallback to Google AI Studio after 3 Groq rate limit failures."""
    # Mock time.sleep to avoid delays
    mocker.patch("api.llm.time.sleep")

    mock_openai = mocker.patch("api.llm.OpenAI")

    # Create separate clients for Groq and Google
    mock_groq_client = MagicMock()
    mock_google_client = MagicMock()

    # Groq always fails with rate limit
    mock_groq_client.chat.completions.create.side_effect = mock_rate_limit_error

    # Google succeeds
    google_response = MagicMock()
    google_response.choices = [MagicMock()]
    google_response.choices[0].message.content = "Google fallback response"
    mock_google_client.chat.completions.create.return_value = google_response

    # Return Groq client first (3 times), then Google client
    mock_openai.side_effect = [mock_groq_client, mock_google_client]

    result = call_llm(
        model="llama-3.1-8b-instant",
        system="Test system",
        user="Test user"
    )

    # Should return Google's response
    assert result == "Google fallback response"

    # Groq should be called 3 times
    assert mock_groq_client.chat.completions.create.call_count == 3

    # Google should be called once
    assert mock_google_client.chat.completions.create.call_count == 1

    # Check Google client was instantiated with correct params
    google_init_call = mock_openai.call_args_list[1]
    assert google_init_call[1]["api_key"] == "test-google-key"
    assert (
        google_init_call[1]["base_url"]
        == "https://generativelanguage.googleapis.com/v1beta/openai/"
    )


def test_raises_runtime_error_if_all_fail(mocker, mock_settings, mock_rate_limit_error):
    """Test that RuntimeError is raised if both Groq and Google fail."""
    # Mock time.sleep to avoid delays
    mocker.patch("api.llm.time.sleep")

    mock_openai = mocker.patch("api.llm.OpenAI")

    # Both clients fail
    mock_groq_client = MagicMock()
    mock_google_client = MagicMock()

    mock_groq_client.chat.completions.create.side_effect = mock_rate_limit_error
    mock_google_client.chat.completions.create.side_effect = Exception("Google API error")

    mock_openai.side_effect = [mock_groq_client, mock_google_client]

    with pytest.raises(RuntimeError) as exc_info:
        call_llm(
            model="llama-3.1-8b-instant",
            system="Test system",
            user="Test user"
        )

    assert "Both Groq and Google AI Studio failed" in str(exc_info.value)
    assert "Google API error" in str(exc_info.value)


def test_json_mode_adds_response_format(mocker, mock_settings, mock_openai_response):
    """Test that json_mode=True adds response_format to the request."""
    mock_openai = mocker.patch("api.llm.OpenAI")
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_openai_response
    mock_openai.return_value = mock_client

    call_llm(
        model="llama-3.1-8b-instant",
        system="Test system",
        user="Test user",
        json_mode=True
    )

    # Check the create call included response_format
    create_call_kwargs = mock_client.chat.completions.create.call_args[1]
    assert "response_format" in create_call_kwargs
    assert create_call_kwargs["response_format"] == {"type": "json_object"}
