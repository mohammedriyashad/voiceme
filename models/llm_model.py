"""
models/llm_model.py
Groq + Llama3-8b — Conversational AI Caregiver
Replaces Phi-2. No GPU needed. Responds in < 1 second.

Conversation flow:
  1. System greets child (Good morning/afternoon + How may I help you?)
  2. Child communicates (emotion + gesture + symbols + speech)
  3. System understands intent → responds warmly as caregiver
  4. Conversation continues naturally
"""

import os
import asyncio
import time
from datetime import datetime
from typing import Optional
from groq import AsyncGroq
from utils.config import config
from utils.state  import app_state

# ── Groq client (initialised once) ───────────────────────────
_client: Optional[AsyncGroq] = None

def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        key = config.GROQ_API_KEY
        if not key or key.startswith("gsk_your"):
            raise ValueError(
                "GROQ_API_KEY not set in .env file.\n"
                "Get your free key at https://console.groq.com"
            )
        _client = AsyncGroq(api_key=key)
        print("[LLM] Groq client initialised ✓")
    return _client


# ── Greeting logic ────────────────────────────────────────────
def get_greeting() -> str:
    hour = datetime.now().hour
    if 5 <= hour < 12:
        period = "Good morning"
        emoji  = "🌅"
    elif 12 <= hour < 17:
        period = "Good afternoon"
        emoji  = "☀️"
    elif 17 <= hour < 21:
        period = "Good evening"
        emoji  = "🌇"
    else:
        period = "Hello"
        emoji  = "🌙"
    name = app_state.active_child_name or "there"
    return f"{emoji} {period}, {name}! How may I help you today?"


# ── System prompt (AI acts as caregiver) ─────────────────────
SYSTEM_PROMPT = """You are a warm, patient, and caring AI assistant helping a non-verbal autistic child communicate their needs.

Your personality:
- Speak like a gentle, caring caregiver or teacher
- Use very simple, short sentences (max 2 sentences)
- Be warm, positive, and encouraging
- Never use complex words
- Always confirm what you understood and offer help
- If the child seems distressed, be extra calm and reassuring

Response format:
- Start by acknowledging what you understood
- Then offer specific help or ask a simple follow-up
- Keep total response under 25 words
- Use a friendly emoji at the start

Examples of good responses:
- "🥤 Oh, you want water! Let me get that for you right away."
- "😊 I can see you are feeling happy! That makes me happy too."
- "🍎 You are hungry! Would you like a snack or your meal?"
- "🤗 I am here with you. You are safe. Take a deep breath."
- "🎮 You want to play! Great idea. Let us find your favourite toy."
"""


# ── Build intent context for LLM ─────────────────────────────
def build_context(fused: dict, conversation_history: list) -> str:
    parts = []
    e = fused.get("emotion", {})
    g = fused.get("gesture", {})
    p = fused.get("pose",    {})
    syms   = fused.get("symbols",  [])
    speech = fused.get("speech",   "")

    if e.get("confidence", 0) > 0.35:
        parts.append(f"Facial emotion: {e.get('display_label','neutral')} ({int(e.get('confidence',0)*100)}% confident)")
    if g.get("name", "none") not in ("none", "No hand detected"):
        parts.append(f"Hand gesture: {g.get('meaning','')}")
    if p.get("name", "normal") not in ("normal", "unknown"):
        parts.append(f"Body posture: {p.get('meaning','')}")
    if syms:
        parts.append(f"Symbols the child selected: {', '.join(syms)}")
    if speech:
        parts.append(f"Child said or typed: \"{speech}\"")

    if not parts:
        return "No clear signal detected yet. Child has not communicated anything specific."

    return "Current signals from the child:\n" + "\n".join(f"- {p}" for p in parts)


# ── Main generate function ────────────────────────────────────
async def generate_response(
    fused: dict,
    conversation_history: list,
    is_greeting: bool = False,
) -> str:
    """
    Generate a caregiver response using Groq + Llama3.

    Args:
        fused: output from behavior_interpreter.fuse()
        conversation_history: list of {"role": "user/assistant", "content": "..."}
        is_greeting: if True, generate initial greeting only

    Returns:
        str: caregiver response sentence
    """
    client = get_client()

    # ── Greeting mode ─────────────────────────────────────────
    if is_greeting:
        greeting = get_greeting()
        app_state.last_sentence = greeting
        return greeting

    # ── Build messages for Groq ───────────────────────────────
    context = build_context(fused, conversation_history)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (last 6 turns max)
    for turn in conversation_history[-6:]:
        messages.append(turn)

    # Add current child signals as user message
    messages.append({
        "role": "user",
        "content": (
            f"{context}\n\n"
            f"Based on these signals, respond as the caring AI caregiver. "
            f"Keep it simple, warm, and under 25 words."
        )
    })

    # ── Call Groq API ─────────────────────────────────────────
    try:
        t0 = time.time()
        response = await client.chat.completions.create(
            model       = config.GROQ_MODEL,
            messages    = messages,
            max_tokens  = 80,
            temperature = 0.7,
            top_p       = 0.9,
        )
        elapsed  = round((time.time() - t0) * 1000)
        sentence = response.choices[0].message.content.strip()
        print(f"[LLM] Groq responded in {elapsed}ms: {sentence}")

        # Store in state
        app_state.last_sentence = sentence
        return sentence

    except Exception as e:
        print(f"[LLM] Groq error: {e}")
        error_msg = str(e).lower()
        if "api_key" in error_msg or "auth" in error_msg:
            return "⚠️ API key issue. Please check your GROQ_API_KEY in .env file."
        if "rate" in error_msg:
            return "⚠️ Too many requests. Please wait a moment."
        return "🤗 I am here with you. Please try again."


# ── Sync wrapper for non-async contexts ──────────────────────
def generate_response_sync(fused: dict, history: list, is_greeting: bool = False) -> str:
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(generate_response(fused, history, is_greeting))
    finally:
        loop.close()