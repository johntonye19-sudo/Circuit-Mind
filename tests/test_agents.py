import os
import sys
from pathlib import Path

import pytest
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.domain.agents.power_calculator import PowerElectronicsAgent
from app.domain.agents.netlist_synthesizer import NetlistSynthesizerAgent
from app.domain.models.netlist import GenerateNetlistRequest

@pytest.mark.asyncio
async def test_power_electronics_agent_calculations():
    agent = PowerElectronicsAgent()
    params = await agent.calculate_buck_parameters(vin=400.0, vout=48.0, power=1000.0)

    assert params["duty_cycle"] == 0.12
    assert params["output_current_a"] == 20.83
    assert params["target_inductance_uH"] > 0
    assert params["primary_switch_min_vds"] == 600.0

@pytest.mark.asyncio
async def test_netlist_synthesis():
    synthesizer = NetlistSynthesizerAgent()
    project_id = uuid4()
    
    netlist = await synthesizer.synthesize_buck_converter(
        project_id=project_id,
        vin=400.0,
        vout=48.0,
        power=1000.0
    )

    assert netlist.project_id == project_id
    assert len(netlist.components) == 6  # P_IN, P_OUT, Q1, Q2, L1, C_OUT1
    
    # Check SW_NODE connections
    sw_net = next(n for n in netlist.nets if n.name == "SW_NODE")
    assert len(sw_net.connections) == 2


def test_generate_netlist_request_rejects_invalid_voltage_relationship():
    with pytest.raises(ValueError):
        GenerateNetlistRequest(
            project_id=uuid4(),
            prompt="Design a buck converter",
            input_voltage_v=24.0,
            output_voltage_v=48.0,
            power_watts=100.0,
        )
