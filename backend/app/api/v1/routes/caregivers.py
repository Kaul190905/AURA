from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect
from typing import List, Dict
from uuid import UUID

from app.core.security import get_current_user
from app.api.dependencies.services import get_caregiver_service, get_sensor_data_service, get_alert_service, get_wellness_service, get_strategy_service, get_accommodation_service, get_user_service
from app.services.caregiver_service import CaregiverService
from app.schemas.caregiver import CaregiverInviteRequest, CaregiverResponse, CaregiverUpdate
from app.api.dependencies.caregiver import require_active_caregiver_access, require_caregiver_permission

# Need to import existing schemas to return data to caregivers
# from app.schemas.sensor_data import SensorDataResponse
# etc. Let's just return dict or any if schemas aren't explicitly imported, or rely on service layer return types.

router = APIRouter()

# ---------------------------------------------------------
# NORMAL USER ROUTES (Managing their caregivers)
# ---------------------------------------------------------

@router.post("/", response_model=CaregiverResponse, status_code=status.HTTP_201_CREATED)
async def invite_caregiver(
    invite_req: CaregiverInviteRequest,
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.invite_caregiver(current_user.id, invite_req.email)

@router.get("/", response_model=List[CaregiverResponse])
async def list_caregivers(
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.get_user_caregivers(current_user.id)

@router.patch("/{assignment_id}", response_model=CaregiverResponse)
async def update_caregiver_permissions(
    assignment_id: UUID,
    update_data: CaregiverUpdate,
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.update_permissions(current_user.id, assignment_id, update_data)

@router.delete("/{assignment_id}", response_model=CaregiverResponse)
async def revoke_caregiver(
    assignment_id: UUID,
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.revoke_caregiver(current_user.id, assignment_id)

# ---------------------------------------------------------
# CAREGIVER ROUTES (Managing their own assignments)
# ---------------------------------------------------------

@router.get("/assigned", response_model=List[CaregiverResponse])
async def list_assigned_users(
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.get_assigned_users(current_user.id)

@router.get("/pending", response_model=List[CaregiverResponse])
async def list_pending_invitations(
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.get_pending_invitations(current_user.id, current_user.email)

@router.post("/{assignment_id}/accept", response_model=CaregiverResponse)
async def accept_invitation(
    assignment_id: UUID,
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    return await caregiver_service.accept_invitation(current_user.id, assignment_id)

@router.post("/{assignment_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_invitation(
    assignment_id: UUID,
    current_user = Depends(get_current_user),
    caregiver_service: CaregiverService = Depends(get_caregiver_service)
):
    await caregiver_service.reject_invitation(current_user.id, assignment_id)
    return None

# ---------------------------------------------------------
# CAREGIVER DATA ACCESS ROUTES (Strictly READ-ONLY GET)
# ---------------------------------------------------------

# Note: We rely on the existing services but pass the `target_user_id` 
# which is authenticated via `require_active_caregiver_access`.

@router.get("/users/{target_user_id}/sensor-data")
async def get_user_sensor_data(
    target_user_id: UUID,
    assignment = Depends(require_active_caregiver_access),
    sensor_data_service = Depends(get_sensor_data_service)
):
    return await sensor_data_service.get_history(user_id=target_user_id)

@router.get("/users/{target_user_id}/alerts")
async def get_user_alerts(
    target_user_id: UUID,
    assignment = Depends(require_active_caregiver_access),
    alert_service = Depends(get_alert_service)
):
    return await alert_service.get_alerts(user_id=target_user_id)

@router.get("/users/{target_user_id}/wellness")
async def get_user_wellness(
    target_user_id: UUID,
    assignment = Depends(require_active_caregiver_access),
    wellness_service = Depends(get_wellness_service)
):
    return await wellness_service.get_recent_checkins(target_user_id)

@router.get("/users/{target_user_id}/strategies")
async def get_user_strategies(
    target_user_id: UUID,
    assignment = Depends(require_active_caregiver_access),
    strategy_service = Depends(get_strategy_service)
):
    return await strategy_service.get_user_strategies(target_user_id)

@router.get("/users/{target_user_id}/accommodations")
async def get_user_accommodations(
    target_user_id: UUID,
    assignment = Depends(require_active_caregiver_access),
    accommodation_service = Depends(get_accommodation_service)
):
    return await accommodation_service.get_user_accommodations(target_user_id)

# ---------------------------------------------------------
# SENSITIVE DATA ROUTES
# ---------------------------------------------------------

@router.get("/users/{target_user_id}/preferences")
async def get_user_preferences(
    target_user_id: UUID,
    assignment = Depends(require_caregiver_permission("can_view_preferences")),
    user_service = Depends(get_user_service)
):
    return await user_service.get_user_by_id(target_user_id)

# ---------------------------------------------------------
# REAL-TIME IOT DATA WEBSOCKET
# ---------------------------------------------------------

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

@router.websocket("/ws/{target_user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    target_user_id: UUID,
    # In a real app we'd authenticate the WS token here
):
    await manager.connect(websocket, target_user_id)
    try:
        while True:
            # We expect to receive data from the IoT device or similar here, 
            # and we broadcast it to the connected caregivers.
            data = await websocket.receive_json()
            await manager.broadcast_to_caregivers(target_user_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, target_user_id)
