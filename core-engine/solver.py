import time
from typing import List, Dict, Tuple
from ortools.sat.python import cp_model
from models import SolveRequest, SolveResponse, ScheduleEntry, UnassignedLesson

def solve_timetable(request: SolveRequest) -> SolveResponse:
    start_time = time.time()
    validation_errors = []

    # 0. Pre-solving Validation
    teachers_by_id = {t.id: t for t in request.teachers}
    subjects_by_id = {s.id: s for s in request.subjects}
    classes_by_id = {c.id: c for c in request.classes}
    
    num_days = len(request.settings.days)
    num_slots = request.settings.timeslots_per_day
    total_slots_available = num_days * num_slots
    
    # Check 1: Subject with no qualified teachers
    subject_teacher_count = {s_id: 0 for s_id in subjects_by_id}
    for t in request.teachers:
        for s_id in t.qualified_subjects:
            if s_id in subject_teacher_count:
                subject_teacher_count[s_id] += 1
    
    for s_id, count in subject_teacher_count.items():
        if count == 0:
            # Check if this subject is actually needed
            is_needed = False
            for c in request.classes:
                if any(curr.subject_id == s_id for curr in c.curriculum):
                    is_needed = True
                    break
            if is_needed:
                validation_errors.append(f"Subject '{subjects_by_id[s_id].name}' has no qualified teachers.")

    # Check 2: Total periods required per class exceeds available slots
    for c in request.classes:
        total_required = sum(curr.periods_per_week for curr in c.curriculum)
        if total_required > total_slots_available:
            validation_errors.append(f"Class '{c.name}' requires {total_required} periods, but only {total_slots_available} are available in the week.")

    # Check 3: Teacher capacity vs Subject requirements
    subject_requirements = {s_id: 0 for s_id in subjects_by_id}
    for c in request.classes:
        for curr in c.curriculum:
            subject_requirements[curr.subject_id] += curr.periods_per_week
    
    teacher_capacity_by_subject = {s_id: 0 for s_id in subjects_by_id}
    for t in request.teachers:
        for s_id in t.qualified_subjects:
            if s_id in teacher_capacity_by_subject:
                # This is a bit optimistic as a teacher can teach multiple subjects, 
                # but it's a hard upper bound.
                teacher_capacity_by_subject[s_id] += t.max_slots_per_week
    
    for s_id, req in subject_requirements.items():
        cap = teacher_capacity_by_subject[s_id]
        if req > cap:
            validation_errors.append(f"Total requirements for '{subjects_by_id[s_id].name}' ({req} periods) exceed total capacity of qualified teachers ({cap} periods).")

    if validation_errors:
        return SolveResponse(
            status="INFEASIBLE",
            solve_time_ms=(time.time() - start_time) * 1000,
            schedule=[],
            unassigned_lessons=[],
            validation_errors=validation_errors
        )

    model = cp_model.CpModel()

    num_days = len(request.settings.days)
    num_slots = request.settings.timeslots_per_day
    all_days = range(num_days)
    all_slots = range(num_slots)

    # Pre-calculate mapping
    teachers_by_id = {t.id: t for t in request.teachers}
    subjects_by_id = {s.id: s for s in request.subjects}
    classes_by_id = {c.id: c for c in request.classes}

    # Variables: assignments[(day, slot, class_id, subject_id, teacher_id)] = bool
    assignments = {}
    penalties = []
    
    # To optimize, we only create variables for valid (teacher, subject) pairs
    # and only for subjects in the class curriculum.
    
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            # Find qualified teachers
            qualified_teachers = [t.id for t in request.teachers if curr.subject_id in t.qualified_subjects]
            
            for d in all_days:
                for s in all_slots:
                    for t_id in qualified_teachers:
                        assignments[(d, s, c.id, curr.subject_id, t_id)] = model.NewBoolVar(
                            f'assign_d{d}_s{s}_c{c.id}_sub{curr.subject_id}_t{t_id}'
                        )

    # 1. ClassMaxOneLesson: Each class at each slot has at most one lesson
    for c_id in classes_by_id:
        for d in all_days:
            for s in all_slots:
                model.AddAtMostOne(
                    assignments[(d, s, c_id, sub_id, t_id)]
                    for (d_var, s_var, c_var, sub_id, t_id) in assignments
                    if d_var == d and s_var == s and c_var == c_id
                )

    # 2. NoTeacherDoubleBooking: Each teacher at each slot is in at most one class
    for t_id in teachers_by_id:
        for d in all_days:
            for s in all_slots:
                model.AddAtMostOne(
                    assignments[(d, s, c_id, sub_id, t_id_var)]
                    for (d_var, s_var, c_id, sub_id, t_id_var) in assignments
                    if d_var == d and s_var == s and t_id_var == t_id
                )

    # 3. CurriculumCompletion & FixedBreaks
    # Fixed breaks: no lesson if (day, slot) is a break
    break_slots = set()
    for b in request.fixed_breaks:
        if b.day == "All":
            for d in all_days:
                break_slots.add((d, b.slot_index))
        else:
            try:
                d_idx = request.settings.days.index(b.day)
                break_slots.add((d_idx, b.slot_index))
            except ValueError:
                pass

    for (d, s, c_id, sub_id, t_id), var in assignments.items():
        if (d, s) in break_slots:
            model.Add(var == 0)

    # 3.5 Pre-assigned lessons
    for entry in request.pre_assigned:
        try:
            d_idx = request.settings.days.index(entry.day)
            var = assignments.get((d_idx, entry.slot_index, entry.class_id, entry.subject_id, entry.teacher_id))
            if var is not None:
                model.Add(var == 1)
        except ValueError:
            pass

    # Curriculum requirement: Each class/subject must have exactly periods_per_week assignments
    # We make this "soft" by using slack variables to allow the solver to return a partial solution
    # if a full one is infeasible.
    slacks = {} # (class_id, subject_id) -> slack_var
    for c in request.classes:
        for curr in c.curriculum:
            assigned_count = sum(
                assignments[(d, s, c.id, curr.subject_id, t_id)]
                for (d, s, c_var, sub_id, t_id) in assignments
                if c_var == c.id and sub_id == curr.subject_id
            )
            slack = model.NewIntVar(0, curr.periods_per_week, f'slack_{c.id}_{curr.subject_id}')
            model.Add(assigned_count + slack == curr.periods_per_week)
            slacks[(c.id, curr.subject_id)] = slack
            penalties.append(slack * 10000) # Very high penalty for unassigned lessons

    # 4. TeacherMaxSlots
    for t in request.teachers:
        model.Add(
            sum(
                assignments[(d, s, c_id, sub_id, t.id)]
                for (d, s, c_id, sub_id, t_id_var) in assignments
                if t_id_var == t.id
            ) <= t.max_slots_per_week
        )

    # 5. Double Periods
    # For subjects that require double periods, if they have >= 2 periods per week,
    # we prefer (or require) them to be scheduled in blocks of 2.
    # To keep it simple, we'll try to ensure that if a double period subject is scheduled,
    # it is followed or preceded by another period of the same subject.
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            if subj.requires_double_period and curr.periods_per_week >= 2:
                # This is a bit complex for CP-SAT if we want it perfect.
                # Simplified: for each day, if the subject is present, it must be present at least twice 
                # and those two must be consecutive.
                for d in all_days:
                    # subject_present_on_day is a boolean
                    subj_on_day = model.NewBoolVar(f'subj_{subj.id}_on_c{c.id}_d{d}')
                    day_vars = [
                        assignments[(d, s, c.id, curr.subject_id, t_id)]
                        for s in all_slots
                        for t_id in [t.id for t in request.teachers if curr.subject_id in t.qualified_subjects]
                    ]
                    model.Add(sum(day_vars) >= 2).OnlyEnforceIf(subj_on_day)
                    model.Add(sum(day_vars) == 0).OnlyEnforceIf(subj_on_day.Not())
                    
                    # Consecutiveness: 
                    # If subj_on_day is true, there must be at least one 's' such that s and s+1 are assigned.
                    # This is still simplified.
                    if num_slots >= 2:
                        consecutive_pairs = []
                        for s in range(num_slots - 1):
                            pair = model.NewBoolVar(f'pair_d{d}_s{s}_c{c.id}_{subj.id}')
                            # pair is true if both s and s+1 are assigned (to any teacher)
                            s_vars = [assignments[(d, s, c.id, curr.subject_id, t_id)] for t_id in [t.id for t in request.teachers if curr.subject_id in t.qualified_subjects]]
                            s1_vars = [assignments[(d, s+1, c.id, curr.subject_id, t_id)] for t_id in [t.id for t in request.teachers if curr.subject_id in t.qualified_subjects]]
                            model.Add(sum(s_vars) == 1).OnlyEnforceIf(pair)
                            model.Add(sum(s1_vars) == 1).OnlyEnforceIf(pair)
                            consecutive_pairs.append(pair)
                        
                        model.Add(sum(consecutive_pairs) >= 1).OnlyEnforceIf(subj_on_day)

    # Soft Constraints & Objective

    # 1. Subject Balancing: Penalty if same subject appears > 1 time per day for a class (if not double period)
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            if not subj.requires_double_period:
                for d in all_days:
                    day_vars = [
                        assignments[(d, s, c.id, curr.subject_id, t_id)]
                        for s in all_slots
                        for t_id in [t.id for t in request.teachers if curr.subject_id in t.qualified_subjects]
                    ]
                    # Penalty if sum(day_vars) > 1
                    over_limit = model.NewIntVar(0, num_slots, f'over_{c.id}_{subj.id}_{d}')
                    model.Add(over_limit >= sum(day_vars) - 1)
                    penalties.append(over_limit * 10) # Weight of 10

    # 2. Teacher Window Optimization: Minimize gaps
    # For each teacher, each day, if they teach at slot s1 and s3, but not s2, penalty.
    for t_id in teachers_by_id:
        for d in all_days:
            teacher_day_vars = []
            for s in all_slots:
                # Var representing if teacher is busy at (d, s)
                busy = model.NewBoolVar(f'busy_t{t_id}_d{d}_s{s}')
                relevant_vars = [
                    v for (d_v, s_v, c_v, sub_v, t_v), v in assignments.items()
                    if d_v == d and s_v == s and t_v == t_id
                ]
                if relevant_vars:
                    model.Add(busy == sum(relevant_vars))
                else:
                    model.Add(busy == 0)
                teacher_day_vars.append(busy)
            
            # Gap detection: teacher is busy at s1, busy at s2, s1 < s < s2, and not busy at s.
            # A simpler way: gap = (max_busy_slot - min_busy_slot + 1) - num_busy_slots
            if num_slots >= 3:
                min_slot = model.NewIntVar(0, num_slots, f'min_t{t_id}_d{d}')
                max_slot = model.NewIntVar(-1, num_slots - 1, f'max_t{t_id}_d{d}')
                
                for s in all_slots:
                    # if busy[s], then min_slot <= s and max_slot >= s
                    model.Add(min_slot <= s).OnlyEnforceIf(teacher_day_vars[s])
                    model.Add(max_slot >= s).OnlyEnforceIf(teacher_day_vars[s])
                
                # If teacher not busy at all on that day, min/max don't matter much but we need to handle it.
                is_busy_day = model.NewBoolVar(f'busy_day_t{t_id}_d{d}')
                model.Add(sum(teacher_day_vars) > 0).OnlyEnforceIf(is_busy_day)
                model.Add(sum(teacher_day_vars) == 0).OnlyEnforceIf(is_busy_day.Not())
                
                # Penalty = (max_slot - min_slot + 1 - sum(teacher_day_vars))
                day_gap = model.NewIntVar(0, num_slots, f'gap_t{t_id}_d{d}')
                model.Add(day_gap == max_slot - min_slot + 1 - sum(teacher_day_vars)).OnlyEnforceIf(is_busy_day)
                model.Add(day_gap == 0).OnlyEnforceIf(is_busy_day.Not())
                penalties.append(day_gap * 5) # Weight of 5

    model.Minimize(sum(penalties))

    # Solver
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = request.settings.max_search_seconds
    status = solver.Solve(model)

    solve_time = (time.time() - start_time) * 1000
    
    response_status = "UNKNOWN"
    if status == cp_model.OPTIMAL:
        response_status = "OPTIMAL"
    elif status == cp_model.FEASIBLE:
        response_status = "FEASIBLE"
    elif status == cp_model.INFEASIBLE:
        response_status = "INFEASIBLE"

    schedule = []
    unassigned_lessons = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (d, s, c_id, sub_id, t_id), var in assignments.items():
            if solver.Value(var):
                schedule.append(ScheduleEntry(
                    day=request.settings.days[d],
                    slot_index=s,
                    class_id=c_id,
                    subject_id=sub_id,
                    teacher_id=t_id
                ))
        
        for (c_id, sub_id), slack_var in slacks.items():
            slack_val = solver.Value(slack_var)
            if slack_val > 0:
                unassigned_lessons.append(UnassignedLesson(
                    class_id=c_id,
                    subject_id=sub_id,
                    periods_missing=slack_val
                ))
        
        if len(unassigned_lessons) > 0:
            response_status = "INFEASIBLE" # Partial solution found

    return SolveResponse(
        status=response_status,
        solve_time_ms=solve_time,
        schedule=schedule,
        unassigned_lessons=unassigned_lessons,
        validation_errors=validation_errors
    )
