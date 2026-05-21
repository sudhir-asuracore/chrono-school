# ChronoSchool User Guide

Welcome to ChronoSchool, an open-source automated school timetable generator. This guide will help you navigate the platform and efficiently manage your school's scheduling needs.

---

## 1. Introduction

ChronoSchool uses an advanced AI-powered optimization engine (Google OR-Tools) to generate conflict-free school timetables based on your specific constraints, including teacher availability, room requirements, and curriculum needs.

---

## 2. Resource Management

Before generating a timetable, you must define your school's resources.

### Subjects
- **Manage Subjects**: Navigate to the **Subjects** page.
- **Attributes**: Define subject names, whether they require "Double Periods" (consecutive slots), and the required room type (e.g., Science Lab, Gym).
- **Colors**: Assign colors to subjects for easy identification in the timetable grid.

### Teachers
- **Manage Teachers**: Navigate to the **Teachers** page.
- **Qualifications**: Link teachers to the subjects and levels (e.g., Grade 9, High School) they are qualified to teach.
- **Availability**: Set maximum slots per week and define specific availability using the matrix.
- **Colors**: Assign a unique color to each teacher for visual tracking.

### Rooms
- **Manage Rooms**: Navigate to the **Rooms** page.
- **Room Types**: Categorize rooms (General, Science Lab, Gym) to match subject requirements.

### Classes
- **Manage Classes**: Navigate to the **Classes** page.
- **Curriculum**: For each class (grade/stream), define the subjects and the number of periods required per week.
- **Levels**: Assign classes to levels (e.g., Middle School, High School) to match teacher qualifications.

---

## 3. Generating a Timetable

The **Scheduler** page is where the AI solver generates your timetables.

### Configuration Settings
Click the **Generate Schedule** button to open the settings:
- **Weekly Holidays**: Select days of the week where no lessons should be scheduled (e.g., Sat/Sun).
- **Teacher Vacations**: Mark specific days off for individual teachers.

### The Generation Process
1. Click **Generate Schedule** after configuring your settings.
2. The system creates a "Job" which is processed asynchronously by the core engine.
3. You can monitor the status (**Pending**, **Processing**, **Completed**, or **Failed**) on the dashboard.

### Analyzing Results
Once completed, the system provides:
- **Quality Metrics**: Indicates if the solution is `OPTIMAL` or `FEASIBLE`.
- **Validation Errors**: If `INFEASIBLE`, it lists the conflicting constraints (e.g., teacher overloaded).
- **Statistics**: Overview of overloaded teachers, free teachers, and any unassigned lessons.

---

## 4. Managing the Timetable

Use the interactive grid to view and fine-tune your schedule.

### Viewing & Filtering
- **Filter by Class**: View the full weekly schedule for a specific grade/stream.
- **Filter by Teacher**: View the movement and load of an individual teacher.

### Interactive Grid Actions
- **Manual Moves**: Click a lesson, then click an empty slot to move it.
- **Manual Entry**: Click an empty slot to manually add a lesson.
- **Pinning**: Use the **Pin** icon on a lesson to lock it in place. Pinned lessons are preserved if you decide to "Refine" (re-generate) the timetable.
- **Deletion**: Use the **X** icon to remove a specific lesson entry.

### Conflict Detection
ChronoSchool highlights manual errors in real-time:
- **Red Highlighting**: Indicates a hard constraint violation (e.g., Teacher or Room double-booking).
- **Conflict Details**: Hover over the "Conflict" badge to see exactly what rule is being broken.

### Teacher Substitutions
If a teacher is unavailable, click the **User Plus** icon on a lesson slot. The system will recommend qualified, free teachers for that specific time.

---

## 5. Saving & Exporting

### Saved Vault
- **Saving**: Give your timetable a name and click **Save**.
- **Loading**: Access the **Saved Vault** dropdown to load previous schedules or "Load as Copy" to create variations.
- **Stale Indicators**: If you delete a teacher or subject that was part of a saved timetable, the system will flag those entries as "Stale."

### Exporting
Click the **Download** icon to export your timetable:
- **Formats**: PDF (for printing), CSV, or XLS (for data processing).
- **Scope**: Export the current view (single class/teacher) or the entire school's schedule.

---

## 6. Administration

The **Administration** page provides tools for system maintenance and data portability.

### Educational Levels
- **Manage Levels**: Define global educational levels (e.g., "Middle School", "High School") used to categorize classes and teacher qualifications.

### Data Portability
- **Export Data**: Download all school records (teachers, subjects, classes, rooms, and levels) as a single JSON file for backup or migration.
- **Import Data**: Upload a previously exported JSON file to restore your school's configuration. The system automatically handles dependencies and prevents duplicates.

### System Purge
- **Wipe Data**: Permanently delete selected categories of data (e.g., clear all classes or all teachers) to reset specific parts of your configuration.

---

## 7. Dashboard Overview

The **Dashboard** provides a high-level summary of your school's data:
- Quick stats on total teachers, subjects, and classes.
- A **Weekly Overview** grid for a read-only view of any saved timetable.
- Direct links to modify existing schedules.
