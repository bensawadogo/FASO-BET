from fastapi import APIRouter, HTTPException
from engine.contract import AIRequest
from engine.gateway import process_request

router = APIRouter(prefix="/v2/generate")

@router.post("")
async def generate_v2(req: AIRequest):
    if not req.capability:
        raise HTTPException(status_code=422, detail="capability is required")
    if not req.prompt_template and not req.messages:
        raise HTTPException(status_code=422, detail="prompt_template or messages required")
    return await process_request(req)
