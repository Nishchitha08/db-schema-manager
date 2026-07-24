/**
 * Schema Validator
 * Validates table schemas and cross-references between tables.
 */

const fs = require("fs");
const path = require("path");

/**
 * Validate cross-references between inbound, outbound, and transition tables.
 * Ensures transition_table references valid inbound/outbound message IDs.
 * @param {object} inboundSchema - Inbound table schema
 * @param {object} outboundSchema - Outbound table schema
 * @param {object} transitionSchema - Transition table schema
 * @returns {{ valid: boolean, warnings: string[] }}
 */
function validateCrossReferences(inboundSchema, outboundSchema, transitionSchema) {
  const warnings = [];

  // Check that transition table references fields from inbound/outbound
  const inboundFields = inboundSchema.fields.map((f) => f.name);
  const outboundFields = outboundSchema.fields.map((f) => f.name);

  if (!inboundFields.includes("msg_id")) {
    warnings.push("Inbound table missing msg_id field (required for transition references)");
  }

  if (!outboundFields.includes("msg_id")) {
    warnings.push("Outbound table missing msg_id field (required for transition references)");
  }

  const transitionFields = transitionSchema.fields.map((f) => f.name);
  if (!transitionFields.includes("inbound_msg_id")) {
    warnings.push("Transition table missing inbound_msg_id field");
  }
  if (!transitionFields.includes("outbound_msg_id")) {
    warnings.push("Transition table missing outbound_msg_id field");
  }

  return { valid: warnings.length === 0, warnings };
}

/**
 * Validate field type compatibility for linked fields across tables.
 * @param {object[]} schemas - All table schemas
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFieldTypes(schemas) {
  const errors = [];
  const fieldMap = new Map();

  for (const schema of schemas) {
    for (const field of schema.fields) {
      const key = field.name;
      if (fieldMap.has(key)) {
        const existing = fieldMap.get(key);
        if (existing.type !== field.type) {
          errors.push(
            `Field "${key}" has mismatched types: ${existing.type} in ${existing.table} vs ${field.type} in ${schema.tableName}`
          );
        }
      } else {
        fieldMap.set(key, { type: field.type, table: schema.tableName });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateCrossReferences,
  validateFieldTypes,
};
