# Changelog

All notable changes to this project will be documented in this file.

### [0.1.7](https://github.com/Namp88/hoosat-sdk/compare/v0.1.6...v0.1.7) (2025-10-10)

### 🐛 Bug Fixes

- update logic for calculate fee based on util\txmass\calculator.go in HTND. Up the minimum fee to 3250 ([eef66f0](https://github.com/Namp88/hoosat-sdk/commit/eef66f0801d8fcc7182eaa83dd7edf7dd5428998))

### [0.1.6](https://github.com/Namp88/hoosat-sdk/compare/v0.1.5...v0.1.6) (2025-10-08)

### 🐛 Bug Fixes

- Path to node EventEmitter in UtxoChangeStream imports ([025f2a3](https://github.com/Namp88/hoosat-sdk/commit/025f2a3b1fb93df0c03164ed648b0effc399db8f))

### [0.1.5](https://github.com/Namp88/hoosat-sdk/compare/v0.1.4...v0.1.5) (2025-10-08)

### 📝 Documentation

- edit CHANGELOG.md ([0d615c4](https://github.com/Namp88/hoosat-sdk/commit/0d615c4a55f567c9a05ae2542db00672f111d866))

### 🔨 Build System

- Reduced publish:npm command from package.json ([eca6433](https://github.com/Namp88/hoosat-sdk/commit/eca6433225cd3b1fa913c985f26cb7486c89f7bc))

### 🐛 Bug Fixes

- path to node EventEmitter in event-manager imports ([6e49f73](https://github.com/Namp88/hoosat-sdk/commit/6e49f73b8e91fbe89d00c1bf85e3d0b0ec474cd3))

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
