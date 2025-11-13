/**
 * Payment Instruction Service
 *
 * Main service orchestrator that coordinates parsing, validation, and execution
 * of payment instructions.
 */

const { parseInstruction } = require('./parser');
const { validateInstruction } = require('./validator');
const { executeTransaction } = require('./executor');

/**
 * Process a payment instruction
 * @param {object} requestData - The request payload containing instruction and accounts
 * @returns {object} Complete transaction response
 */
function processPaymentInstruction(requestData) {
  const { instruction, accounts } = requestData;

  // Step 1: Parse the instruction
  const parsedData = parseInstruction(instruction);

  // Step 2: Validate the parsed instruction
  const validatedData = validateInstruction(parsedData, accounts);

  // Step 3: Execute the transaction
  const result = executeTransaction(validatedData, accounts);

  return result;
}

module.exports = {
  processPaymentInstruction,
};
