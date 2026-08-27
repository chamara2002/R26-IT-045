"""
Mastitis Severity Classification Engine
Classifies mastitis severity based on clinical biomarkers and farmer symptom observations.
Model confidence is completely decoupled from clinical severity calculation.
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.symptom_assessor import evaluate_symptoms, SYMPTOM_WEIGHTS


class MastitisSeverityEngine:
    """Classify mastitis severity using clinical biomarkers and symptom checklists."""

    # Severity levels
    SEVERITY_LEVELS = {
        'negative': {'code': 0, 'label': 'No Mastitis'},
        'mild': {'code': 1, 'label': 'Mild Mastitis'},
        'moderate': {'code': 2, 'label': 'Moderate Mastitis'},
        'severe': {'code': 3, 'label': 'Severe Mastitis'},
        'insufficient_data': {'code': None, 'label': 'Insufficient Clinical Data'}
    }

    def __init__(self):
        self.path_a_weights = {
            'conductivity': 0.40,
            'symptoms': 0.35,
            'temperature': 0.25,
        }
        self.path_b_weights = {
            'symptoms': 1.00,
        }

    def conductivity_score(self, conductivity_value: Optional[Any]) -> float:
        """
        Calculate electrical conductivity severity score (0.0 to 1.0).
        Normal range: 4.0 - 5.5 mS/cm.
        Elevated conductivity indicates ion leakage (Na+, Cl-) from damaged mammary epithelial tissue.

        Threshold bands (Reasonable working thresholds based on veterinary dairy physiology;
        flagged as an area for future empirical veterinary clinical validation):
          - <= 5.5 mS/cm (normal): 0.0
          - 5.5 - 7.0 mS/cm (mild elevation): 0.35
          - 7.0 - 9.0 mS/cm (moderate elevation): 0.70
          - > 9.0 mS/cm (high elevation / severe damage): 1.0
        """
        if conductivity_value is None:
            return 0.0
        try:
            cond = float(conductivity_value)
            if cond <= 5.5:
                return 0.0
            elif cond <= 7.0:
                return 0.35
            elif cond <= 9.0:
                return 0.70
            else:
                return 1.0
        except (ValueError, TypeError):
            return 0.0

    def temperature_score(self, temp_celsius: Optional[Any]) -> float:
        """
        Calculate body/milk temperature severity score (0.0 to 1.0).

        Threshold bands:
          - < 38.5°C (normal bovine temp): 0.0
          - 38.5 - 39.2°C (mild elevation): 0.35
          - 39.2 - 40.0°C (moderate fever / systemic reaction): 0.70
          - >= 40.0°C (high fever / critical systemic mastitis): 1.0
        """
        if temp_celsius is None:
            return 0.0
        try:
            temp = float(temp_celsius)
            if temp < 38.5:
                return 0.0
            elif temp < 39.2:
                return 0.35
            elif temp < 40.0:
                return 0.70
            else:
                return 1.0
        except (ValueError, TypeError):
            return 0.0

    def symptom_score(self, symptoms_dict: Optional[Dict[str, Any]]) -> float:
        """
        Calculate symptom checklist severity score (0.0 to 1.0) using canonical checklist weights.
        """
        score, _, _ = evaluate_symptoms(symptoms_dict)
        return score

    def classify_severity(
        self,
        prediction_label: int,
        prediction_confidence: Optional[float] = None,
        health_metrics: Optional[Dict[str, Any]] = None,
        symptoms_dict: Optional[Dict[str, Any]] = None,
        model_2_used: bool = False,
        conductivity_value: Optional[Any] = None,
        symptoms: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Classify mastitis severity.

        Args:
            prediction_label: 0 (normal) or 1 (mastitis)
            prediction_confidence: Float between 0 and 1 (Ignored for severity calculation; kept for backward compatibility)
            health_metrics: Dict with keys like 'temperature' / 'conductivity'
            symptoms_dict: Dict with farmer symptom checklist answers
            model_2_used: True if all 5 biomarkers were provided and Model 2 ran (Path A)
            conductivity_value: Optional explicit conductivity measurement
            symptoms: Alias for symptoms_dict

        Returns:
            Dict with severity classification, scores, and recommendations
        """
        symptoms_data = symptoms_dict if symptoms_dict is not None else symptoms
        health_metrics = health_metrics or {}

        if prediction_label == 0:
            # No mastitis / Normal
            return {
                'severity_level': 'negative',
                'severity_code': 0,
                'severity_label': 'No Mastitis',
                'confidence_score': 0.0,
                'severity_score': 0.0,
                'recommendation': 'No mastitis detected. Continue routine udder hygiene and monitor the cow regularly.',
                'action': 'none',
                'path_used': 'path_a' if model_2_used else 'path_b',
                'clinical_rationale': 'No mastitis detected — clinical severity not applicable.',
                'clinical_rationale_si': 'මැස්ටයිටිස් රෝග තත්ත්වයක් හඳුනාගෙන නොමැත — සායනික අවදානම් මට්ටමක් අදාළ නොවේ.',
                'breakdown': {'path': 'path_a' if model_2_used else 'path_b', 'status': 'negative'}
            }

        # Extract temperature and conductivity from parameters or health_metrics
        temp_val = (
            health_metrics.get('temperature') or
            health_metrics.get('Milk_Temperature') or
            health_metrics.get('Temperature') or
            health_metrics.get('body_temperature')
        )

        cond_val = (
            conductivity_value if conductivity_value is not None else
            (
                health_metrics.get('conductivity') or
                health_metrics.get('Milk_Conductivity') or
                health_metrics.get('Conductivity')
            )
        )

        symptom_names_en = {
            "milk_has_clots": "milk clots",
            "milk_color_changed": "abnormal milk color",
            "udder_feels_warm": "warm udder",
            "udder_swollen": "swollen udder",
            "milk_yield_dropped": "milk yield drop",
            "cow_uneasy_during_milking": "discomfort during milking",
        }
        symptom_names_si = {
            "milk_has_clots": "කිරි කැටි",
            "milk_color_changed": "කිරි වල වර්ණය වෙනස්වීම",
            "udder_feels_warm": "බුරුල්ල උණුසුම්වීම",
            "udder_swollen": "බුරුල්ල ඉදිමීම",
            "milk_yield_dropped": "කිරි අස්වැන්න අඩුවීම",
            "cow_uneasy_during_milking": "දොවන විට වේදනාව",
        }

        # Route by data availability path
        if model_2_used:
            # PATH A — all 5 numerical biomarkers provided and Model 2 ran
            c_score = self.conductivity_score(cond_val)
            s_score, symptoms_reported, _ = evaluate_symptoms(symptoms_data)
            t_score = self.temperature_score(temp_val)

            severity_score = round(
                (c_score * self.path_a_weights['conductivity']) +
                (s_score * self.path_a_weights['symptoms']) +
                (t_score * self.path_a_weights['temperature']),
                4
            )
            path_used = 'path_a'

            # Format clinical rationale
            cond_str = f"{float(cond_val):.1f} mS/cm" if cond_val not in (None, "") else "measured"
            temp_str = f"{float(temp_val):.1f}°C" if temp_val not in (None, "") else "measured"
            cond_status_en = "Elevated Milk Conductivity" if c_score > 0.3 else "Normal Milk Conductivity"
            temp_status_en = "Elevated Temperature" if t_score > 0.3 else "Normal Temperature"
            cond_status_si = "ඉහළ කිරි සන්නායකතාව" if c_score > 0.3 else "සාමාන්‍ය කිරි සන්නායකතාව"
            temp_status_si = "ඉහළ උෂ්ණත්වය" if t_score > 0.3 else "සාමාන්‍ය උෂ්ණත්වය"

            if symptoms_reported:
                s_items_en = [symptom_names_en.get(s, s) for s in symptoms_reported]
                s_items_si = [symptom_names_si.get(s, s) for s in symptoms_reported]
                sym_str_en = f"{len(symptoms_reported)} clinical symptom{'s' if len(symptoms_reported) > 1 else ''} reported ({', '.join(s_items_en)})"
                sym_str_si = f"වාර්තා වූ රෝග ලක්ෂණ {len(symptoms_reported)} ක් ({', '.join(s_items_si)})"
            else:
                sym_str_en = "0 clinical symptoms reported"
                sym_str_si = "වාර්තා වූ රෝග ලක්ෂණ නොමැත"

            rationale_en = f"Severity calculated via biomarker + symptom assessment (Path A): {cond_status_en} ({cond_str}), {temp_status_en} ({temp_str}), and {sym_str_en}."
            rationale_si = f"ජෛව දත්ත සහ රෝග ලක්ෂණ ඇගයීම මඟින් අවදානම තීරණය විය (ජෛව දත්ත ක්‍රමය): {cond_status_si} ({cond_str}), {temp_status_si} ({temp_str}) සහ {sym_str_si}."

            breakdown = {
                'path': 'path_a',
                'conductivity': {'value': cond_val, 'score': c_score, 'weight': self.path_a_weights['conductivity']},
                'temperature': {'value': temp_val, 'score': t_score, 'weight': self.path_a_weights['temperature']},
                'symptoms': {'score': s_score, 'weight': self.path_a_weights['symptoms'], 'reported': symptoms_reported, 'count': len(symptoms_reported)}
            }
        else:
            # PATH B — image + symptom checklist only, or partial/no biomarkers
            s_score, symptoms_reported, has_answered = evaluate_symptoms(symptoms_data)

            if not has_answered:
                # No clinical signal available to determine severity stage
                return {
                    'severity_level': 'insufficient_data',
                    'severity_code': None,
                    'severity_label': 'Insufficient Clinical Data',
                    'confidence_score': None,
                    'severity_score': None,
                    'recommendation': (
                        'Insufficient clinical detail to determine severity stage — '
                        'please answer the symptom checklist or provide biomarker '
                        'measurements for a more accurate severity assessment.'
                    ),
                    'action': 'gather_data',
                    'path_used': 'path_b',
                    'clinical_rationale': 'Insufficient clinical data — biomarkers not provided and zero symptoms answered to determine severity tier.',
                    'clinical_rationale_si': 'ප්‍රමාණවත් සායනික දත්ත නොමැත — අවදානම් මට්ටම තීරණය කිරීමට ජෛව දත්ත හෝ රෝග ලක්ෂණ තොරතුරු ලබාදී නොමැත.',
                    'breakdown': {'path': 'path_b', 'status': 'insufficient_data'}
                }

            severity_score = round(s_score * self.path_b_weights['symptoms'], 4)
            path_used = 'path_b'

            if symptoms_reported:
                s_items_en = [symptom_names_en.get(s, s) for s in symptoms_reported]
                s_items_si = [symptom_names_si.get(s, s) for s in symptoms_reported]
                sym_str_en = f"{len(symptoms_reported)} clinical symptom{'s' if len(symptoms_reported) > 1 else ''} reported ({', '.join(s_items_en)})"
                sym_str_si = f"වාර්තා වූ රෝග ලක්ෂණ {len(symptoms_reported)} ක් ({', '.join(s_items_si)})"
            else:
                sym_str_en = "symptom checklist answered (all negative)"
                sym_str_si = "රෝග ලක්ෂණ ප්‍රශ්නාවලිය සම්පූර්ණයි (රෝග ලක්ෂණ වාර්තා වී නැත)"

            rationale_en = f"Severity calculated via farmer symptom checklist (Path B, biomarkers not provided): {sym_str_en}."
            rationale_si = f"ගොවි රෝග ලක්ෂණ ප්‍රශ්නාවලිය මඟින් අවදානම තීරණය විය (රෝග ලක්ෂණ ක්‍රමය, ජෛව දත්ත ලබාදී නැත): {sym_str_si}."

            breakdown = {
                'path': 'path_b',
                'symptoms': {'score': s_score, 'weight': self.path_b_weights['symptoms'], 'reported': symptoms_reported, 'count': len(symptoms_reported)}
            }

        # Classify severity tier based on score
        if severity_score < 0.50:
            severity_level = 'mild'
            recommendation = (
                'Mild mastitis indicators detected. Monitor the cow closely and maintain '
                'strict udder and milking hygiene. Do not start antibiotics without veterinary direction.'
            )
            action = 'monitor'
        elif severity_score < 0.80:
            severity_level = 'moderate'
            recommendation = (
                'Moderate mastitis indicators detected. Veterinary consultation is recommended. '
                'Monitor the cow closely and follow appropriate veterinary/farm protocols.'
            )
            action = 'treat'
        else:
            severity_level = 'severe'
            recommendation = (
                'CRITICAL VETERINARY ATTENTION REQUIRED. The assessment identified findings '
                'associated with severe/systemic mastitis. Contact a licensed veterinarian immediately.'
            )
            action = 'urgent'

        return {
            'severity_level': severity_level,
            'severity_code': self.SEVERITY_LEVELS[severity_level]['code'],
            'severity_label': self.SEVERITY_LEVELS[severity_level]['label'],
            'confidence_score': severity_score,
            'severity_score': severity_score,
            'recommendation': recommendation,
            'action': action,
            'path_used': path_used,
            'clinical_rationale': rationale_en,
            'clinical_rationale_si': rationale_si,
            'breakdown': breakdown,
        }

    def get_treatment_protocol(self, severity_level: str) -> Dict[str, Any]:
        """Get treatment recommendations for severity level."""
        protocols = {
            'negative': {
                'action': 'Routine Prevention',
                'frequency': 'Daily',
                'measures': [
                    'Maintain clean and dry bedding in housing areas',
                    'Ensure udder and teats are clean and dry prior to milking',
                    'Apply effective post-milking teat disinfectant dip',
                    'Monitor daily milk yield and appearance'
                ]
            },
            'mild': {
                'action': 'Hygiene Escalation & Close Monitoring',
                'frequency': 'Every milking (Twice Daily)',
                'measures': [
                    'Milk affected cow/quarter last or with dedicated equipment',
                    'Maintain strict udder and bedding cleanliness',
                    'Monitor milk appearance, yield, and quarter temperature',
                    'Do not administer antibiotics without veterinary direction'
                ]
            },
            'moderate': {
                'action': 'Veterinary Consultation Recommended',
                'frequency': 'Every 8–12 hours',
                'measures': [
                    'Contact attending veterinarian for clinical assessment and advice',
                    'Segregate affected milk and follow farm protocol',
                    'Record symptoms, milk yield changes, and body temperature',
                    'Avoid independent medication or unprescribed infusions'
                ]
            },
            'severe': {
                'action': 'Urgent Veterinary Examination',
                'frequency': 'Immediate & Continuous',
                'measures': [
                    'URGENT: Contact licensed veterinarian immediately',
                    'Keep cow under close observation in clean, quiet, deeply bedded stall',
                    'Follow veterinary directions regarding isolation and milk withholding',
                    'Provide complete CattleSense Veterinary Report to attending veterinarian',
                    'Do not independently administer prescription medicines'
                ]
            },
            'insufficient_data': {
                'action': 'Collect Clinical Details',
                'frequency': 'Next Observation',
                'measures': [
                    'Complete the 6-question symptom checklist for an initial clinical score',
                    'Measure milk temperature and electrical conductivity if testing tools are available',
                    'Inspect udder quarters for swelling, firmness, heat, or localized pain',
                    'Contact veterinary services if cow exhibits distress or severe swelling'
                ]
            }
        }
        return protocols.get(severity_level, protocols['negative'])


if __name__ == '__main__':
    engine = MastitisSeverityEngine()

    # Test with different scenarios
    test_cases = [
        # Normal
        {'label': 0, 'confidence': 0.9, 'metrics': {'temperature': 38.5, 'conductivity': 4.8}, 'symptoms': {}, 'model_2_used': True},
        # Path A - Mild
        {'label': 1, 'confidence': 0.95, 'metrics': {'temperature': 38.6, 'conductivity': 5.2}, 'symptoms': {}, 'model_2_used': True},
        # Path A - Severe
        {'label': 1, 'confidence': 0.55, 'metrics': {'temperature': 40.2, 'conductivity': 9.5}, 'symptoms': {'udder_swollen': True, 'milk_has_clots': True}, 'model_2_used': True},
        # Path B - 1 mild symptom
        {'label': 1, 'confidence': 0.98, 'metrics': {}, 'symptoms': {'milk_color_changed': True}, 'model_2_used': False},
        # Path B - 5 severe symptoms
        {'label': 1, 'confidence': 0.52, 'metrics': {}, 'symptoms': {'udder_swollen': True, 'milk_has_clots': True, 'udder_feels_warm': True, 'milk_color_changed': True, 'milk_yield_dropped': True}, 'model_2_used': False},
        # Path B - No symptoms answered
        {'label': 1, 'confidence': 0.95, 'metrics': {}, 'symptoms': None, 'model_2_used': False},
    ]

    for i, test in enumerate(test_cases):
        result = engine.classify_severity(
            prediction_label=test['label'],
            prediction_confidence=test['confidence'],
            health_metrics=test['metrics'],
            symptoms_dict=test['symptoms'],
            model_2_used=test['model_2_used']
        )
        print(f"\nTest Case {i+1}:")
        print(f"  Severity: {result['severity_label']} ({result['severity_level']})")
        print(f"  Score: {result['severity_score']}")
        print(f"  Path: {result.get('path_used')}")
        print(f"  Recommendation: {result['recommendation']}")

