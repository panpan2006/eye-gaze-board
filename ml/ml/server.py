from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch
import os

app = FastAPI(title="AAC Model Server")

# Allow Next.js to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model ──
MODEL_PATH = "./aac-t5-final"
print(f"Loading model from {MODEL_PATH}...")

tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH)
model.eval()  # Set to inference mode

print("Model loaded and ready!")

class ExpandRequest(BaseModel):
    keywords: str

class ExpandResponse(BaseModel):
    sentence: str
    keywords: str

@app.post("/expand", response_model=ExpandResponse)
def expand_keywords(req: ExpandRequest):
    keywords = req.keywords.strip().upper()

    input_text = f"expand aac keywords: {keywords}"
    input_ids = tokenizer(
        input_text,
        return_tensors="pt",
        max_length=32,
        truncation=True,
    ).input_ids

    with torch.no_grad():
        outputs = model.generate(
            input_ids,
            max_length=128,
            num_beams=4,
            early_stopping=True,
            no_repeat_ngram_size=2,
        )

    sentence = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return ExpandResponse(sentence=sentence, keywords=keywords)

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}

@app.get("/")
def root():
    return {"message": "AAC Model Server running"}