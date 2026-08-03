"""
Flask API wrapper for reorganized module structure.
Entry point for running the REST API server.
"""
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

if __name__ == '__main__':
    from api.flask_api import app
    
    print("\n" + "="*70)
    print("MASTITIS DETECTION - REST API SERVER")
    print("="*70)
    print("\nStarting Flask server on http://localhost:2")
    print("Models loaded from: models/")
    print("\nPress Ctrl+C to stop the server")
    print("="*70 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=5002)
