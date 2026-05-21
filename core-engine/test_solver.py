import json
from models import SolveRequest, SolveResponse
from solver import solve_timetable

def test_basic_solve():
    payload = {
        "settings": { "timeslots_per_day": 8, "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "max_search_seconds": 10 },
        "fixed_breaks": [ { "day": "All", "slot_index": 4, "label": "Lunch Break" } ],
        "teachers": [
            { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 24, "qualifications": [{"subject_id": "sub_math", "level_id": "lvl_sec"}, {"subject_id": "sub_physics", "level_id": "lvl_sec"}] },
            { "id": "t_02", "name": "Ms. Jane Smith", "max_slots_per_week": 24, "qualifications": [{"subject_id": "sub_history", "level_id": "lvl_sec"}] }
        ],
        "rooms": [
            { "id": "r_01", "name": "Room 101", "type": "General" }
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
                "level_id": "lvl_sec",
                "curriculum": [
                    { "subject_id": "sub_math", "periods_per_week": 4 },
                    { "subject_id": "sub_history", "periods_per_week": 3 }
                ]
            }
        ],
        "levels": [
            { "id": "lvl_sec", "name": "Secondary" }
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
