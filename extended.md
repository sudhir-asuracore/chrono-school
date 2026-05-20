To make a school timetabling tool truly viable for real-world school administrators, you have to look past the standard "perfect world" constraints. Schools are chaotic, human environments. When a school admin rejects an automated timetabling tool, it is almost always because the software failed to handle a specific "pedagogical or human" constraint.

To ensure your implementation covers all angles, review this breakdown of missing critical features, categorized into structural requirements, human constraints, and operational features.

---

## 1. Missing Core Structural Constraints

These are major math variables your Google OR-Tools engine must support to handle standard school layouts.

### 🏫 Room & Resource Capacity Allocation

Right now, your model matches **Teachers** to **Classes**. In the real world, you have to map a third dimension: **Physical Space**.

* **Specialized Rooms:** Chemistry can only happen in a *Science Lab*. Physical Education needs the *Gym/Field*. Computer science needs the *IT Lab*.
* **Mathematical impact:** Your solver must treat rooms as an independent resource. A class cannot double-book a room, and the room must match the subject's `required_room_type` tag.

### 🔀 Split Classes & Combined Streams (Electives / Languages)

Your current structure assumes a Class/Stream stays together all day.

* **The Reality:** During the 3rd period on Tuesday, Grade 9A and Grade 9B might split up. 30 students go to French, 20 go to German, and 10 go to Remedial English. This means **three different teachers** are teaching subsets of **two different streams** at the *exact same time*.
* **Mathematical impact:** The solver needs to support "Simultaneous Session Binding," forcing multiple distinct lessons to lock into the exact same Day and Timeslot column.

### 📅 Alternating Week Cycles (Week A / Week B)

Many secondary schools run on a 10-day cycle instead of a 5-day cycle because they have too many subjects to fit into a single week (e.g., Biology lab every second Thursday).

* **Mathematical impact:** The `days` array in your JSON payload must support variable lengths (5 days vs. 10 days).

---

## 2. Psycho-Hygienic & Human Constraints (Soft Rules)

These are rules that keep teachers from quitting and keep students focused. If your AI engine ignores these, the resulting timetable will be clinically valid but completely unusable in real life.

### ⏳ Maximum Consecutive Lessons (The "Burnout" Guard)

* **For Teachers:** A teacher should never be scheduled to teach more than 3 or 4 periods continuously without a planning period or break.
* **For Students:** Students shouldn't have 3 dense academic blocks back-to-back (e.g., Math, Physics, and Chemistry straight through).

### 🚪 Teacher "Time Off" Windows & Part-Time Staff

* Senior teachers often negotiate specific days off, or part-time teachers may only be contracted to work Tuesday through Thursday.
* **Mathematical impact:** Every teacher object needs an `availability_matrix` (a boolean grid of timeslots where they are legally allowed to be scheduled).

### 🕳️ Teacher Gap Minimization (Window Optimization)

* If a teacher has a lesson in Period 1 and a lesson in Period 7, with nothing in between, they are stuck sitting at school all day doing nothing. Your solver must try to cluster a teacher's daily lessons together.

---

## 3. Operational & "Quality of Life" SaaS Features

These features move your project from an academic math project into a sticky, high-value B2B SaaS platform.

### 🧩 "Why Am I Blocked?" — The Conflict Explainer

When an admin tries to manually drag a lesson to a different slot on the frontend UI, and the system blocks it, **you must explain why**.

* *Bad UI:* "Invalid Move."
* *Great UI:* "Cannot move here: Mr. John Doe is already teaching Grade 10B in Room 4 during this period."

### 🔄 The Substitution Module (The Ultimate SaaS Upsell)

A timetable is generated once a term, meaning users only log into your app twice a year. **To make them stick around month after month, you need a Substitution Engine.**

* When a teacher calls in sick at 6:30 AM, the admin opens your app, marks them as absent, and the system instantly looks at the master timetable data to find which qualified teachers have a "Free Period" right then to cover the class.

### 🖨️ Multi-Angle Printable Exports

School admins love paper. Your frontend must support printing layouts filtered from three clean structural viewpoints:

1. **The Master Grid:** Everything on one massive sheet (for the Principal).
2. **The Teacher View:** An individual calendar page generated for each teacher to print out or sync to their phone.
3. **The Class View:** A single clean schedule to print out and frame on the wall of each homeroom classroom.

---

## Feature Verification Checklist

Review how these critical real-world items match up against your development roadmap:

```
[ ] Specialized Room Constraints (Labs, Gyms)
[ ] Combined Streams / Parallel Elective Slots
[ ] Teacher Availability Blocks (Part-Time / Contract limits)
[ ] Maximum Consecutive Lesson Caps (Max 3 in a row)
[ ] Minimizing Empty "Gaps" for staff schedules
[ ] Live Drag-and-Drop Conflict Highlighting
[ ] Multi-view PDF Export (Master, Teacher, Class schedules)

```
