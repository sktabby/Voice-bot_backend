from pydantic import BaseModel

class ChatRequest(BaseModel):
    session_id: str
    prompt: str


# This Pydantic model defines the request schema for chat endpoints,
# enforcing structured validation of the session identifier and user prompt
# received from the client.
