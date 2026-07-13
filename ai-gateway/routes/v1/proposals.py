from fastapi import APIRouter, HTTPException
from engine.contract import AIRequest
from engine.gateway import process_request
from db.connection import fetch_one, fetch_all, execute
from datetime import datetime, timezone

router = APIRouter(prefix="/v1/proposals")

@router.post("")
async def create_proposal(req: AIRequest):
    if not req.company_id:
        raise HTTPException(status_code=422, detail="company_id required")
    if not req.capability:
        req.capability = "generate_proposal"

    result = await process_request(req)
    if not result.get("success"):
        return result

    proposal_data = result.get("result", {})
    if proposal_data and isinstance(proposal_data, dict) and proposal_data.get("title"):
        await execute(
            "INSERT INTO proposals (company_id, title, content, status, metadata) VALUES ($1, $2, $3::jsonb, 'draft', $4::jsonb)",
            (req.company_id, proposal_data.get("title", "Proposal"), proposal_data,
             {"generated_by": "ai-gateway-v1", "model": result.get("model")}),
        )

    return result

@router.get("/{company_id}")
async def list_proposals(company_id: str):
    rows = await fetch_all(
        "SELECT id, company_id, title, status, estimated_value, created_at "
        "FROM proposals WHERE company_id = $1 ORDER BY created_at DESC",
        (company_id,),
    )
    return {"proposals": rows}

@router.get("/{company_id}/{proposal_id}")
async def get_proposal(company_id: str, proposal_id: str):
    row = await fetch_one(
        "SELECT * FROM proposals WHERE id = $1 AND company_id = $2",
        (proposal_id, company_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"proposal": row}
