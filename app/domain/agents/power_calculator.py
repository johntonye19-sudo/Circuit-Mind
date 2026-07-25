import math
from typing import Dict, Any

class PowerElectronicsAgent:
    """Calculates operational electrical boundaries and component rating targets."""

    async def calculate_buck_parameters(self, vin: float, vout: float, power: float) -> Dict[str, Any]:
        if vin <= vout:
            raise ValueError("Input voltage must be greater than output voltage for a buck converter.")

        i_out = power / vout
        duty_cycle = vout / vin
        f_sw = 500_000  # 500 kHz switching frequency (GaN default)

        # Allowable inductor current ripple (30% of max Iout)
        delta_i = 0.3 * i_out
        
        # L = (Vout * (Vin - Vout)) / (f_sw * Delta_I * Vin)
        inductance_h = (vout * (vin - vout)) / (f_sw * delta_i * vin)
        inductance_uH = inductance_h * 1e6

        # Output capacitance for 1% peak-to-peak ripple
        v_ripple = 0.01 * vout
        capacitance_farads = delta_i / (8 * f_sw * v_ripple)
        capacitance_uF = capacitance_farads * 1e6

        return {
            "duty_cycle": round(duty_cycle, 4),
            "output_current_a": round(i_out, 2),
            "switching_frequency_hz": f_sw,
            "target_inductance_uH": round(inductance_uH, 2),
            "min_inductor_current_rating_a": round(i_out * 1.3, 2),
            "target_output_capacitance_uF": round(capacitance_uF, 2),
            "primary_switch_min_vds": round(vin * 1.5, 1) # 50% voltage safety margin
        }
