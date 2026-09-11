import subprocess
from pathlib import Path

def create_model():
    print("Creating jarvis-llama model in Ollama...")
    modelfile_path = Path(__file__).parent / "Modelfile"
    
    try:
        # Run the ollama create command
        result = subprocess.run(
            ["ollama", "create", "jarvis-llama", "-f", str(modelfile_path)],
            check=True,
            capture_output=True,
            text=True
        )
        print("Model created successfully!")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Failed to create model:")
        print(e.stderr)
        
    print("\nYou can now test it with: ollama run jarvis-llama")

if __name__ == "__main__":
    create_model()
