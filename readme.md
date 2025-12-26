# 🎙️ Multilingual AI Voice Bot  
### Sarvam Saarika v2.5 + Groq LLM

---

## 📌 Project Overview

This project implements a **multilingual AI voice bot** that allows users to **speak in their preferred language** (Hindi, English, Marathi, etc.), processes the input using AI, and responds back **in the same language** as both **text and optional speech**.

The system is designed using a **modular, service-based architecture** so that each part of the pipeline can be reused, replaced, or extended independently.

---

## 🎯 Core Idea

- Users speak naturally in any supported language  
- Speech is converted into text  
- **All AI reasoning is performed in English** for better LLM accuracy  
- The response is translated back into the **user’s original language**  
- UI shows both:
  - English (intermediate output)
  - Final translated output (user-facing)

This approach balances **user comfort** and **AI quality**.

---

## 🧠 Why These Technologies?

### Why Sarvam Saarika v2.5?

We use **Sarvam Saarika v2.5** (`model="saarika:v2.5"`) as a **single unified model** for:

- Speech-to-Text (STT)
- Language Detection
- Translation (User Language ⇄ English)

**Benefits:**
- One model handles the entire speech & language pipeline
- Consistent multilingual behavior
- Reduced system complexity
- Strong support for Indian languages

---

### Why English as the Internal LLM Language?

LLMs perform best when:
- Prompts are written in English
- System instructions are consistent
- Reasoning chains are not fragmented across languages

**Design decision:**
- Convert all user input → English before LLM
- Convert LLM output → user’s original language after processing

---

### Why Groq LLM?

Groq is used for:
- Low-latency inference
- Stable and predictable responses
- Applying a fixed **Advisor System Prompt**

This ensures structured, polite, and guidance-oriented answers.

---

## 🔁 End-to-End System Flow

```text
User Audio
→ Sarvam Saarika (Speech-to-Text)
→ Sarvam Saarika (Language Detection)
→ Sarvam Saarika (Translate to English)
→ Groq LLM (Advisor Prompt)
→ Response Generated (English)
→ UI shows English output
→ Sarvam Saarika (Translate back to original language)
→ UI shows final translated output
→ (Optional) Text-to-Speech



🔍 Step-by-Step Processing
1️⃣ User Audio Input

User speaks via the microphone in the web UI.

Why:
Voice interaction is faster and more natural, especially for non-English users.

2️⃣ Speech-to-Text (STT)

Model: saarika:v2.5

Converts raw audio into text.

Why:
LLMs operate on text, not audio.

3️⃣ Language Detection

Model: saarika:v2.5

Detects the language spoken by the user.

Why:

Determines if translation is required

Ensures the response returns in the same language

Maintains consistent user experience

4️⃣ Translation to English

Model: saarika:v2.5

Translates user text into English (if required).

Why:
English provides better reasoning and prompt stability for LLMs.

5️⃣ LLM Processing (Groq)

English input is sent to Groq with an Advisor System Prompt.

Why:
This is where intent understanding, reasoning, and response generation occur.

6️⃣ UI Display (English Output)

English response is shown in the UI.

Why this is useful:

Debugging

Transparency for reviewers

Validation of translations

7️⃣ Translation Back to User Language

Model: saarika:v2.5

LLM response is translated back to the user’s original language.

8️⃣ UI Display (Final Output)

The translated response is displayed as the primary user output.

9️⃣ Text-to-Speech (Optional)

Final translated text can be converted to speech and played back.

Why:
Completes a full voice → voice interaction loop.

🧱 Project Folder Structure
VOICE_BOT/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   ├── uploads/
│   ├── chatbot/
│   │   ├── education_advisor.py
│   │   └── groq_advisor.py
│   ├── core/
│   │   ├── clients.py
│   │   ├── config.py
│   │   └── sessions.py
│   ├── routes/
│   │   ├── voicebot.py
│   │   ├── chat.py
│   │   ├── health.py
│   │   └── reset.py
│   ├── schemas/
│   │   └── chat.py
│   └── services/
│       ├── stt_service.py
│       ├── translate_service.py
│       ├── llm_service.py
│       └── storage_service.py
│
└── frontend/
    ├── index.html
    ├── app.js
    ├── api.js
    ├── recorder.js
    ├── dom.js
    ├── session.js
    ├── styles.css
    └── vite.config.js

🧩 Modular Architecture & Reusability
services/ — Business Logic Layer

Each service has a single responsibility:

stt_service.py → Speech processing

translate_service.py → Language translation

llm_service.py → LLM interaction

storage_service.py → Audio/file storage

Reusable across:

Web voice bots

Mobile assistants

IVR / call-center systems

Messaging bots

routes/ — API Layer

Handles HTTP endpoints and delegates logic to services.

Keeps routes clean and readable.

chatbot/ — AI Behavior Layer

Defines:

Advisor personality

Tone and response structure

New bots can be added without changing the pipeline.

core/ — Shared Infrastructure

Manages:

Configuration

External client initialization

Session handling