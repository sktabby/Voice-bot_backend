from chatbot.groq_advisor import SYSTEM_PROMPT, groq_reply

def chat_with_memory(history: list[dict], prompt: str) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history + [
        {"role": "user", "content": prompt}
    ]
    return groq_reply(messages)



# This helper function builds a context-aware chat request by combining
# the fixed system prompt with prior conversation history and the new user prompt,
# then delegates the final response generation to the Groq LLM service.
