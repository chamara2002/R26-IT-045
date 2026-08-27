"""
Flask API entry point for Mastitis Detection Module.
Runs on dedicated port 5002.
"""
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

if __name__ == '__main__':
    from api.flask_api import app, config
    
    print("\n" + "="*70)
    print("CATTLESENSE MASTITIS DETECTION - REST API SERVER")
    print("="*70)
    print(f"\nStarting Flask server on http://localhost:{config.PORT}")
    print("Models path: models/")
    print("\nPress Ctrl+C to stop the server")
    print("="*70 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=config.PORT)
