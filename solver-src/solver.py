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
    rooms_by_id = {r.id: r for r in request.rooms}
    
    num_days = len(request.settings.days)
    num_slots = request.settings.timeslots_per_day
    total_slots_available = num_days * num_slots
    
    # Check 1: Subject with no qualified teachers or no suitable rooms
    qualification_teacher_count = {} # (subject_id, level_id) -> count
    for t in request.teachers:
        for q in t.qualifications:
            key = (q.subject_id, q.level_id)
            qualification_teacher_count[key] = qualification_teacher_count.get(key, 0) + 1
    
    levels_by_id = {l.id: l for l in request.levels}
    
    for c in request.classes:
        for curr in c.curriculum:
            key = (curr.subject_id, c.level_id)
            if qualification_teacher_count.get(key, 0) == 0:
                subj = subjects_by_id[curr.subject_id]
                lvl = levels_by_id.get(c.level_id)
                lvl_name = lvl.name if lvl else "Unknown Level"
                err = f"No teacher is qualified to teach '{subj.name}' at level '{lvl_name}' (required for class '{c.name}')."
                if err not in validation_errors:
                    validation_errors.append(err)
            
            subj = subjects_by_id[curr.subject_id]
            if subj.required_room_type:
                suitable_rooms = [r for r in request.rooms if r.type == subj.required_room_type]
                if not suitable_rooms:
                    validation_errors.append(f"Subject '{subj.name}' requires room type '{subj.required_room_type}', but no such rooms are defined (required for class '{c.name}').")
    
    # Check 2: Total periods required per class exceeds available slots
    for c in request.classes:
        total_required = sum(curr.periods_per_week for curr in c.curriculum)
        if total_required > total_slots_available:
            validation_errors.append(f"Class '{c.name}' requires {total_required} periods, but only {total_slots_available} are available in the week.")

    # Check 3: Teacher capacity vs Subject requirements
    # Loose check: total capacity of teachers who can teach a specific (subject, level)
    qualification_capacity = {} # (subject_id, level_id) -> total max slots
    for t in request.teachers:
        for q in t.qualifications:
            key = (q.subject_id, q.level_id)
            qualification_capacity[key] = qualification_capacity.get(key, 0) + t.max_slots_per_week
            
    for c in request.classes:
        for curr in c.curriculum:
            key = (curr.subject_id, c.level_id)
            cap = qualification_capacity.get(key, 0)
            if curr.periods_per_week > cap:
                subj = subjects_by_id[curr.subject_id]
                lvl = levels_by_id.get(c.level_id)
                lvl_name = lvl.name if lvl else "Unknown Level"
                validation_errors.append(f"Class '{c.name}' requires {curr.periods_per_week} periods of '{subj.name}' at level '{lvl_name}', but total capacity of qualified teachers is only {cap}.")

    # Check 4: Session Binding consistency
    bindings = {} # binding_id -> periods_per_week
    for c in request.classes:
        for curr in c.curriculum:
            if curr.binding_id:
                if curr.binding_id in bindings:
                    if bindings[curr.binding_id] != curr.periods_per_week:
                        validation_errors.append(f"Session Binding '{curr.binding_id}' has inconsistent periods_per_week ({bindings[curr.binding_id]} vs {curr.periods_per_week}).")
                else:
                    bindings[curr.binding_id] = curr.periods_per_week

    # Check 5: Pre-assigned vs Holidays/Teacher Vacations
    holiday_days = {h.day for h in request.holidays}
    teacher_vacations = {} # teacher_id -> set(days)
    for v in request.teacher_vacations:
        teacher_vacations.setdefault(v.teacher_id, set()).add(v.day)

    for entry in request.pre_assigned:
        if entry.day in holiday_days:
            validation_errors.append(f"Pre-assigned lesson for class '{classes_by_id.get(entry.class_id).name}' on {entry.day} conflicts with a weekly holiday.")
        elif entry.day in teacher_vacations.get(entry.teacher_id, set()):
            teacher_name = teachers_by_id.get(entry.teacher_id).name
            validation_errors.append(f"Pre-assigned lesson for class '{classes_by_id.get(entry.class_id).name}' on {entry.day} conflicts with vacation for teacher '{teacher_name}'.")

    if validation_errors:
        return SolveResponse(
            status="INFEASIBLE",
            solve_time_ms=(time.time() - start_time) * 1000,
            schedule=[],
            unassigned_lessons=[],
            validation_errors=validation_errors
        )

    model = cp_model.CpModel()
    all_days = range(num_days)
    all_slots = range(num_slots)

    # Variables: assignments[(day, slot, class_id, subject_id, teacher_id, room_id)] = bool
    assignments = {}
    vars_by_class_slot = {}
    vars_by_teacher_slot = {}
    vars_by_room_slot = {}
    vars_by_class_subject = {}
    vars_by_class_subject_day = {}
    vars_by_class_subject_day_slot = {}
    vars_by_teacher_day_slot = {}
    
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            qualified_teachers = [
                t for t in request.teachers 
                if any(q.subject_id == curr.subject_id and q.level_id == c.level_id for q in t.qualifications)
            ]
            
            if subj.required_room_type:
                suitable_rooms = [r.id for r in request.rooms if r.type == subj.required_room_type]
            else:
                suitable_rooms = [r.id for r in request.rooms]
            
            for d in all_days:
                for s in all_slots:
                    available_teachers = []
                    for t in qualified_teachers:
                        if t.availability_matrix is not None:
                            if d < len(t.availability_matrix) and s < len(t.availability_matrix[d]):
                                if not t.availability_matrix[d][s]:
                                    continue
                        available_teachers.append(t)

                    for t in available_teachers:
                        for r_id in suitable_rooms:
                            key = (d, s, c.id, curr.subject_id, t.id, r_id)
                            var = model.NewBoolVar(f'assign_d{d}_s{s}_c{c.id}_sub{curr.subject_id}_t{t.id}_r{r_id}')
                            assignments[key] = var
                            
                            vars_by_class_slot.setdefault((d, s, c.id), []).append(var)
                            vars_by_teacher_slot.setdefault((d, s, t.id), []).append(var)
                            vars_by_room_slot.setdefault((d, s, r_id), []).append(var)
                            vars_by_class_subject.setdefault((c.id, curr.subject_id), []).append(var)
                            vars_by_class_subject_day.setdefault((c.id, curr.subject_id, d), []).append(var)
                            vars_by_class_subject_day_slot.setdefault((c.id, curr.subject_id, d, s), []).append(var)
                            vars_by_teacher_day_slot.setdefault((t.id, d, s), []).append(var)

    # 1. ClassMaxOneLesson: Each class at each slot has at most one lesson
    for (d, s, c_id), vars_list in vars_by_class_slot.items():
        model.AddAtMostOne(vars_list)

    # 2. NoTeacherDoubleBooking: Each teacher at each slot is in at most one class
    for (d, s, t_id), vars_list in vars_by_teacher_slot.items():
        model.AddAtMostOne(vars_list)
        
    # 2.5 NoRoomDoubleBooking: Each room at each slot has at most one class
    for (d, s, r_id), vars_list in vars_by_room_slot.items():
        model.AddAtMostOne(vars_list)

    # 3. Fixed Breaks and Holidays
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

    for h in request.holidays:
        try:
            d_idx = request.settings.days.index(h.day)
            for s in all_slots:
                break_slots.add((d_idx, s))
        except ValueError:
            pass

    # Teacher Vacations
    teacher_vacation_slots = set() # (teacher_id, day_idx, slot_idx)
    for v in request.teacher_vacations:
        try:
            d_idx = request.settings.days.index(v.day)
            for s in all_slots:
                teacher_vacation_slots.add((v.teacher_id, d_idx, s))
        except ValueError:
            pass

    for (d, s, c_id, sub_id, t_id, r_id), var in assignments.items():
        if (d, s) in break_slots:
            model.Add(var == 0)
        if (t_id, d, s) in teacher_vacation_slots:
            model.Add(var == 0)

    # 3.5 Pre-assigned lessons
    for entry in request.pre_assigned:
        try:
            d_idx = request.settings.days.index(entry.day)
            key = (d_idx, entry.slot_index, entry.class_id, entry.subject_id, entry.teacher_id, entry.room_id)
            var = assignments.get(key)
            if var is not None:
                model.Add(var == 1)
        except ValueError:
            pass

    # Curriculum requirement (Soft)
    slacks = {}
    penalties = []
    for c in request.classes:
        for curr in c.curriculum:
            vars_list = vars_by_class_subject.get((c.id, curr.subject_id), [])
            assigned_count = sum(vars_list)
            slack = model.NewIntVar(0, curr.periods_per_week, f'slack_{c.id}_{curr.subject_id}')
            model.Add(assigned_count + slack == curr.periods_per_week)
            slacks[(c.id, curr.subject_id)] = slack
            penalties.append(slack * 10000)

    # 4. TeacherMaxSlots
    for t in request.teachers:
        teacher_vars = []
        for d in all_days:
            for s in all_slots:
                teacher_vars.extend(vars_by_teacher_day_slot.get((t.id, d, s), []))
        if teacher_vars:
            model.Add(sum(teacher_vars) <= t.max_slots_per_week)

    # 5. Double Periods
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            if subj.requires_double_period and curr.periods_per_week >= 2:
                for d in all_days:
                    day_vars = vars_by_class_subject_day.get((c.id, curr.subject_id, d), [])
                    if not day_vars: continue
                    
                    subj_on_day = model.NewBoolVar(f'subj_{subj.id}_on_c{c.id}_d{d}')
                    model.Add(sum(day_vars) >= 2).OnlyEnforceIf(subj_on_day)
                    model.Add(sum(day_vars) == 0).OnlyEnforceIf(subj_on_day.Not())
                    
                    if num_slots >= 2:
                        consecutive_pairs = []
                        for s in range(num_slots - 1):
                            pair = model.NewBoolVar(f'pair_d{d}_s{s}_c{c.id}_{subj.id}')
                            s_vars = vars_by_class_subject_day_slot.get((c.id, curr.subject_id, d, s), [])
                            s1_vars = vars_by_class_subject_day_slot.get((c.id, curr.subject_id, d, s+1), [])
                            if s_vars and s1_vars:
                                model.Add(sum(s_vars) == 1).OnlyEnforceIf(pair)
                                model.Add(sum(s1_vars) == 1).OnlyEnforceIf(pair)
                                consecutive_pairs.append(pair)
                            else:
                                model.Add(pair == 0)
                        if consecutive_pairs:
                            model.Add(sum(consecutive_pairs) >= 1).OnlyEnforceIf(subj_on_day)

    # Soft Constraints: Subject Balancing
    for c in request.classes:
        for curr in c.curriculum:
            subj = subjects_by_id[curr.subject_id]
            if not subj.requires_double_period:
                for d in all_days:
                    day_vars = vars_by_class_subject_day.get((c.id, curr.subject_id, d), [])
                    if day_vars:
                        over_limit = model.NewIntVar(0, num_slots, f'over_{c.id}_{subj.id}_{d}')
                        model.Add(over_limit >= sum(day_vars) - 1)
                        penalties.append(over_limit * 10)

    # Soft Constraints: Teacher Window Optimization
    for t_id in teachers_by_id:
        for d in all_days:
            teacher_day_vars = []
            for s in all_slots:
                busy = model.NewBoolVar(f'busy_t{t_id}_d{d}_s{s}')
                relevant_vars = vars_by_teacher_day_slot.get((t_id, d, s), [])
                if relevant_vars:
                    model.Add(busy == sum(relevant_vars))
                else:
                    model.Add(busy == 0)
                teacher_day_vars.append(busy)
            
            if num_slots >= 3:
                min_slot = model.NewIntVar(0, num_slots, f'min_t{t_id}_d{d}')
                max_slot = model.NewIntVar(-1, num_slots - 1, f'max_t{t_id}_d{d}')
                for s in all_slots:
                    model.Add(min_slot <= s).OnlyEnforceIf(teacher_day_vars[s])
                    model.Add(max_slot >= s).OnlyEnforceIf(teacher_day_vars[s])
                
                is_busy_day = model.NewBoolVar(f'busy_day_t{t_id}_d{d}')
                model.Add(sum(teacher_day_vars) > 0).OnlyEnforceIf(is_busy_day)
                model.Add(sum(teacher_day_vars) == 0).OnlyEnforceIf(is_busy_day.Not())
                
                day_gap = model.NewIntVar(0, num_slots, f'gap_t{t_id}_d{d}')
                model.Add(day_gap == max_slot - min_slot + 1 - sum(teacher_day_vars)).OnlyEnforceIf(is_busy_day)
                model.Add(day_gap == 0).OnlyEnforceIf(is_busy_day.Not())
                penalties.append(day_gap * 5)

    # Human Constraint: Maximum Consecutive Lessons (Max 4)
    for t_id in teachers_by_id:
        for d in all_days:
            teacher_day_vars = []
            for s in all_slots:
                busy = model.NewBoolVar(f'busy_t{t_id}_d{d}_s{s}_cons')
                relevant_vars = vars_by_teacher_day_slot.get((t_id, d, s), [])
                if relevant_vars:
                    model.Add(busy == sum(relevant_vars))
                else:
                    model.Add(busy == 0)
                teacher_day_vars.append(busy)
            
            for s in range(num_slots - 4):
                model.Add(sum(teacher_day_vars[s:s + 5]) <= 4)

    # 7. Session Binding
    binding_groups = {} # binding_id -> list of (c_id, sub_id)
    for c in request.classes:
        for curr in c.curriculum:
            if curr.binding_id:
                binding_groups.setdefault(curr.binding_id, []).append((c.id, curr.subject_id))
    
    for b_id, lessons in binding_groups.items():
        for d in all_days:
            for s in all_slots:
                is_active = model.NewBoolVar(f'binding_{b_id}_d{d}_s{s}')
                for c_id, sub_id in lessons:
                    vars_at_slot = vars_by_class_subject_day_slot.get((c_id, sub_id, d, s), [])
                    if vars_at_slot:
                        model.Add(sum(vars_at_slot) == is_active)
                    else:
                        model.Add(is_active == 0)

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
        for (d, s, c_id, sub_id, t_id, r_id), var in assignments.items():
            if solver.Value(var):
                schedule.append(ScheduleEntry(
                    day=request.settings.days[d],
                    slot_index=s,
                    class_id=c_id,
                    subject_id=sub_id,
                    teacher_id=t_id,
                    room_id=r_id
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
            response_status = "INFEASIBLE" 

    return SolveResponse(
        status=response_status,
        solve_time_ms=solve_time,
        schedule=schedule,
        unassigned_lessons=unassigned_lessons,
        validation_errors=validation_errors
    )
