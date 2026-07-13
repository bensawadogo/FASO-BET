from fastapi import APIRouter, HTTPException
from engine.contract import AIRequest
from engine.gateway import process_request

router = APIRouter(prefix="/v2/chat")

@router.post("")
async def chat_v2(req: AIRequest):
    if not req.capability:
        raise HTTPException(status_code=422, detail="capability is required")
    if not req.messages and not req.prompt_template:
        raise HTTPException(status_code=422, detail="messages or prompt_template required")
    return await process_request(req)
