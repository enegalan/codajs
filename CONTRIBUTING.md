# Contributing to CodaJS

Thank you for your interest in contributing to CodaJS! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/enegalan/codajs.git`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Write meaningful commit messages
- Add comments for complex logic

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass: `npm test`
4. Ensure code lints: `npm run lint`
5. Submit a pull request with a clear description

## Architecture Guidelines

- Main process code goes in `src/main/`
- Renderer process code goes in `src/renderer/`
- Shared types and utilities go in `src/shared/`
- Runtime adapters go in `src/runtimes/`
- Execution logic goes in `src/execution/`

## Testing

- Write unit tests for new features
- Test cross-platform compatibility when possible
- Test with different runtime versions (Node, Deno, Bun)

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
