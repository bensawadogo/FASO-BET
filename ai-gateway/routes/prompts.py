from fastapi import APIRouter
from db.connection import fetch_one, fetch_all

router = APIRouter(prefix="/v1/prompts")

@router.get("")
async def list_prompts(capability: str = None):
    sql = "SELECT * FROM ai_prompt_templates"
    params = []
    if capability:
        sql += " WHERE capability = $1"
        params.append(capability)
    sql += " ORDER BY capability, version DESC"
    return {"prompts": await fetch_all(sql, tuple(params)) if params else await fetch_all(sql)}

@router.get("/{template_key}")
async def get_prompt(template_key: str, version: int = None):
    if version:
        base = await fetch_one(
            "SELECT * FROM ai_prompt_templates WHERE template_key = $1", (template_key,))
        if not base:
            return {"error": "Prompt not found"}, 404
        ver = await fetch_one(
            "SELECT * FROM ai_prompt_versions WHERE template_id = $1 AND version = $2",
            (base["id"], version))
        if ver:
            base["system_prompt"] = ver["system_prompt"]
            base["user_prompt"] = ver["user_prompt"]
            base["version"] = ver["version"]
        return {"prompt": base}
    else:
        p = await fetch_one(
            "SELECT * FROM ai_prompt_templates WHERE template_key = $1", (template_key,))
        if not p:
            return {"error": "Prompt not found"}, 404
        return {"prompt": p}
