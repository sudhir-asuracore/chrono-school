from fastapi import FastAPI, HTTPException
from models import SolveRequest, SolveResponse
from solver import solve_timetable

app = FastAPI(title="ChronoSchool Core Engine")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest):
    try:
        response = solve_timetable(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
