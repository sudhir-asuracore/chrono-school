# ChronoSchool User Guide

Welcome to ChronoSchool, a powerful school timetable scheduling application. This guide will help you understand how to set up your school's data and generate optimized timetables.

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Data Setup](#data-setup)
    - [Educational Levels](#educational-levels)
    - [Subjects](#subjects)
    - [Rooms](#rooms)
    - [Teachers](#teachers)
    - [Classes](#classes)
4. [Generating Timetables](#generating-timetables)
    - [Solving](#solving)
    - [Validation and Troubleshooting](#validation-and-troubleshooting)
5. [Managing Results](#managing-results)
    - [Reviewing the Schedule](#reviewing-the-schedule)
    - [Saving and Loading](#saving-and-loading)
6. [Advanced Features](#advanced-features)
    - [Session Bindings (Electives)](#session-bindings)
    - [Teacher Availability](#teacher-availability)
7. [Admin Operations](#admin-operations)
    - [Import/Export](#import-export)
    - [Clearing Data](#clearing-data)

---

## 1. Introduction
ChronoSchool uses a high-performance constraint solver (Google OR-Tools) to find the best possible schedule for your school, respecting various constraints like teacher availability, room requirements, and curriculum needs.

## 2. Getting Started
To run ChronoSchool:
1. Ensure you have the `solver` (or `solver.exe` on Windows) binary in the `bin/` directory relative to the application.
2. Run the application:
    - **Windows**: Double-click `desktop-app.exe`.
    - **macOS/Linux**: Run the built binary from the terminal or application folder.
3. Open the application window. The dashboard provides an overview of your current data.

### Running on Windows
If you are running the application on Windows for the first time:
- **WebView2**: ChronoSchool requires the Microsoft Edge WebView2 runtime. It is pre-installed on Windows 10/11, but if it's missing, you can download it from Microsoft's website.
- **Sidecar Solver**: Ensure `solver.exe` is placed in a folder named `bin` next to `desktop-app.exe`, or in the same folder as the main executable.

### Running on macOS
- **App Bundle**: On macOS, ChronoSchool is packaged as a `.app` bundle.
- **Sidecar Solver**: Ensure the `solver` binary is placed inside the bundle at `Contents/MacOS/bin/solver`.
- **Security**: Since the app is not notarized, you may need to right-click the app and select "Open" to bypass the "unidentified developer" warning.

### Running on Linux
- **Execution Permission**: You may need to ensure both the main binary and the solver sidecar have execution permissions:
  ```bash
  chmod +x desktop-app
  chmod +x bin/solver
  ```
- **Dependencies**: Ensure `webkit2gtk` is installed (common on most modern Linux desktop environments).

## 3. Data Setup
Data setup follows a logical order where each step may depend on the previous ones.

### Educational Levels
Define the different levels in your school (e.g., "Middle School", "High School"). This is used to match teacher qualifications with class requirements.
- **Where**: Admin Page -> Educational Levels section.

### Subjects
List all subjects taught at your school.
- **Required Room Type**: (Optional) Specify if a subject needs a specific type of room (e.g., "Science Lab").
- **Double Periods**: Check "Requires Double Period" if the subject should always be scheduled in two-period blocks.
- **Color**: Assign a color for easy identification in the timetable grid.

### Rooms
Add the classrooms and labs available.
- **Room Type**: Ensure this matches the "Required Room Type" specified for subjects.

### Teachers
Define your teaching staff and their constraints.
- **Max Slots per Week**: The maximum number of periods this teacher can work.
- **Qualifications**: Link teachers to subjects and educational levels they are authorized to teach.
- **Availability**: Mark the slots when the teacher is available to work. The solver will never assign a lesson during an unavailable slot.

### Classes
Create your student groups (e.g., "Grade 10A").
- **Level**: Assign the educational level.
- **Curriculum**: For each subject, specify how many periods per week are required.
- **Session Binding**: (Optional) Use a shared ID to group lessons that must happen simultaneously (e.g., when Grade 10A and 10B have different languages at the same time).

## 4. Generating Timetables
Once your data is entered, navigate to the **Scheduler** page.

### System Defaults
By default, ChronoSchool is configured with the following settings:
- **Work Week**: Monday to Friday.
- **Periods**: 8 periods per day.
- **Lunch Break**: Automatically scheduled at **Period 5** (Slot Index 4) for all classes and teachers. No lessons will be assigned during this time.
- **Solver Timeout**: The solver will search for up to 60 seconds before returning the best result found.

### Solving
Click the **"Solve"** (Play icon) button to start the generation process.
- The solver will attempt to find a valid assignment for every lesson in every class's curriculum.
- This process typically takes a few seconds to a minute depending on the complexity.

### Validation and Troubleshooting
If the solver cannot find a valid schedule, it will return an **INFEASIBLE** status with specific error messages:
- **No qualified teacher**: You assigned a subject to a class, but no teacher is qualified for that subject/level.
- **Insufficient capacity**: The total "Max Slots" of qualified teachers is less than the number of periods required by all classes.
- **Room shortage**: Not enough rooms of a specific type are available.
- **Over-constrained availability**: Teacher availability conflicts too much with the curriculum requirements.

**Tip**: Start with fewer constraints and gradually add them to find which one is causing the infeasibility.

## 5. Managing Results

### Reviewing the Schedule
The resulting timetable shows:
- **Grid View**: A weekly view for each class.
- **Unassigned Lessons**: Any lessons that couldn't be scheduled (if the solver was allowed to return a partial result).
- **Teacher Load**: Check if any teachers are at their maximum capacity.

### Saving and Loading
- **Save**: Give your timetable a name and save it to the local database.
- **Load**: Access previously saved timetables from the dropdown menu in the Scheduler.
- **Stale Warning**: If you modify teachers, subjects, or classes after saving a timetable, it will be marked as "Stale," indicating it may no longer be valid.

## 6. Advanced Features

### Session Bindings
Useful for elective subjects or "split" classes.
- Give the same **Binding ID** to curriculum items in different classes (e.g., "French" in 9A and "German" in 9B).
- The solver will ensure these lessons happen at the same time, though they may use different teachers and rooms.

### Teacher Availability
You can fine-tune teacher schedules by clicking "Edit Availability" in the Teacher profile. This allows for:
- Part-time schedules.
- Fixed days off.
- Preferred working hours.

## 7. Admin Operations

### Import/Export
Save time by using the JSON import/export feature on the **Admin** page.
- **Export**: Back up your entire school configuration to a `.json` file.
- **Import**: Load a configuration from a file. This is useful for migrating data or starting a new school year based on a previous template.

### Clearing Data
Use the Admin page to selectively clear data (e.g., "Clear all Timetables" or "Clear all Teachers") when you need a fresh start.
