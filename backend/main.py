from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from simulator_logic import FIFASimulator
import os

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATCHES_PATH = os.path.join(BASE_DIR, "international_matches.csv")
GROUPS_PATH = os.path.join(BASE_DIR, "Groupes - V3.csv")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Initialize Simulator
simulator = FIFASimulator(MATCHES_PATH, GROUPS_PATH)

@app.get("/simulate")
async def simulate():
    return simulator.simulate_tournament()

@app.get("/analytics")
async def analytics():
    return simulator.get_analytics()

class MatchRequest(BaseModel):
    team1: str
    team2: str

@app.post("/predict_h2h")
async def predict_h2h(req: MatchRequest):
    prob = simulator.predict_match(req.team1, req.team2)
    t1_stats = simulator.teams_data.get(req.team1, {})
    t2_stats = simulator.teams_data.get(req.team2, {})
    
    return {
        "team1": req.team1,
        "team2": req.team2,
        "team1_prob": float(prob),
        "team2_prob": float(1.0 - prob),
        "team1_stats": {k: FIFASimulator._native(v) for k, v in t1_stats.items()},
        "team2_stats": {k: FIFASimulator._native(v) for k, v in t2_stats.items()}
    }

@app.get("/teams")
async def get_teams():
    return sorted(simulator.teams_list)

# Serve frontend
@app.get("/")
async def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
