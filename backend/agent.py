"""Minimal LiveKit worker for the Jarvis backend.

Phase 1 establishes the worker lifecycle only. Voice AI providers are added in
later phases after the LiveKit connection has been verified.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import openai, silero


PROJECT_ROOT = Path(__file__).resolve().parents[1]
logger = logging.getLogger("jarvis.agent")


@dataclass(frozen=True)
class LiveKitConfig:
    """The server-side LiveKit settings required by the worker."""

    url: str
    api_key: str
    api_secret: str


class JarvisAgent(Agent):
    """The room-level identity for the assistant."""

    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are Jarvis, a highly intelligent and capable AI assistant created to help the user with coding and general tasks. "
                "Your interface with users will be voice. "
                "Be professional, concise, and helpful. "
                "Keep your responses relatively short so they are easy to listen to. "
                "Avoid using unpronounceable punctuation or markdown."
            ),
            id="jarvis",
        )


def prewarm(proc: JobProcess) -> None:
    """Preload necessary models so the agent starts up faster."""
    proc.userdata["vad"] = silero.VAD.load()


def configure_logging() -> None:
    """Configure concise logs without including environment values."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def load_config() -> LiveKitConfig:
    """Load and validate the credentials that LiveKit Agents reads from the environment."""
    load_dotenv(PROJECT_ROOT / ".env")

    values = {
        "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
        "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
        "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
    }
    missing = [name for name, value in values.items() if not value]
    if missing:
        names = ", ".join(missing)
        raise RuntimeError(
            f"Missing required configuration: {names}. "
            "Copy backend/.env.example to .env and provide real values."
        )

    return LiveKitConfig(
        url=values["LIVEKIT_URL"] or "",
        api_key=values["LIVEKIT_API_KEY"] or "",
        api_secret=values["LIVEKIT_API_SECRET"] or "",
    )


async def log_shutdown(reason: str) -> None:
    """Record why LiveKit ended this dispatched job."""
    logger.info("Jarvis job is shutting down: %s", reason)


async def entrypoint(ctx: JobContext) -> None:
    """Join a dispatched room and start the provider-free Jarvis session."""
    ctx.add_shutdown_callback(log_shutdown)
    logger.info("Jarvis job received for room '%s'", ctx.room.name)
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=openai.STT(),
        llm=openai.LLM(
            model="llama3.1",
            base_url="http://localhost:11434/v1",
            api_key="ollama"
        ),
        tts=openai.TTS(),
    )

    try:
        await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
        logger.info("Jarvis connected to room '%s'", ctx.room.name)

        await session.start(agent=JarvisAgent(), room=ctx.room)
        logger.info("Jarvis agent session started in room '%s'", ctx.room.name)

        await asyncio.sleep(1) # Wait a moment for the connection to settle
        await session.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)

        # Keep the active session running
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        logger.info("Jarvis job was cancelled for room '%s'", ctx.room.name)
        raise
    except Exception:
        logger.exception("Jarvis could not run in room '%s'", ctx.room.name)
        raise
    finally:
        await session.aclose()
        logger.info("Jarvis job finished for room '%s'", ctx.room.name)


def main() -> None:
    """Validate configuration before LiveKit starts the worker process."""
    configure_logging()
    load_config()
    logger.info("Starting Jarvis LiveKit worker")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))


if __name__ == "__main__":
    main()
