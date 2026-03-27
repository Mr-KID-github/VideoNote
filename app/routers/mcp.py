"""
HTTP-accessible MCP router for LAN deployments.
"""
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from app.services.mcp_service import mcp_server

router = APIRouter(tags=["mcp"])


@router.get("/mcp")
def get_mcp_info():
    return {
        "name": "vinote",
        "transport": "http-jsonrpc",
        "endpoint": "/mcp",
        "message": "Send JSON-RPC POST requests to this endpoint.",
    }


@router.post("/mcp")
async def post_mcp_request(request: Request):
    try:
        payload = await request.json()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.") from exc

    if not isinstance(payload, (dict, list)):
        raise HTTPException(status_code=400, detail="MCP payload must be a JSON object or array.")

    response = mcp_server.handle_payload(payload)
    if response is None:
        return JSONResponse(status_code=202, content={})
    return JSONResponse(content=response)
