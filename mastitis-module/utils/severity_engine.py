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
            'prediction_confidence': 0.4,
            'somatic_cell_count': 0.3,
            'temperature': 0.2,
            'milk_yield': 0.1
        }
    
    def classify_severity(self, prediction_label, prediction_confidence, health_metrics):
        """
        Classify mastitis severity.
        
        Args:
            prediction_label: 0 (normal) or 1 (mastitis)
            prediction_confidence: Float between 0 and 1
            health_metrics: Dict with keys like 'temperature', 'somatic_cell_count', etc.
        
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
                'recommendation': 'Cow is healthy. Continue routine monitoring.',
                'action': 'none'
            }
        
        # Calculate severity score (0-1)
        severity_score = self._calculate_severity_score(prediction_confidence, health_metrics)
        
        # Classify severity
        if severity_score < 0.3:
            severity_level = 'mild'
            recommendation = 'Mild mastitis detected. Monitor closely and increase udder care.'
            action = 'monitor'
        elif severity_score < 0.6:
            severity_level = 'moderate'
            recommendation = 'Moderate mastitis detected. Start treatment and consult veterinarian.'
            action = 'treat'
        else:
            severity_level = 'severe'
            recommendation = 'Severe mastitis detected. Immediate veterinary intervention required.'
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
        """Calculate severity score from multiple factors."""
        health_metrics = health_metrics or {}
        score = 0
        
        # Prediction confidence (0-0.4)
        score += min(prediction_confidence, 1.0) * self.feature_weights['prediction_confidence']
        
        # Somatic Cell Count (SCC) - indicator of inflammation
        if 'somatic_cell_count' in health_metrics:
            scc = health_metrics['somatic_cell_count']
            # Normalize: normal < 200k, mild 200-400k, moderate 400-800k, severe > 800k
            if scc < 200:
                scc_score = 0
            elif scc < 400:
                scc_score = 0.33
            elif scc < 800:
                scc_score = 0.66
            else:
                scc_score = 1.0
            score += scc_score * self.feature_weights['somatic_cell_count']
        
        # Body Temperature
        if 'body_temperature' in health_metrics:
            temp = health_metrics['body_temperature']
            # Normal: 38-39°C
            if temp < 38.5:
                temp_score = 0
            elif temp < 39:
                temp_score = 0.3
            elif temp < 39.5:
                temp_score = 0.6
            else:
                temp_score = 1.0
            score += temp_score * self.feature_weights['temperature']
        
        # Milk Yield (decreased production is sign of mastitis)
        if 'milk_yield' in health_metrics:
            yield_val = health_metrics['milk_yield']
            # Assuming normal > 20 liters
            if yield_val > 20:
                yield_score = 0
            elif yield_val > 15:
                yield_score = 0.3
            elif yield_val > 10:
                yield_score = 0.6
            else:
                yield_score = 1.0
            score += yield_score * self.feature_weights['milk_yield']
        
        return min(score, 1.0)
    
    def get_treatment_protocol(self, severity_level):
        """Get treatment recommendations for severity level."""
        protocols = {
            'negative': {
                'action': 'Monitor',
                'frequency': 'Daily',
                'measures': [
                    'Continue routine udder health monitoring',
                    'Maintain good hygiene practices',
                    'Regular health check-ups'
                ]
            },
            'mild': {
                'action': 'Monitor + Support',
                'frequency': 'Every 12 hours',
                'measures': [
                    'Increase milking frequency',
                    'Apply warm compress to udder',
                    'Monitor milk quality daily',
                    'Increase cow comfort (bedding, rest)'
                ]
            },
            'moderate': {
                'action': 'Treatment Required',
                'frequency': 'Every 8 hours',
                'measures': [
                    'Consult veterinarian immediately',
                    'Antibiotic therapy may be needed',
                    'Increase cleaning frequency',
                    'Separate from herd if necessary',
                    'Monitor milk and cow health closely'
                ]
            },
            'severe': {
                'action': 'Emergency Treatment',
                'frequency': 'Continuous',
                'measures': [
                    'EMERGENCY: Contact veterinarian immediately',
                    'Immediate antibiotic treatment required',
                    'Close monitoring for septicemia',
                    'Isolate from herd',
                    'IV fluids may be needed',
                    'Frequent udder checks'
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
