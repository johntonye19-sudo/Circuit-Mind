from fastapi import APIRouter, HTTPException, status
from app.domain.models.netlist import GenerateNetlistRequest, NetlistSpec
from app.domain.agents.netlist_synthesizer import NetlistSynthesizerAgent

router = APIRouter()
synthesizer_agent = NetlistSynthesizerAgent()

@router.post("/synthesize", response_model=NetlistSpec, status_code=status.HTTP_201_CREATED)
async def generate_netlist(request: GenerateNetlistRequest):
    try:
        netlist = await synthesizer_agent.synthesize_buck_converter(
            project_id=request.project_id,
            vin=request.input_voltage_v,
            vout=request.output_voltage_v,
            power=request.power_watts
        )
        return netlist
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Netlist synthesis failure: {str(e)}")
