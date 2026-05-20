# ChronoSchool Core Optimization Engine

The Core Optimization Engine is a stateless service responsible for generating optimal school timetables using Google OR-Tools.

## Tech Stack
- **Language:** Python 3.11+
- **Framework:** FastAPI
- **Solver:** Google OR-Tools (CP-SAT)

## Setup
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service
To start the FastAPI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Testing
Run the integration test suite:
```bash
python test_solver.py
```

### CLI Testing with Sample Data
You can test the solver with realistic sample data using the provided script:
```bash
python run_test_request.py
```
This script reads `test-request.json` (generated from the frontend sample data) and outputs the solve status and a partial schedule if the full one is infeasible.

## API Interface
See [interface.md](interface.md) for detailed API specifications.
