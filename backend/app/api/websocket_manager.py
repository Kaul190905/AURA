from typing import List, Dict
from uuid import UUID
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps target_user_id to a list of connected caregiver WebSockets
        self.active_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, target_user_id: UUID):
        await websocket.accept()
        if target_user_id not in self.active_connections:
            self.active_connections[target_user_id] = []
        self.active_connections[target_user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, target_user_id: UUID):
        if target_user_id in self.active_connections:
            self.active_connections[target_user_id].remove(websocket)
            if not self.active_connections[target_user_id]:
                del self.active_connections[target_user_id]

    async def broadcast_to_caregivers(self, target_user_id: UUID, message: dict):
        if target_user_id in self.active_connections:
            for connection in self.active_connections[target_user_id]:
                await connection.send_json(message)

manager = ConnectionManager()
