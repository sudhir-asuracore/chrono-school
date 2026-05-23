#!/bin/bash
set -e

# This script builds the Python solver as a Windows executable (.exe) on Linux using Docker.
# It uses the batonogov/pyinstaller-windows image which contains Wine and Python.

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Creating bin directory..."
mkdir -p bin

echo "Building solver.exe using Docker (batonogov/pyinstaller-windows)..."
echo "This might take a while the first time as it downloads the Docker image."

docker run --rm \
    --entrypoint "" \
    -v "$PROJECT_ROOT:/src" \
    -w /src \
    batonogov/pyinstaller-windows:latest \
    sh -c "pip install -r solver-src/requirements.txt pyinstaller-hooks-contrib && \
           cd solver-src && \
           pyinstaller solver.spec --distpath ../bin"

# Rename 'solver' to 'solver.exe' if PyInstaller didn't do it automatically (it usually does on Windows target)
if [ -f "bin/solver" ] && [ ! -f "bin/solver.exe" ]; then
    mv bin/solver bin/solver.exe
fi

echo "--------------------------------------------------"
echo "Success! solver.exe is now in the bin/ directory."
echo "You can now build the Wails app for Windows using:"
echo "wails build -platform windows/amd64"
echo "--------------------------------------------------"
