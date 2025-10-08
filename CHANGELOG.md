# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-10-08

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