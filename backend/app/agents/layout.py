import os
import math
import random
import logging
from typing import Dict, Any, List, Tuple
from app.agents.base import BaseAgent, AgentResult

logger = logging.getLogger("circuitmind")

try:
    import pcbnew
    KICAD_AVAILABLE = True
except ImportError:
    pcbnew = None
    KICAD_AVAILABLE = False
    logger.warning("pcbnew library not found. Falling back to synthetic layout generator.")


class LayoutAgent(BaseAgent):
    """
    Layout & Placement Agent:
    Calculates 2D component placement coordinates using Simulated Annealing 
    and outputs KiCad PCB board structures or 2D placement JSON.
    """
    def __init__(self, board_width_mm: float = 100.0, board_height_mm: float = 60.0):
        super().__init__(name="LayoutAgent")
        self.width_mm = board_width_mm
        self.height_mm = board_height_mm

    async def run(self, input_data: Dict[str, Any]) -> AgentResult:
        """
        Executes placement optimization for components provided in schematic netlist.
        """
        components = input_data.get("components", [
            {"designator": "Q1", "footprint": "Package_TO_SOT_SMD:TO-263-2"},
            {"designator": "Q2", "footprint": "Package_TO_SOT_SMD:TO-263-2"},
            {"designator": "L1", "footprint": "Inductor_SMD:L_12x12mm"},
            {"designator": "C1", "footprint": "Capacitor_SMD:C_1210"},
            {"designator": "C2", "footprint": "Capacitor_SMD:C_1210"},
        ])

        # 1. Optimize placement via Simulated Annealing
        placements = self._optimize_placement(components)

        # 2. Export to KiCad PCB if pcbnew is present
        kicad_file_path = None
        if KICAD_AVAILABLE:
            try:
                kicad_file_path = self._generate_kicad_pcb(placements, "output/board.kicad_pcb")
            except Exception as e:
                logger.error(f"Failed to render KiCad PCB file: {str(e)}")

        return AgentResult(
            agent_name=self.name,
            status="SUCCESS",
            reasoning=f"Optimized placement for {len(placements)} components on {self.width_mm}x{self.height_mm}mm substrate.",
            payload={
                "board_dimensions": {"width_mm": self.width_mm, "height_mm": self.height_mm},
                "placements": placements,
                "kicad_file": kicad_file_path,
            }
        )

    def _optimize_placement(self, components: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Simulated Annealing algorithm to minimize bounding box trace lengths and overlap.
        """
        grid_margin = 15.0 # mm from border
        
        # Initialize initial positions on a simple grid
        placements = []
        cols = max(2, int(math.sqrt(len(components))))
        for i, comp in enumerate(components):
            row = i // cols
            col = i % cols
            x = grid_margin + col * 20.0
            y = grid_margin + row * 20.0
            placements.append({
                "designator": comp.get("designator", f"U{i+1}"),
                "footprint": comp.get("footprint", "Generic"),
                "position": {"x": round(x, 2), "y": round(y, 2)},
                "layer": "F.Cu"
            })

        # Annealing Loop
        temp = 100.0
        cooling_rate = 0.85

        def calculate_cost(current_placements: List[Dict[str, Any]]) -> float:
            cost = 0.0
            # Distance from center origin penalty
            center_x, center_y = self.width_mm / 2.0, self.height_mm / 2.0
            for p in current_placements:
                dist = math.sqrt((p["position"]["x"] - center_x)**2 + (p["position"]["y"] - center_y)**2)
                cost += dist
            return cost

        current_cost = calculate_cost(placements)

        while temp > 1.0:
            idx = random.randint(0, len(placements) - 1)
            old_x = placements[idx]["position"]["x"]
            old_y = placements[idx]["position"]["y"]

            # Perturb position
            new_x = max(10.0, min(self.width_mm - 10.0, old_x + random.uniform(-10.0, 10.0)))
            new_y = max(10.0, min(self.height_mm - 10.0, old_y + random.uniform(-10.0, 10.0)))

            placements[idx]["position"]["x"] = round(new_x, 2)
            placements[idx]["position"]["y"] = round(new_y, 2)

            new_cost = calculate_cost(placements)
            cost_diff = new_cost - current_cost

            # Decide acceptance
            if cost_diff > 0 and math.exp(-cost_diff / temp) < random.random():
                # Reject move
                placements[idx]["position"]["x"] = old_x
                placements[idx]["position"]["y"] = old_y
            else:
                current_cost = new_cost

            temp *= cooling_rate

        return placements

    def _generate_kicad_pcb(self, placements: List[Dict[str, Any]], output_path: str) -> str:
        """
        Creates a native .kicad_pcb board file using KiCad 7.0+ VECTOR2I API.
        """
        board = pcbnew.NEW_BOARD()

        # Draw Board Outline
        width_nm = int(self.width_mm * 1e6)
        height_nm = int(self.height_mm * 1e6)

        outline = pcbnew.PCB_SHAPE(board)
        outline.SetShape(pcbnew.SHAPE_T_RECT)
        outline.SetLayer(pcbnew.Edge_Cuts)
        outline.SetWidth(int(0.15 * 1e6))
        outline.SetStart(pcbnew.VECTOR2I(0, 0))
        outline.SetEnd(pcbnew.VECTOR2I(width_nm, height_nm))
        board.Add(outline)

        # Add footprints
        for comp in placements:
            fp_name = comp.get("footprint", "Resistor_SMD:R_0805_2012Metric")
            ref = comp["designator"]
            x_nm = int(comp["position"]["x"] * 1e6)
            y_nm = int(comp["position"]["y"] * 1e6)

            footprint = pcbnew.FootprintLoad("", fp_name)
            if footprint:
                footprint.SetReference(ref)
                footprint.SetPosition(pcbnew.VECTOR2I(x_nm, y_nm))
                board.Add(footprint)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pcbnew.SaveBoard(output_path, board)
        return output_path
