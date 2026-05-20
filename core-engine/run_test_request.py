import json
import sys
import os
from models import SolveRequest, SolveResponse
from solver import solve_timetable

def run_test(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r') as f:
        payload = json.load(f)

    try:
        request = SolveRequest(**payload)
        print(f"Loaded request with {len(request.subjects)} subjects, {len(request.teachers)} teachers, and {len(request.classes)} classes.")
        print("Solving...")
        
        response = solve_timetable(request)
        
        print(f"Status: {response.status}")
        print(f"Solve Time: {response.solve_time_ms} ms")
        print(f"Schedule items: {len(response.schedule)}")
        print(f"Unassigned lessons: {len(response.unassigned_lessons)}")
        
        if len(response.unassigned_lessons) > 0:
            print("\nUnassigned Lessons:")
            for ul in response.unassigned_lessons:
                print(f"  Class {ul.class_id}, Subject {ul.subject_id}: {ul.periods_missing} missing")

        # Save result to a file
        output_file = "test-response.json"
        with open(output_file, 'w') as f:
            if hasattr(response, "model_dump_json"):
                f.write(response.model_dump_json(indent=2))
            else:
                json.dump(response.dict(), f, indent=2)
        
        print(f"\nResponse saved to {output_file}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    file_to_run = "test-request.json"
    if len(sys.argv) > 1:
        file_to_run = sys.argv[1]
    
    run_test(file_to_run)
