# backend/routes/ws_routes.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ws_manager import ws_manager
import json

router = APIRouter()

@router.websocket("/ws/annotations/{case_id}")
async def annotations_ws(websocket: WebSocket, case_id: str, userId: str = Query(None)):
    await ws_manager.connect(case_id, websocket)
    try:
        await ws_manager.broadcast(case_id, {"type": "presence", "action": "join", "userId": userId})
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except Exception:
                continue
            await ws_manager.broadcast(case_id, msg)
    except WebSocketDisconnect:
        ws_manager.disconnect(case_id, websocket)
        await ws_manager.broadcast(case_id, {"type": "presence", "action": "leave", "userId": userId})
