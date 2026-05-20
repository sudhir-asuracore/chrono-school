import json
from models import SolveRequest, SolveResponse
from solver import solve_timetable

def test_validation_no_teacher():
    payload = {
        "settings": { "timeslots_per_day": 8, "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "max_search_seconds": 10 },
        "teachers": [
            { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 24, "qualified_subjects": ["sub_math"] }
        ],
        "subjects": [
            { "id": "sub_math", "name": "Mathematics" },
            { "id": "sub_physics", "name": "Physics" }
        ],
        "classes": [
            {
                "id": "class_9a",
                "name": "Grade 9, Stream A",
                "type": "secondary",
                "curriculum": [
                    { "subject_id": "sub_math", "periods_per_week": 4 },
                    { "subject_id": "sub_physics", "periods_per_week": 3 }
                ]
            }
        ]
    }
    
    request = SolveRequest(**payload)
    response = solve_timetable(request)
    
    print(f"Status: {response.status}")
    print(f"Validation Errors: {response.validation_errors}")
    
    assert response.status == "INFEASIBLE"
    assert "Subject 'Physics' has no qualified teachers." in response.validation_errors

def test_validation_capacity_exceeded():
    payload = {
        "settings": { "timeslots_per_day": 8, "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "max_search_seconds": 10 },
        "teachers": [
            { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 2, "qualified_subjects": ["sub_math"] }
        ],
        "subjects": [
            { "id": "sub_math", "name": "Mathematics" }
        ],
        "classes": [
            {
                "id": "class_9a", "name": "9A", "type": "secondary",
                "curriculum": [{ "subject_id": "sub_math", "periods_per_week": 4 }]
            }
        ]
    }
    
    request = SolveRequest(**payload)
    response = solve_timetable(request)
    
    print(f"Status: {response.status}")
    print(f"Validation Errors: {response.validation_errors}")
    
    assert response.status == "INFEASIBLE"
    assert "Total requirements for 'Mathematics' (4 periods) exceed total capacity of qualified teachers (2 periods)." in response.validation_errors

def test_validation_too_many_periods_for_class():
    payload = {
        "settings": { "timeslots_per_day": 2, "days": ["Mon"], "max_search_seconds": 10 },
        "teachers": [
            { "id": "t_01", "name": "Mr. John Doe", "max_slots_per_week": 24, "qualified_subjects": ["sub_math"] }
        ],
        "subjects": [
            { "id": "sub_math", "name": "Mathematics" }
        ],
        "classes": [
            {
                "id": "class_9a", "name": "9A", "type": "secondary",
                "curriculum": [{ "subject_id": "sub_math", "periods_per_week": 3 }]
            }
        ]
    }
    
    request = SolveRequest(**payload)
    response = solve_timetable(request)
    
    print(f"Status: {response.status}")
    print(f"Validation Errors: {response.validation_errors}")
    
    assert response.status == "INFEASIBLE"
    assert "Class '9A' requires 3 periods, but only 2 are available in the week." in response.validation_errors

if __name__ == "__main__":
    test_validation_no_teacher()
    test_validation_capacity_exceeded()
    test_validation_too_many_periods_for_class()
    print("All validation tests passed!")
