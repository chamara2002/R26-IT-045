"""
Mastitis Severity Classification Engine
Classifies mastitis severity based on prediction confidence and health metrics.
"""
import sys
from pathlib import Path
import numpy as np

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class MastitisSeverityEngine:
    """Classify mastitis severity."""
    
    # Severity levels
    SEVERITY_LEVELS = {
        'negative': {'code': 0, 'label': 'No Mastitis'},
        'mild': {'code': 1, 'label': 'Mild Mastitis'},
        'moderate': {'code': 2, 'label': 'Moderate Mastitis'},
        'severe': {'code': 3, 'label': 'Severe Mastitis'}
    }
    
    def __init__(self):
        self.feature_weights = {
            'prediction_confidence': 0.7,
            'temperature': 0.3,
        }
    
    def classify_severity(self, prediction_label, prediction_confidence, health_metrics=None):
        """
        Classify mastitis severity.
        
        Args:
            prediction_label: 0 (normal) or 1 (mastitis)
            prediction_confidence: Float between 0 and 1
            health_metrics: Dict with keys like 'temperature' / 'Temperature'
        
        Returns:
            Dict with severity classification and recommendations
        """
        health_metrics = health_metrics or {}

        if prediction_label == 0:
            # No mastitis
            return {
                'severity_level': 'negative',
                'severity_code': 0,
                'severity_label': 'No Mastitis',
                'confidence_score': 1 - prediction_confidence,
                'recommendation': 'No mastitis detected. Continue routine udder hygiene and monitor the cow regularly.',
                'action': 'none'
            }
        
        # Calculate severity score (0-1)
        severity_score = self._calculate_severity_score(prediction_confidence, health_metrics)
        
        # Classify severity
        if severity_score < 0.50:
            severity_level = 'mild'
            recommendation = 'Mild mastitis indicators detected. Monitor the cow closely and maintain strict udder and milking hygiene. Do not start antibiotics without veterinary direction.'
            action = 'monitor'
        elif severity_score < 0.80:
            severity_level = 'moderate'
            recommendation = 'Moderate mastitis indicators detected. Veterinary consultation is recommended. Monitor the cow closely and follow appropriate veterinary/farm protocols.'
            action = 'treat'
        else:
            severity_level = 'severe'
            recommendation = 'CRITICAL VETERINARY ATTENTION REQUIRED. The assessment identified findings associated with severe/systemic mastitis. Contact a licensed veterinarian immediately.'
            action = 'urgent'
        
        return {
            'severity_level': severity_level,
            'severity_code': self.SEVERITY_LEVELS[severity_level]['code'],
            'severity_label': self.SEVERITY_LEVELS[severity_level]['label'],
            'confidence_score': severity_score,
            'recommendation': recommendation,
            'action': action
        }
    
    def _calculate_severity_score(self, prediction_confidence, health_metrics):
        """Calculate severity score from model confidence and body temperature."""
        health_metrics = health_metrics or {}
        score = 0
        
        # Prediction confidence
        score += min(prediction_confidence, 1.0) * self.feature_weights['prediction_confidence']
        
        # Body / Rectal Temperature
        temp = health_metrics.get('temperature') or health_metrics.get('Temperature') or health_metrics.get('body_temperature')
        if temp is not None:
            try:
                temp_f = float(temp)
                # Normal: 38.0 - 39.0°C; Elevated: >39.0°C; High fever: >40.0°C
                if temp_f < 38.5:
                    temp_score = 0.0
                elif temp_f < 39.2:
                    temp_score = 0.35
                elif temp_f < 40.0:
                    temp_score = 0.70
                else:
                    temp_score = 1.0
                score += temp_score * self.feature_weights['temperature']
            except (ValueError, TypeError):
                pass
        
        return min(score, 1.0)
    
    def get_treatment_protocol(self, severity_level):
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
            }
        }
        return protocols.get(severity_level, protocols['negative'])


if __name__ == '__main__':
    engine = MastitisSeverityEngine()
    
    # Test with different scenarios
    test_cases = [
        {'label': 0, 'confidence': 0.9, 'metrics': {'temperature': 38.5, 'somatic_cell_count': 150, 'milk_yield': 25}},
        {'label': 1, 'confidence': 0.6, 'metrics': {'temperature': 38.8, 'somatic_cell_count': 350, 'milk_yield': 18}},
        {'label': 1, 'confidence': 0.85, 'metrics': {'temperature': 39.2, 'somatic_cell_count': 650, 'milk_yield': 12}},
        {'label': 1, 'confidence': 0.95, 'metrics': {'temperature': 40.0, 'somatic_cell_count': 1000, 'milk_yield': 8}},
    ]
    
    for i, test in enumerate(test_cases):
        result = engine.classify_severity(
            test['label'],
            test['confidence'],
            test['metrics']
        )
        print(f"\nTest Case {i+1}:")
        print(f"  Severity: {result['severity_label']}")
        print(f"  Score: {result['confidence_score']:.2f}")
        print(f"  Recommendation: {result['recommendation']}")
        print(f"  Action: {result['action']}")
