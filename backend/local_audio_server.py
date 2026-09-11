import asyncio
import io
import wave
from aiohttp import web
from faster_whisper import WhisperModel
import pyttsx3
import tempfile
import os

# Initialize models
print("Loading Whisper model...")
whisper_model = WhisperModel("base", device="auto", compute_type="default")

# Initialize TTS
engine = pyttsx3.init()

async def handle_transcriptions(request):
    try:
        reader = await request.multipart()
        field = await reader.next()
        if field.name == 'file':
            filename = field.filename
            content = await field.read()
            
            # Save temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                tmp.write(content)
                tmp_path = tmp.name
                
            segments, _ = whisper_model.transcribe(tmp_path, beam_size=5)
            text = " ".join([segment.text for segment in segments]).strip()
            
            os.remove(tmp_path)
            
            return web.json_response({
                "text": text
            })
    except Exception as e:
        print(f"Error in transcription: {e}")
        return web.json_response({"error": str(e)}, status=500)
        
    return web.json_response({"error": "Bad request"}, status=400)

async def handle_speech(request):
    try:
        data = await request.json()
        text = data.get("input", "")
        voice = data.get("voice", "alloy") # ignored, using pyttsx3 default
        
        # Save temporary file for pyttsx3
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp_path = tmp.name
            
        # pyttsx3 is blocking, so run it in a thread
        def run_tts():
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            
        await asyncio.to_thread(run_tts)
        
        # Read the generated file
        with open(tmp_path, "rb") as f:
            audio_data = f.read()
            
        os.remove(tmp_path)
        
        return web.Response(body=audio_data, content_type="audio/mpeg")
        
    except Exception as e:
        print(f"Error in speech: {e}")
        return web.json_response({"error": str(e)}, status=500)

app = web.Application()
app.router.add_post('/v1/audio/transcriptions', handle_transcriptions)
app.router.add_post('/v1/audio/speech', handle_speech)

if __name__ == '__main__':
    print("Starting local audio server on port 8000...")
    web.run_app(app, port=8000)
