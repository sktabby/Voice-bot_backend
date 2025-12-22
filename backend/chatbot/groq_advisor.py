# import os
# from groq import Groq
from dotenv import load_dotenv
load_dotenv()


# # Create client (reads GROQ_API_KEY from environment automatically)
# client = Groq()

# # Pick a model you have access to from Groq Console -> Models
# # (Example model names vary by account permissions)
# DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# SYSTEM_PROMPT = """You are an education advisor.
# Your job:
# - Ask 1-2 clarifying questions if needed (class/grade, interests, goals).
# - Suggest 2-3 options with short reasons.
# - Give next steps (subjects, resources, exams) in bullet points.
# - Keep it concise and friendly.
# If user asks unrelated stuff, steer them back to education/career guidance.
# """

# def ask_education_advisor(user_prompt: str, model: str = DEFAULT_MODEL) -> str:
#     user_prompt = (user_prompt or "").strip()
#     if not user_prompt:
#         return "Please type a question (e.g., 'What should I choose after 10th?')."

#     completion = client.chat.completions.create(
#         model=model,
#         messages=[
#             {"role": "system", "content": SYSTEM_PROMPT},
#             {"role": "user", "content": user_prompt},
#         ],
#         temperature=0.4,
#         max_tokens=400,
#     )

#     return completion.choices[0].message.content.strip()


import os
from groq import Groq

client = Groq()

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

SYSTEM_PROMPT = """You are an education advisor.
Rules:
- Use the conversation history to stay consistent.
- Ask 1–2 clarifying questions if needed (grade, interests, goals).
- Suggest 2–3 options with short reasons.
- Give next steps in bullet points.
- Keep answers concise and friendly.
"""

def groq_reply(messages, model: str = DEFAULT_MODEL) -> str:
    """
    messages: list of dicts like [{"role":"user","content":"..."}, ...]
    Returns assistant reply text.
    """
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.4,
        max_tokens=500,
    )
    return completion.choices[0].message.content.strip()
