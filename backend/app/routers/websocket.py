import json
import logging
import asyncio
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.orchestrator import DesignOrchestrator

logger = logging.getLogger("circuitmind")

router = APIRouter(prefix="/ws", tags=["WebSockets"])


class ConnectionManager:
    """
    Manages active WebSocket connections for streaming design telemetry.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def send_json(self, websocket: WebSocket, data: Dict[str, Any]):
        """Sends a JSON message frame to a specific connected client."""
        await websocket.send_text(json.dumps(data))


manager = ConnectionManager()
orchestrator = DesignOrchestrator()


@router.websocket("/design")
async def websocket_design_pipeline(websocket: WebSocket):
    """
    WebSocket endpoint that accepts user prompts and streams agent execution progress,
    SPICE metrics, and KiCad placement telemetry in real-time.
    """
    await manager.connect(websocket)

    try:
        while True:
            # 1. Receive incoming message from client
            raw_data = await websocket.receive_text()
            try:
                request = json.loads(raw_data)
                prompt = request.get("prompt", "")
                parameters = request.get("parameters", {})
            except json.JSONDecodeError:
                await manager.send_json(websocket, {
                    "stage": "ERROR",
                    "status": "FAILED",
                    "reasoning": "Invalid JSON format received."
                })
                continue

            if not prompt:
                await manager.send_json(websocket, {
                    "stage": "ERROR",
                    "status": "FAILED",
                    "reasoning": "Prompt cannot be empty."
                })
                continue

            logger.info(f"Initiating design pipeline for prompt: '{prompt}'")

            # 2. Frame 1: Connection acknowledgment & pipeline start
            await manager.send_json(websocket, {
                "stage": "PIPELINE_STARTED",
                "status": "IN_PROGRESS",
                "reasoning": f"Received engineering prompt: '{prompt}'. Initializing Multi-Agent DAG...",
                "payload": {}
            })

            # 3. Step-by-step execution stream
            # (In production, sub-agent telemetry streams as each step completes)
            try:
                results = await orchestrator.execute_design_request(prompt, parameters)

                for step_result in results:
                    # Stream individual agent telemetry frames
                    await manager.send_json(websocket, {
                        "stage": "AGENT_STEP_COMPLETE",
                        "agent_name": step_result.get("agent_name"),
                        "status": step_result.get("status"),
                        "reasoning": step_result.get("reasoning"),
                        "payload": step_result.get("payload"),
                        "execution_time_ms": step_result.get("execution_time_ms"),
                    })
                    # Brief delay to allow fluid frontend UI rendering updates
                    await asyncio.sleep(0.2)

                # 4. Pipeline Completion Frame
                await manager.send_json(websocket, {
                    "stage": "PIPELINE_COMPLETE",
                    "status": "SUCCESS",
                    "reasoning": "Full engineering pipeline completed successfully.",
                    "payload": {
                        "steps_completed": len(results)
                    }
                })

            except Exception as e:
                logger.error(f"Error during design pipeline execution: {str(e)}", exc_info=True)
                await manager.send_json(websocket, {
                    "stage": "PIPELINE_FAILED",
                    "status": "FAILED",
                    "reasoning": f"Pipeline execution halted due to error: {str(e)}",
                    "payload": {"error": str(e)}
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {str(e)}")
        manager.disconnect(websocket)
