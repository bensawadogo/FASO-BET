from fastapi import APIRouter, Query, HTTPException
from db.connection import fetch_all, fetch_one
from engine.router import select_model

router = APIRouter(prefix="/v1/models")

@router.get("")
async def list_models(provider: str = None, available: bool = True):
    sql = "SELECT * FROM ai_models WHERE is_available = $1"
    params = [available]
    if provider:
        sql += " AND provider::text = $2"
        params.append(provider)
    sql += " ORDER BY priority DESC"
    return {"models": await fetch_all(sql, tuple(params))}

@router.get("/select")
async def get_model(
    capability: str = Query("default"),
    prefer_cheapest: bool = Query(False),
    prefer_fastest: bool = Query(False),
    needs_vision: bool = Query(False),
    needs_code: bool = Query(False),
    needs_tools: bool = Query(False),
    min_context: int = Query(4096),
    provider: str = Query(None),
):
    model = await select_model(capability, prefer_cheapest, prefer_fastest,
                                needs_vision, needs_code, needs_tools,
                                min_context, provider)
    if not model:
        raise HTTPException(status_code=404, detail="No model found matching criteria")
    return {"model": model}

@router.get("/{model_key}")
async def get_model_detail(model_key: str):
    model = await fetch_one("SELECT * FROM ai_models WHERE model_key = $1", (model_key,))
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"model": model}
