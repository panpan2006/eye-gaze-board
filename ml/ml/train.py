import json
import torch
from transformers import (
    T5ForConditionalGeneration,
    T5Tokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
)
from datasets import Dataset

# ── Load dataset ──
print("Loading dataset...")
with open("dataset.json") as f:
    raw_data = json.load(f)

print(f"Loaded {len(raw_data)} examples")

# ── Load model and tokenizer ──
print("Loading T5-small model...")
MODEL_NAME = "t5-small"
tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)

# ── Tokenize ──
def preprocess(examples):
    # Prefix tells T5 what task to do
    inputs = ["expand aac keywords: " + kw for kw in examples["keywords"]]
    targets = examples["sentence"]

    model_inputs = tokenizer(
        inputs,
        max_length=32,
        truncation=True,
        padding="max_length",
    )

    labels = tokenizer(
        targets,
        max_length=128,
        truncation=True,
        padding="max_length",
    )

    # Replace padding token id with -100 so loss ignores it
    label_ids = [
        [(l if l != tokenizer.pad_token_id else -100) for l in label]
        for label in labels["input_ids"]
    ]

    model_inputs["labels"] = label_ids
    return model_inputs

# ── Build HuggingFace dataset ──
print("Tokenizing...")
hf_dataset = Dataset.from_list(raw_data)
tokenized = hf_dataset.map(
    preprocess,
    batched=True,
    remove_columns=["keywords", "sentence"],
)

# Split into train/eval (90/10)
split = tokenized.train_test_split(test_size=0.1, seed=42)
train_dataset = split["train"]
eval_dataset = split["test"]

print(f"Train: {len(train_dataset)}, Eval: {len(eval_dataset)}")

# ── Training arguments ──
training_args = TrainingArguments(
    output_dir="./aac-t5-checkpoints",
    num_train_epochs=50,            # More epochs since dataset is small
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    learning_rate=3e-4,
    warmup_steps=10,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    report_to="none",               # No wandb/tensorboard needed
    fp16=False,                     # Keep off for CPU training
)

# ── Data collator ──
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model,
    padding=True,
)

# ── Trainer ──
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
)

# ── Train ──
print("\nStarting training...")
print(f"Device: {'GPU' if torch.cuda.is_available() else 'CPU'}")
print(f"This will take ~5-15 minutes on CPU...\n")

trainer.train()

# ── Save final model ──
print("\nSaving model...")
model.save_pretrained("./aac-t5-final")
tokenizer.save_pretrained("./aac-t5-final")
print("Model saved to ./aac-t5-final")

# ── Quick test ──
print("\nTesting model...")
def expand(keywords: str) -> str:
    input_text = f"expand aac keywords: {keywords}"
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids
    outputs = model.generate(
        input_ids,
        max_length=128,
        num_beams=4,
        early_stopping=True,
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

test_keywords = [
    "BED HOT",
    "PAIN LEG",
    "NURSE HELP",
    "WATER PLEASE",
    "FAMILY CALL",
    "SCARED ALONE",
    "THANK YOU",
]

print("\nResults:")
print("-" * 60)
for kw in test_keywords:
    result = expand(kw)
    print(f"  [{kw}] → {result}")
print("-" * 60)