import asyncio
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # mapping caseId -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, case_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(case_id, []).append(websocket)

    def disconnect(self, case_id: str, websocket: WebSocket):
        conns = self.active_connections.get(case_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_connections.pop(case_id, None)

    async def broadcast(self, case_id: str, message: dict):
        conns = list(self.active_connections.get(case_id, []))
        for conn in conns:
            try:
                await conn.send_json(message)
            except Exception:
                # ignore broken connections — they will be cleaned on disconnect
                pass

ws_manager = ConnectionManager()