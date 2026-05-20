import json
from models import SolveRequest, SolveResponse
from solver import solve_timetable

def test_basic_solve():
    payload = {
        "settings": { "timeslots_per_day": 8, "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "max_search_seconds": 10 },
        "fixed_breaks": [ { "day": "All", "slot_index": 4, "label": "Lunch Break" } ],
        "teachers": [
            { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 24, "qualified_subjects": ["sub_math", "sub_physics"] },
            { "id": "t_02", "name": "Ms. Jane Smith", "max_slots_per_week": 24, "qualified_subjects": ["sub_history"] }
        ],
        "subjects": [
            { "id": "sub_math", "name": "Mathematics", "requires_double_period": True },
            { "id": "sub_history", "name": "History", "requires_double_period": False },
            { "id": "sub_physics", "name": "Physics", "requires_double_period": False }
        ],
        "classes": [
            {
                "id": "class_9a",
                "name": "Grade 9, Stream A",
                "type": "secondary",
                "curriculum": [
                    { "subject_id": "sub_math", "periods_per_week": 4 },
                    { "subject_id": "sub_history", "periods_per_week": 3 }
                ]
            }
        ]
    }
    
    request = SolveRequest(**payload)
    response = solve_timetable(request)
    
    print(f"Status: {response.status}")
    print(f"Solve Time: {response.solve_time_ms} ms")
    print(f"Schedule items: {len(response.schedule)}")
    
    for item in response.schedule:
        print(f"{item.day} Slot {item.slot_index}: {item.class_id} - {item.subject_id} ({item.teacher_id})")

    assert response.status in ["OPTIMAL", "FEASIBLE"]
    assert len(response.schedule) == 7 # 4 math + 3 history

if __name__ == "__main__":
    test_basic_solve()
