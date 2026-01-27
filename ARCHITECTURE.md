# CodaJS Architecture

## Overview

CodaJS is built on Electron with a multi-process architecture designed for secure, isolated JavaScript execution.

## Process Architecture

### Main Process (`src/main/`)

- Window management and lifecycle
- IPC bridge for inter-process communication
- Runtime orchestration (Node, Deno, Bun)
- Permission management
- Settings persistence

### Renderer Process (`src/renderer/`)

- Monaco editor integration
- React-based UI components
- Console and value inspector
- Layout management

### Utility Process (`src/utility/`)

- Isolated script execution
- V8 isolate management
- Security sandboxing

### Preload Script (`src/preload/`)

- Secure IPC bridge
- Context isolation bridge
- API exposure to renderer

## Core Systems

### Runtime System (`src/runtimes/`)

- Base adapter interface
- Node.js, Deno, and Bun implementations
- Sidecar binary management
- Runtime version detection

### Execution Engine (`src/execution/`)

- Isolate host for secure execution
- Script executor with dependency resolution
- Serializer for circular references
- Permission checking

### Virtual File System (`src/vfs/`)

- In-memory file management
- Monaco editor integration
- Workspace management
- Type acquisition

### Dependency Management (`src/dependencies/`)

- Import/require parsing
- Magic comment parsing
- Package installation
- Tiered caching system

### Inspector Protocol (`src/inspector/`)

- Chrome DevTools Protocol client
- Checkpoint management
- Async operation tracking

### Plugin System (`src/plugins/`)

- Base plugin interface
- Plugin manager
- Hook system

## Data Flow

1. User writes code in Monaco editor
2. Code is sent to main process via IPC
3. Script executor parses dependencies and permissions
4. Runtime manager selects appropriate runtime
5. Code executes in isolated environment
6. Results are serialized and sent back to renderer
7. Console and inspector display results

## Security Model

- Zero Trust permission system
- V8 isolate sandboxing
- Capability-based permissions
- Secret masking
- Integrity checking for cached packages

## Performance Optimizations

- Lazy module loading
- ASAR bundling
- V8 snapshots (planned)
- Deferred initialization
- Efficient IPC serialization
