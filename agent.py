import asyncio
import logging
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import openai, silero

# Load environment variables from .env file
load_dotenv()

# Setup logging
logger = logging.getLogger("jarvis-agent")

def prewarm(proc: JobProcess):
    """
    Preload necessary models so the agent starts up faster.
    Silero VAD is used to detect when someone is speaking.
    """
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    """
    The main logic for the Voice Agent.
    """
    logger.info(f"Connecting to room: {ctx.room.name}")
    
    # Connect to the LiveKit room, only subscribing to audio to save bandwidth
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Define Jarvis's instructions
    agent = Agent(
        instructions=(
            "You are Jarvis, a highly intelligent and capable AI assistant created to help the user with coding and general tasks. "
            "Your interface with users will be voice. "
            "Be professional, concise, and helpful. "
            "Keep your responses relatively short so they are easy to listen to. "
            "Avoid using unpronounceable punctuation or markdown."
        )
    )

    # Initialize the Voice Session
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=openai.STT(),       # Speech-to-Text: Whisper
        llm=openai.LLM(),       # Language Model: GPT-4o
        tts=openai.TTS(),       # Text-to-Speech: OpenAI TTS
    )

    # Start the agent in the room
    await session.start(agent=agent, room=ctx.room)

    # Greet the user
    await asyncio.sleep(1) # Wait a moment for the connection to settle
    await session.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)

if __name__ == "__main__":
    # Start the LiveKit agent worker
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
