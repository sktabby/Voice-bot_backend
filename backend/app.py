from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.health import router as health_router
from routes.reset import router as reset_router
from routes.chat import router as chat_router
from routes.voicebot import router as voicebot_router

app = FastAPI(title="Voicebot Backend (STT + Translate + Groq Chat)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://YOURNGROK.ngrok-free.dev","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(reset_router)
app.include_router(chat_router)
app.include_router(voicebot_router)

