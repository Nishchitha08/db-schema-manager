# DB Schema Manager

A database schema management tool for embedded systems. Defines inbound/outbound message tables and state transition tables, then generates binary database files for use in C++ runtime wrappers.

## Architecture

- **Schema definitions** (JSON) define tables and fields
- **Binary generator** compiles schemas into `.db` binary format
- **C++ wrappers** parse and initialize the binary DB at runtime

## Tables

- `inbound_table` — Messages received from external systems
- `outbound_table` — Messages sent to external systems
- `transition_table` — State machine transitions linking inbound events to outbound actions

## Build

```bash
node generate-binary.js --schema ./schemas --output ./build/database.db
```
