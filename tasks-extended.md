# Extended Implementation Tasks Checklist

Based on `prd-extended.md`, these tasks extend the current ChronoSchool implementation to support real-world school constraints.

## Component 1: Core Optimization Engine (Python)
- [ ] **Structural: Room & Resource Allocation**
    - [ ] Update `models.py` to include `Room` and `required_room_type` for Subjects.
    - [ ] Implement `NoRoomDoubleBooking` with room type matching logic in `solver.py`.
- [ ] **Structural: Split Classes & Combined Streams**
    - [ ] Update models to support "Simultaneous Session Binding" (linking multiple lessons to the same slot).
    - [ ] Update solver to enforce simultaneous scheduling for linked sessions.
- [ ] **Structural: Alternating Week Cycles**
    - [ ] Ensure solver handles variable `days` array length (e.g., 10 days for Week A/B).
- [ ] **Human: Maximum Consecutive Lessons (Burnout Guard)**
    - [ ] Implement hard/soft constraint to limit consecutive lessons for both teachers and students (Max 3-4).
- [ ] **Human: Teacher Availability & Part-Time Staff**
    - [ ] Add `availability_matrix` to `Teacher` model.
    - [ ] Update solver to respect teacher availability windows.
- [ ] **Human: Improved Teacher Gap Minimization**
    - [ ] Refine the gap optimization to better cluster daily lessons.

## Component 2: Backend API (Go)
- [ ] **Database Schema Updates**
    - [ ] Add `rooms` table and `room_subject_requirements`.
    - [ ] Add `teacher_availability` (stored as bitmask or boolean grid).
    - [ ] Add support for "Session Binding" in the curriculum/timetable jobs.
- [ ] **API Extensions**
    - [ ] CRUD for Rooms.
    - [ ] Update Teacher/Class/Subject APIs to handle new extended fields.
    - [ ] Implement the **Substitution Module** logic: find available, qualified teachers for a given slot and class.

## Component 4: Frontend UI (React)
- [ ] **Extended Resource Management**
    - [ ] Add "Rooms" management page.
    - [ ] Implement Availability Matrix picker for Teacher profiles.
    - [ ] Add UI for defining "Split Classes / Elective" bindings.
- [ ] **Quality of Life Features**
    - [ ] **"Why Am I Blocked?"**: Conflict Explainer in the drag-and-drop interface.
    - [ ] **Substitution UI**: Mark teachers absent and view auto-suggested covers.
    - [ ] **Multi-Angle Printable Exports**: Implement Master, Teacher, and Class view print layouts (PDF/Print CSS).

## Verification & Testing
- [ ] Create a "Complex School" sample data JSON covering all extended constraints.
- [ ] Verify solver performance with the new constraints.
- [ ] End-to-end test of the Substitution flow.
