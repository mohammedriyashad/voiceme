"""models/llm_model.py — Phi-2 local LLM (Phase 6)"""
import asyncio
import torch
from concurrent.futures import ThreadPoolExecutor
from transformers import AutoTokenizer, AutoModelForCausalLM

from models.behavior_interpreter import fuse, context_string
from utils.config import config
from utils.state  import app_state

_tokenizer = None
_model     = None
_executor  = ThreadPoolExecutor(max_workers=1)
PHI2_ID    = "microsoft/phi-2"


def _load():
    global _tokenizer, _model
    if _tokenizer:
        return
    print("[LLM] Loading Phi-2 … (first run downloads ~5.5 GB)")
    _tokenizer = AutoTokenizer.from_pretrained(PHI2_ID, trust_remote_code=True)
    device     = "cuda" if torch.cuda.is_available() else "cpu"
    dtype      = torch.float16 if device == "cuda" else torch.float32
    _model     = AutoModelForCausalLM.from_pretrained(
        PHI2_ID, torch_dtype=dtype,
        device_map="auto" if device == "cuda" else None,
        trust_remote_code=True,
    )
    if device == "cpu":
        _model = _model.to("cpu")
    _model.eval()
    print(f"[LLM] Phi-2 ready on {device} ✓")


def _build_prompt(fused: dict) -> str:
    lines = []
    if fused["emotion"].get("confidence", 0) > 0.4:
        lines.append(f"Facial emotion  : {fused['emotion']['display_label']} ({int(fused['emotion']['confidence']*100)}%)")
    if fused["gesture"].get("name") not in ("none", "unknown"):
        lines.append(f"Hand gesture    : {fused['gesture']['meaning']}")
    if fused["pose"].get("name") not in ("normal", "unknown"):
        lines.append(f"Body posture    : {fused['pose']['meaning']}")
    if fused["symbols"]:
        lines.append(f"Symbols selected: {', '.join(fused['symbols'])}")
    if fused["speech"]:
        lines.append(f'Speech input    : "{fused["speech"]}"')

    ctx = "\n".join(lines) if lines else "No clear signal."

    child_name = app_state.active_child_name or "the child"

    return (
        f"Instruct: You are an AAC (Augmentative and Alternative Communication) AI assistant.\n"
        f"{child_name} is a non-verbal autistic individual. The system has detected these signals:\n\n"
        f"{ctx}\n\n"
        f"Write ONE clear, empathetic sentence starting with 'I' that tells the caregiver "
        f"exactly what {child_name} needs or feels right now. Be direct, natural, and concise.\n"
        f"Output:"
    )


def generate_sentence() -> str:
    _load()
    fused = fuse()
    if not fused["has_input"]:
        return "I am here and ready to communicate."

    prompt = _build_prompt(fused)
    inputs = _tokenizer(prompt, return_tensors="pt")
    dev    = next(_model.parameters()).device
    inputs = {k: v.to(dev) for k, v in inputs.items()}

    with torch.no_grad():
        out = _model.generate(
            **inputs,
            max_new_tokens = config.PHI2_MAX_TOKENS,
            do_sample      = True,
            temperature    = config.PHI2_TEMPERATURE,
            top_p          = 0.9,
            repetition_penalty = 1.1,
            pad_token_id   = _tokenizer.eos_token_id,
            eos_token_id   = _tokenizer.eos_token_id,
        )

    new_ids  = out[0][inputs["input_ids"].shape[-1]:]
    sentence = _tokenizer.decode(new_ids, skip_special_tokens=True).strip()

    # Take first complete sentence only
    for sep in [".", "!", "?"]:
        if sep in sentence:
            sentence = sentence.split(sep)[0].strip() + sep
            break

    # Ensure starts with "I"
    if sentence and not sentence[0:2] in ("I ", "I'"):
        sentence = "I " + sentence.lstrip()

    # Fallback
    if len(sentence) < 5:
        sentence = "I need help right now."

    app_state.last_sentence = sentence
    return sentence


async def generate_sentence_async() -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, generate_sentence)