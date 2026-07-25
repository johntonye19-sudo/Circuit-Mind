from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4

class Connection(BaseModel):
    from_ref: str = Field(..., description="Component Reference Designator (e.g. Q1)")
    from_pin: str = Field(..., description="Pin Number or Name (e.g. 1 or DRAIN)")
    to_ref: str = Field(..., description="Target Reference Designator (e.g. L1)")
    to_pin: str = Field(..., description="Target Pin Number or Name (e.g. 1)")

class Net(BaseModel):
    name: str = Field(..., description="Net identifier name (e.g. VIN, SW, GND)")
    connections: List[Connection]

class ComponentInstance(BaseModel):
    refdes: str = Field(..., description="Reference Designator (e.g. Q1, C1, L1)")
    mpn: str = Field(..., description="Manufacturer Part Number")
    manufacturer: str
    value: Optional[str] = None
    footprint: str
    parameters: Dict[str, Any] = {}

class NetlistSpec(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    version: int = 1
    components: List[ComponentInstance]
    nets: List[Net]

class GenerateNetlistRequest(BaseModel):
    project_id: UUID
    prompt: str
    input_voltage_v: float
    output_voltage_v: float
    power_watts: float
