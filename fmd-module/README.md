# FMD Weather Novelty Module

This module adds a weather-based FMD risk assessment layer inside the FMD service.

## Endpoints

- GET /weather/current-risk?latitude=...&longitude=...
- GET /weather/history?farmer_id=...
- GET /weather/trend?farmer_id=...

## Notes

- The weather source is Open-Meteo via weather/weather_forecast_location.py.
- The initial model uses configurable threshold rules and a Random Forest scaffold.
- The model artifact is stored in models/trained_models/weather_risk_rf.pkl.
