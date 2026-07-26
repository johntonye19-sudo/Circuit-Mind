import time
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("circuitmind")


class AgentResult(BaseModel):
    """
    Unified output contract for all CircuitMind autonomous agents.
    Ensures consistent parsing by the DesignOrchestrator and frontend WebSocket handlers.
    """
    agent_name: str = Field(..., description="The unique name/identifier of the agent.")
    status: str = Field(
        ..., 
        description="Execution status outcome: 'SUCCESS', 'WARNING', or 'FAILED'."
    )
    reasoning: str = Field(
        ..., 
        description="Self-reflective engineering explanation or chain-of-thought justification."
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Domain-specific outputs (e.g., netlist string, simulation metrics, component placements)."
    )
    execution_time_ms: float = Field(
        default=0.0, 
        description="Wall-clock execution duration in milliseconds."
    )

    class Config:
        arbitrary_types_allowed = True


class BaseAgent:
    """
    Abstract base class for all engineering agents in CircuitMind.
    Provides execution timing, logging, and exception resilience.
    """
    def __init__(self, name: str):
        self.name = name

    async def execute(self, input_data: Dict[str, Any]) -> AgentResult:
        """
        Public execution wrapper that measures execution time and catches unhandled exceptions.
        Subclasses should implement `_run_internal` instead of overriding `execute`.
        """
        start_time = time.perf_counter()
        logger.info(f"[{self.name}] Starting execution...")

        try:
            result = await self._run_internal(input_data)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            result.execution_time_ms = duration_ms
            logger.info(f"[{self.name}] Completed successfully in {duration_ms}ms")
            return result

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(f"[{self.name}] Failed with error: {str(e)}", exc_info=True)
            return AgentResult(
                agent_name=self.name,
                status="FAILED",
                reasoning=f"Unhandled agent exception: {str(e)}",
                payload={"error": str(e)},
                execution_time_ms=duration_ms,
            )

    async def _run_internal(self, input_data: Dict[str, Any]) -> AgentResult:
        """
        Internal implementation method. Must be overridden by every sub-agent subclass.
        """
        raise NotImplementedError("Subclasses must implement `_run_internal`.")

    async def run(self, input_data: Dict[str, Any]) -> AgentResult:
        """
        Convenience alias for `execute`.
        """
        return await self.execute(input_data)
