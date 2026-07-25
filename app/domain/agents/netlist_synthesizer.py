from uuid import UUID
from app.domain.models.netlist import NetlistSpec, ComponentInstance, Net, Connection
from app.domain.agents.power_calculator import PowerElectronicsAgent

class NetlistSynthesizerAgent:
    """Synthesizes deterministic hardware netlists based on design constraints."""

    def __init__(self):
        self.power_calculator = PowerElectronicsAgent()

    async def synthesize_buck_converter(
        self, project_id: UUID, vin: float, vout: float, power: float
    ) -> NetlistSpec:
        calc = await self.power_calculator.calculate_buck_parameters(vin, vout, power)

        # Build list of component instances including input/output connectors
        components = [
            ComponentInstance(
                refdes="P_IN",
                mpn="691210910002",
                manufacturer="Wurth Elektronik",
                value="2-Pin Terminal",
                footprint="TERM_BLOCK_1x02",
                parameters={"max_voltage": 600, "max_current": 30}
            ),
            ComponentInstance(
                refdes="P_OUT",
                mpn="691210910002",
                manufacturer="Wurth Elektronik",
                value="2-Pin Terminal",
                footprint="TERM_BLOCK_1x02",
                parameters={"max_voltage": 300, "max_current": 40}
            ),
            ComponentInstance(
                refdes="Q1",
                mpn="GS66508T",
                manufacturer="GaN Systems",
                footprint="GaN_PX",
                parameters={"type": "GaN FET", "vds_max": 650, "rds_on_mohm": 50}
            ),
            ComponentInstance(
                refdes="Q2",
                mpn="GS66508T",
                manufacturer="GaN Systems",
                footprint="GaN_PX",
                parameters={"type": "GaN FET", "vds_max": 650, "rds_on_mohm": 50}
            ),
            ComponentInstance(
                refdes="L1",
                mpn="SER2918H-153KL",
                manufacturer="Coilcraft",
                value=f"{calc['target_inductance_uH']}uH",
                footprint="IND_SER2918H",
                parameters={"inductance_uH": calc["target_inductance_uH"], "isat_a": calc["min_inductor_current_rating_a"]}
            ),
            ComponentInstance(
                refdes="C_OUT1",
                mpn="C1210C106K5RACAUTO",
                manufacturer="KEMET",
                value=f"{calc['target_output_capacitance_uF']}uF",
                footprint="CAP_1210",
                parameters={"capacitance_uF": calc["target_output_capacitance_uF"], "voltage_rating_v": vout * 2}
            )
        ]

        # Topology net connection graph
        nets = [
            Net(
                name="VIN",
                connections=[
                    Connection(from_ref="P_IN", from_pin="1", to_ref="Q1", to_pin="DRAIN")
                ]
            ),
            Net(
                name="SW_NODE",
                connections=[
                    Connection(from_ref="Q1", from_pin="SOURCE", to_ref="Q2", to_pin="DRAIN"),
                    Connection(from_ref="Q1", from_pin="SOURCE", to_ref="L1", to_pin="1")
                ]
            ),
            Net(
                name="VOUT",
                connections=[
                    Connection(from_ref="L1", from_pin="2", to_ref="C_OUT1", to_pin="1"),
                    Connection(from_ref="L1", from_pin="2", to_ref="P_OUT", to_pin="1")
                ]
            ),
            Net(
                name="GND",
                connections=[
                    Connection(from_ref="P_IN", from_pin="2", to_ref="Q2", to_pin="SOURCE"),
                    Connection(from_ref="Q2", from_pin="SOURCE", to_ref="C_OUT1", to_pin="2"),
                    Connection(from_ref="C_OUT1", from_pin="2", to_ref="P_OUT", to_pin="2")
                ]
            )
        ]

        return NetlistSpec(
            project_id=project_id,
            components=components,
            nets=nets
        )
