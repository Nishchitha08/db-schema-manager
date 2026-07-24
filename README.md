# DB Schema Manager

A database schema management tool for embedded systems. Defines inbound/outbound message tables and state transition tables, then generates binary database files for use in C++ runtime wrappers.

## Architecture

- **Schema definitions** (JSON) define tables and fields
- **Binary generator** compiles schemas into `.db` binary format
- **C++ wrappers** parse and initialize the binary DB at runtime

## Tables

- `inbound_table` — Defines the format of messages received from external systems
- `outbound_table` — Defines the format of messages sent to external systems
- `transition_table` — Defines state machine transitions that link inbound events to outbound actions. While inbound/outbound tables describe message structure, the transition table describes the flow logic: given a current state and an inbound message, what outbound message to send and what state to move to next.

## Binary Generator Tool

The `generate-binary.js` script is the tool that compiles JSON schemas into the `.db` binary format. This binary file is consumed by the C++ runtime wrappers for fast, indexed access without JSON parsing overhead.

## C++ Wrapper Integration

**Status:** Not yet started. The C++ wrappers need to be updated to:
1. Parse the binary `.db` file header and table descriptors
2. Initialize table structures in memory at startup
3. Provide accessor APIs for querying inbound/outbound/transition records

## Build

```bash
node generate-binary.js --schema ./schemas --output ./build/database.db
```
