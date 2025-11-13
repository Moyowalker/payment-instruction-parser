/**
 * Payment Instruction Parser - Constants
 *
 * This module defines all constants used across the payment instruction processing system.
 * Centralizing constants ensures consistency and makes maintenance easier.
 */

/**
 * Supported currencies for transactions
 * All currency codes must be uppercase in responses
 */
const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

/**
 * Valid characters for account IDs
 * Allowed: letters (a-z, A-Z), numbers (0-9), hyphens (-), periods (.), at symbols (@)
 */
const VALID_ACCOUNT_ID_CHARS = /^[a-zA-Z0-9\-.@]+$/;

/**
 * Instruction keywords
 * These keywords define the structure of payment instructions
 */
const KEYWORDS = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  FROM: 'FROM',
  TO: 'TO',
  ACCOUNT: 'ACCOUNT',
  FOR: 'FOR',
  ON: 'ON',
};

/**
 * Transaction status codes
 * Following the specification for consistent error reporting
 */
const STATUS_CODES = {
  // Success codes
  SUCCESS: 'AP00',
  PENDING: 'AP02',

  // Amount validation errors
  INVALID_AMOUNT: 'AM01',

  // Currency validation errors
  CURRENCY_MISMATCH: 'CU01',
  UNSUPPORTED_CURRENCY: 'CU02',

  // Account validation errors
  INSUFFICIENT_FUNDS: 'AC01',
  SAME_ACCOUNT: 'AC02',
  ACCOUNT_NOT_FOUND: 'AC03',
  INVALID_ACCOUNT_FORMAT: 'AC04',

  // Date validation errors
  INVALID_DATE_FORMAT: 'DT01',

  // Syntax/parsing errors
  MISSING_KEYWORD: 'SY01',
  INVALID_KEYWORD_ORDER: 'SY02',
  MALFORMED_INSTRUCTION: 'SY03',
};

/**
 * Status messages corresponding to status codes
 * These provide human-readable explanations for each status
 */
const STATUS_MESSAGES = {
  [STATUS_CODES.SUCCESS]: 'Transaction executed successfully',
  [STATUS_CODES.PENDING]: 'Transaction scheduled for future execution',
  [STATUS_CODES.INVALID_AMOUNT]: 'Amount must be a positive integer',
  [STATUS_CODES.CURRENCY_MISMATCH]: 'Account currency mismatch',
  [STATUS_CODES.UNSUPPORTED_CURRENCY]:
    'Unsupported currency. Only NGN, USD, GBP, and GHS are supported',
  [STATUS_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds in debit account',
  [STATUS_CODES.SAME_ACCOUNT]: 'Debit and credit accounts cannot be the same',
  [STATUS_CODES.ACCOUNT_NOT_FOUND]: 'Account not found',
  [STATUS_CODES.INVALID_ACCOUNT_FORMAT]: 'Invalid account ID format',
  [STATUS_CODES.INVALID_DATE_FORMAT]: 'Invalid date format. Expected YYYY-MM-DD',
  [STATUS_CODES.MISSING_KEYWORD]: 'Missing required keyword in instruction',
  [STATUS_CODES.INVALID_KEYWORD_ORDER]: 'Invalid keyword order in instruction',
  [STATUS_CODES.MALFORMED_INSTRUCTION]: 'Malformed instruction: unable to parse',
};

/**
 * Transaction statuses
 */
const TRANSACTION_STATUS = {
  SUCCESSFUL: 'successful',
  PENDING: 'pending',
  FAILED: 'failed',
};

/**
 * Transaction types
 */
const TRANSACTION_TYPES = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
};

/**
 * Date format for validation
 * Expected format: YYYY-MM-DD
 */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

module.exports = {
  SUPPORTED_CURRENCIES,
  VALID_ACCOUNT_ID_CHARS,
  KEYWORDS,
  STATUS_CODES,
  STATUS_MESSAGES,
  TRANSACTION_STATUS,
  TRANSACTION_TYPES,
  DATE_FORMAT_REGEX,
};
