"""
LLM Fallback Utility — Multi-provider failover for CrewAI Agents.

Strategy:
  Primary (Groq free) → Fallback 1 (OpenRouter free) → Fallback 2 (NVIDIA NIM free)

All models used are free-tier.
"""

import os
import logging
from crewai import LLM

logger = logging.getLogger("agentic_tutor.llm")


GROQ_MODELS = {
    "large": "groq/llama-3.3-70b-versatile",
    "small": "groq/llama-3.1-8b-instant",
}

OPENROUTER_MODELS = {
    "large": "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    "small": "openrouter/meta-llama/llama-3.1-8b-instruct:free",
}

NVIDIA_MODELS = {
    "large": "nvidia_nim/meta/llama-3.3-70b-instruct",
    "small": "nvidia_nim/meta/llama-3.1-8b-instruct",
}

GEMINI_MODELS = {
    "flash": "gemini/gemini-2.5-flash",
}


def _build_llm(model_string: str, temperature: float = 0.7) -> LLM:
    """Construct a CrewAI LLM with the appropriate API key based on the provider prefix."""
    if model_string.startswith("groq/"):
        return LLM(
            model=model_string,
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=temperature,
        )
    elif model_string.startswith("openrouter/"):
        return LLM(
            model=model_string,
            api_key=os.getenv("OPEN_ROUTER_API_KEY"),
            temperature=temperature,
        )
    elif model_string.startswith("nvidia_nim/"):
        return LLM(
            model=model_string,
            api_key=os.getenv("NVIDEA_API_KEY"),
            temperature=temperature,
        )
    elif model_string.startswith("gemini/"):
        return LLM(
            model=model_string,
            api_key=os.getenv("GEMINI_API_KEY"),
            temperature=temperature,
        )
    else:
        return LLM(model=model_string, temperature=temperature)


def get_llm(
    size: str = "large",
    provider: str = "groq",
    temperature: float = 0.7,
) -> LLM:
    """
    Return a CrewAI LLM instance.

    Parameters
    ----------
    size : str
        "large" (70B) or "small" (8B) or "flash" (Gemini).
    provider : str
        "groq" | "openrouter" | "nvidia" | "gemini"
    temperature : float
        Sampling temperature.

    The calling agent code should wrap its crew.kickoff() in a try/except
    and call this function with a different provider on rate-limit errors.
    """
    catalogs = {
        "groq": GROQ_MODELS,
        "openrouter": OPENROUTER_MODELS,
        "nvidia": NVIDIA_MODELS,
        "gemini": GEMINI_MODELS,
    }
    catalog = catalogs.get(provider, GROQ_MODELS)
    model_string = catalog.get(size, catalog.get("large", "groq/llama-3.3-70b-versatile"))
    logger.info(f"Building LLM: provider={provider}, size={size}, model={model_string}")
    return _build_llm(model_string, temperature)



def roadmap_llm() -> LLM:
    return get_llm(size="large", provider="groq", temperature=0.5)

def resource_fetcher_llm() -> LLM:
    return get_llm(size="large", provider="groq", temperature=0.4)

def script_writer_llm() -> LLM:
    return get_llm(size="flash", provider="gemini", temperature=0.7)

def assessment_llm() -> LLM:
    return get_llm(size="small", provider="groq", temperature=0.3)

def doubt_resolver_llm() -> LLM:
    return get_llm(size="small", provider="groq", temperature=0.5)

def roadmap_adjuster_llm() -> LLM:
    return get_llm(size="large", provider="groq", temperature=0.4)

def absence_handler_llm() -> LLM:
    return get_llm(size="small", provider="groq", temperature=0.3)

def performance_tracker_llm() -> LLM:
    return get_llm(size="small", provider="groq", temperature=0.3)



FALLBACK_CHAIN = ["groq", "openrouter", "nvidia"]

def get_llm_with_fallback(size: str = "large", temperature: float = 0.7) -> LLM:
    """
    Try each provider in FALLBACK_CHAIN until one succeeds.
    Returns the first successfully constructed LLM.
    """
    for provider in FALLBACK_CHAIN:
        try:
            llm = get_llm(size=size, provider=provider, temperature=temperature)
            logger.info(f"LLM ready: {provider}/{size}")
            return llm
        except Exception as e:
            logger.warning(f"Failed to build LLM from {provider}: {e}")
    logger.error("All providers failed, falling back to groq/llama-3.1-8b-instant")
    return _build_llm("groq/llama-3.1-8b-instant", temperature)
