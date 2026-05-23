# ChronoSchool Desktop

ChronoSchool is a school timetable scheduling application consolidated into a single desktop application using [Wails](https://wails.io/), Go, and SQLite.

## Features

- **Automated Scheduling**: Powered by a high-performance Python solver using Google OR-Tools.
- **Local Storage**: All data is stored locally in a SQLite database (`chronoschool.db`).
- **Modern UI**: React-based frontend embedded within the desktop application.
- **Single Executable**: No need for Docker, Postgres, or Redis.

## Getting Started

For detailed instructions on how to use the application, please refer to the [User Guide](USER_GUIDE.md).

### Prerequisites

- [Go](https://golang.org/dl/) (version 1.25+)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)
- [Node.js & NPM](https://nodejs.org/en/download/) (for frontend development)
- [Python 3.10+](https://www.python.org/downloads/) (for solver development)

### Running in Development

1.  **Build the Solver**:
    The backend expects the solver binary at `./bin/solver`.
    ```bash
    cd solver-src
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt pyinstaller pyinstaller-hooks-contrib
    pyinstaller solver.spec
    mkdir -p ../bin
    cp dist/solver ../bin/
    ```

2.  **Run Wails Dev**:
    ```bash
    wails dev
    ```

### Building for Production

To build the standalone application for your current platform:
```bash
wails build
```

### Cross-Compilation
By default, `wails build` targets your current operating system. 

#### Windows
You can cross-compile for Windows from Linux or macOS using the `-platform` flag (requires `mingw-w64` on Linux):
```bash
wails build -platform windows/amd64
```

#### macOS
**Note**: Cross-compiling for macOS from other platforms is **not currently supported** by Wails v2. To build for macOS, you must run the build command on a macOS machine, or use a CI/CD pipeline with macOS runners (e.g., GitHub Actions).

```bash
# Build for macOS (must be run on macOS)
wails build -platform darwin/universal
```

**Note on Sidecars**: `wails build` does not automatically cross-compile the Python solver. You must ensure the correct `solver` binary (built for the target OS) is available and bundled as described in the platform-specific sections below.

#### Windows Specifics
When building for Windows, you also need to ensure the solver is built as a `.exe`.

**Option 1: Build on Windows**
1.  **Build the Solver**:
    ```powershell
    cd solver-src
    python -m venv venv
    .\venv\Scripts\activate
    pip install -r requirements.txt pyinstaller pyinstaller-hooks-contrib
    pyinstaller solver.spec
    copy dist\solver.exe ..\bin\
    ```
2.  **Build Wails App**:
    ```bash
    wails build
    ```

**Option 2: Cross-compile from Linux (using Docker)**
If you are on Linux, you can cross-compile the solver using the provided script:
1.  **Run the build script**:
    ```bash
    ./scripts/build_solver_windows.sh
    ```
    This requires Docker and will produce `bin/solver.exe`.
2.  **Build Wails App** (requires `mingw-w64`):
    ```bash
    wails build -platform windows/amd64
    ```

3.  **Distribution**:
    The final executable is in `build/bin/desktop-app.exe`. To run it, ensure `solver.exe` is either in a `bin/` folder next to the app, or in the same directory as the app.

#### macOS and Linux Specifics
1.  **Build the Solver**:
    ```bash
    cd solver-src
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt pyinstaller pyinstaller-hooks-contrib
    pyinstaller solver.spec
    mkdir -p ../bin
    cp dist/solver ../bin/
    ```
2.  **Build Wails App**:
    ```bash
    wails build
    ```
3.  **Distribution (Linux)**:
    The binary is in `build/bin/desktop-app`. Ensure `solver` is in a `bin/` folder next to it.
4.  **Distribution (macOS)**:
    The app bundle is `build/bin/desktop-app.app`. To bundle the solver inside:
    ```bash
    mkdir -p build/bin/desktop-app.app/Contents/MacOS/bin
    cp bin/solver build/bin/desktop-app.app/Contents/MacOS/bin/
    ```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (located in `frontend/`).
- **Backend**: Go with Echo web framework (located in `internal/`).
- **Database**: SQLite (initialized via `internal/db/sqlite_init.sql`).
- **Solver**: Python CLI application bundled as a sidecar binary.

## License

MIT
