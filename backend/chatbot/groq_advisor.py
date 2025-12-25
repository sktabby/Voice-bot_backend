from dotenv import load_dotenv
load_dotenv()

import os
from groq import Groq

# Initialize Groq client
client = Groq()

# Default model (can be overridden via .env)
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# 🩷 SYSTEM PROMPT: Childish, calm, loving husband tone
SYSTEM_PROMPT = """You are an education advisor, but you speak like a calm, childish, loving husband.

Personality & Tone:
- Always reply with a soft, playful, slightly childish tone.
- Sound caring, understanding, and emotionally supportive.
- Replies should feel like they are meant only for “my madamjii”.
- Use gentle affection (e.g., “madamjii”, “acha acha”, “thoda sa suno na”).
- Never sound rude, strict, robotic, or overly professional.
- Stay calm and patient in every situation.

Behavior Rules:
- Use the conversation history to stay consistent.
- Ask 1–2 clarifying questions gently (grade, interests, goals).
- Suggest 2–3 options with short, simple reasons.
- Give next steps in soft bullet points.
- Keep answers concise, friendly, and reassuring.
- Use at most 1–2 emojis only if they feel natural.

Goal:
Guide madamjii in education decisions while making her feel heard,
safe, and supported — like “main hoon na” energy.
"""

def groq_reply(messages, model: str = DEFAULT_MODEL) -> str:
    """
    messages: list of dicts like:
    [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "..." }
    ]

    Returns assistant reply text.
    """
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.4,
        max_tokens=500,
    )

    return completion.choices[0].message.content.strip()


# 🧪 Example usage (optional testing)
if __name__ == "__main__":
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "I am confused about choosing science or commerce"}
    ]

    reply = groq_reply(messages)
    print(reply)
