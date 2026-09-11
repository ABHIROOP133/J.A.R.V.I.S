import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from pathlib import Path

# Configuration
MODEL_NAME = "meta-llama/Meta-Llama-3.1-8B-Instruct"
DATASET_PATH = str(Path(__file__).parent / "jarvis_dataset.jsonl")
OUTPUT_DIR = str(Path(__file__).parent / "jarvis-llama-adapter")

def train():
    print(f"Loading dataset from {DATASET_PATH}...")
    dataset = load_dataset("json", data_files={"train": DATASET_PATH}, split="train")

    # QLoRA configuration for 4-bit quantization (Saves VRAM)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    print(f"Loading model {MODEL_NAME} in 4-bit...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
    )
    
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Prepare for LoRA
    model = prepare_model_for_kbit_training(model)
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=10,
        max_steps=50, # Set low for quick demonstration
        optim="paged_adamw_8bit",
        save_steps=50,
        fp16=True,
    )

    # Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
    )

    print("Starting training...")
    trainer.train()

    print(f"Saving fine-tuned adapter to {OUTPUT_DIR}...")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("\nTraining complete! To use with Ollama:")
    print("1. Convert to GGUF using llama.cpp")
    print("2. Or use the provided Modelfile if you merge the weights")

if __name__ == "__main__":
    train()
