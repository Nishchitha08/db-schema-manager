/**
 * Binary Database Generator
 * Compiles JSON schema definitions into a binary .db file
 * for use by C++ runtime wrappers.
 *
 * Usage: node generate-binary.js --schema ./schemas --output ./build/database.db
 */

const fs = require("fs");
const path = require("path");

// Type sizes in bytes for binary layout
const TYPE_SIZES = {
  uint8: 1,
  uint16: 2,
  uint32: 4,
  uint64: 8,
  int8: 1,
  int16: 2,
  int32: 4,
  int64: 8,
  float32: 4,
  float64: 8,
  string: null, // variable, uses maxLength
};

/**
 * Parse command line arguments.
 * @returns {{ schemaDir: string, outputPath: string }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let schemaDir = "./schemas";
  let outputPath = "./build/database.db";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--schema" && args[i + 1]) {
      schemaDir = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  return { schemaDir, outputPath };
}

/**
 * Load all JSON schema files from a directory.
 * @param {string} dir - Schema directory path
 * @returns {object[]} Array of parsed schema objects
 */
function loadSchemas(dir) {
  const schemaFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const schemas = [];

  for (const file of schemaFiles) {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const schema = JSON.parse(content);
    schema._sourceFile = file;
    schemas.push(schema);
  }

  console.log(`[Generator] Loaded ${schemas.length} schema(s)`);
  return schemas;
}

/**
 * Calculate the byte size of a single record for a table.
 * @param {object} schema - Table schema
 * @returns {number} Record size in bytes
 */
function calculateRecordSize(schema) {
  let size = 0;
  for (const field of schema.fields) {
    if (field.type === "string") {
      size += field.maxLength || 64;
    } else {
      size += TYPE_SIZES[field.type] || 4;
    }
  }
  return size;
}

/**
 * Generate the binary header for the database file.
 * @param {object[]} schemas - All table schemas
 * @returns {Buffer} Header buffer
 */
function generateHeader(schemas) {
  // Header format:
  // [4 bytes] Magic number (0x44425343 = "DBSC")
  // [2 bytes] Version (1)
  // [2 bytes] Number of tables
  // [4 bytes] Total file size (filled later)
  const header = Buffer.alloc(12);
  header.writeUInt32BE(0x44425343, 0); // Magic
  header.writeUInt16BE(1, 4);          // Version
  header.writeUInt16BE(schemas.length, 6); // Table count
  header.writeUInt32BE(0, 8);          // Total size placeholder
  return header;
}

/**
 * Generate a table descriptor buffer.
 * @param {object} schema - Table schema
 * @param {number} dataOffset - Offset where table data starts
 * @returns {Buffer} Table descriptor buffer
 */
function generateTableDescriptor(schema, dataOffset) {
  // Table descriptor format:
  // [32 bytes] Table name (padded)
  // [2 bytes] Field count
  // [4 bytes] Record size
  // [4 bytes] Max records
  // [4 bytes] Data offset
  const descriptor = Buffer.alloc(46);
  descriptor.write(schema.tableName.padEnd(32, "\0"), 0, 32, "utf8");
  descriptor.writeUInt16BE(schema.fields.length, 32);
  descriptor.writeUInt32BE(calculateRecordSize(schema), 34);
  descriptor.writeUInt32BE(schema.maxRecords, 38);
  descriptor.writeUInt32BE(dataOffset, 42);
  return descriptor;
}

/**
 * Compile schemas into a single binary database file.
 * @param {object[]} schemas - Table schemas
 * @param {string} outputPath - Output file path
 */
function compileToBinary(schemas, outputPath) {
  const header = generateHeader(schemas);
  const descriptors = [];
  let currentOffset = 12 + schemas.length * 46; // After header + descriptors

  for (const schema of schemas) {
    const descriptor = generateTableDescriptor(schema, currentOffset);
    descriptors.push(descriptor);

    const recordSize = calculateRecordSize(schema);
    const tableSize = recordSize * schema.maxRecords;
    currentOffset += tableSize;
  }

  // Update total file size in header
  header.writeUInt32BE(currentOffset, 8);

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fd = fs.openSync(outputPath, "w");
  fs.writeSync(fd, header);
  for (const desc of descriptors) {
    fs.writeSync(fd, desc);
  }

  // Write empty data sections for each table
  for (const schema of schemas) {
    const recordSize = calculateRecordSize(schema);
    const tableData = Buffer.alloc(recordSize * schema.maxRecords);
    fs.writeSync(fd, tableData);
  }

  fs.closeSync(fd);
  console.log(`[Generator] Binary database written to: ${outputPath}`);
  console.log(`[Generator] Total size: ${currentOffset} bytes`);
}

/**
 * Validate schemas before compilation.
 * @param {object[]} schemas - Schemas to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSchemas(schemas) {
  const errors = [];

  for (const schema of schemas) {
    if (!schema.tableName) {
      errors.push(`Schema in ${schema._sourceFile} missing tableName`);
    }
    if (!schema.fields || schema.fields.length === 0) {
      errors.push(`Table ${schema.tableName} has no fields`);
    }
    for (const field of schema.fields || []) {
      if (!TYPE_SIZES.hasOwnProperty(field.type)) {
        errors.push(`Table ${schema.tableName}: unknown type "${field.type}" for field "${field.name}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Main execution
function main() {
  const { schemaDir, outputPath } = parseArgs();

  console.log(`[Generator] Schema directory: ${schemaDir}`);
  console.log(`[Generator] Output path: ${outputPath}`);

  const schemas = loadSchemas(schemaDir);
  const validation = validateSchemas(schemas);

  if (!validation.valid) {
    console.error("[Generator] Validation errors:");
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  compileToBinary(schemas, outputPath);
  console.log("[Generator] Done.");
}

main();
