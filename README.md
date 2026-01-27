# CodaJS

CodaJS is an open-source, cross-platform app for running and experimenting with JavaScript in a fast, isolated, and interactive environment on macOS, Windows, and Linux, built for developers who want immediate feedback without project setup.

## Features

- **Multi-Runtime Support**: Execute code with Node.js, Deno, or Bun
- **Monaco Editor**: Full-featured code editor with IntelliSense
- **Virtual File System**: Multi-file projects without physical directories
- **Isolated Execution**: Secure code execution using V8 isolates (optional, falls back to child_process)
- **Automatic Dependency Management**: Inline package declarations and automatic installation
- **Rich Console**: Interactive object inspection and time-travel debugging
- **Permission System**: Capability-based permissions for system access
- **Plugin System**: Extensible architecture for custom functionality

## Development

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended for best compatibility)
- npm or yarn

### Setup

```bash
npm install
```

**Note**: `isolated-vm` is an optional dependency. If it fails to build (common on Node.js 22+), the app will automatically fall back to using child_process execution. For the most secure execution, consider using Node.js 20 or wait for `isolated-vm` to support newer Node versions.

### Development Mode

```bash
npm run dev
```

This will:

- Build all processes (main, preload, renderer, utility)
- Watch for changes
- Launch Electron app

### Build

```bash
npm run build
```

### Package

```bash
npm run package
```

Platform-specific builds:

```bash
npm run package:mac
npm run package:win
npm run package:linux
```

## Architecture

CodaJS uses a multi-process Electron architecture:

- **Main Process**: Window management, runtime orchestration
- **Renderer Process**: Monaco editor and UI
- **Utility Process**: Isolated script execution

## License

Apache 2.0 - See LICENSE file for details.
