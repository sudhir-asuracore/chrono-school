import sys
import json
from models import SolveRequest
from solver import solve_timetable
from pydantic import TypeAdapter

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}), file=sys.stderr)
            sys.exit(1)

        request_dict = json.loads(input_data)
        request = TypeAdapter(SolveRequest).validate_python(request_dict)

        response = solve_timetable(request)

        # We need to convert the pydantic model to a dict, then handle UUIDs/Enum if any
        # Fortunately solve_timetable returns a SolveResponse which is also a pydantic model
        print(response.model_dump_json())

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
