# Changelog

All notable changes to this project will be documented in this file.

### [0.1.4](https://github.com/Namp88/hoosat-sdk/compare/v0.1.3...v0.1.4) (2025-10-08)

### 🔨 Build System

- setup automatic changelog generation with standard-version ([85a47f0](https://github.com/Namp88/hoosat-sdk/commit/85a47f09c4c7cb0c1d10026faf5af6d60197697a))

### ✨ Features

- **Event System**: Introduced `HoosatEventManager` for real-time blockchain events
  - Subscribe to UTXO changes via `client.events.subscribeToUtxoChanges()`
  - Automatic reconnection with exponential backoff
  - Multiple event types: `UtxoChange`, `Disconnect`, `Reconnected`, `Error`
  - Connection status monitoring with `client.events.getStats()`
  - Support for up to 1000 monitored addresses

### ♻️ Code Refactoring

- **Client API**: Restructured event handling
  - Moved from `client.subscribeToUtxoChanges()` to `client.events.subscribeToUtxoChanges()`
  - Events now accessed via `client.events.on(EventType.UtxoChange, handler)`
  - Improved cleanup with `client.events.disconnect()`

### 📝 Documentation

- Complete API documentation for `HoosatEventManager`
- Updated Quick Start guide with real-time streaming examples
- Added Best Practices section for event handling
- Comprehensive examples for all event types

---
