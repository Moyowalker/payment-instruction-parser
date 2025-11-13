/**
 * Payment Instruction Validator
 *
 * Validates parsed payment instructions against business rules.
 * Implements comprehensive validation for amounts, currencies, accounts, and dates.
 */

const {
  SUPPORTED_CURRENCIES,
  VALID_ACCOUNT_ID_CHARS,
  STATUS_CODES,
  STATUS_MESSAGES,
  TRANSACTION_STATUS,
  DATE_FORMAT_REGEX,
} = require('./constants');

/**
 * Validate amount is a positive integer
 */
function validateAmount(amount) {
  if (amount === null || amount === undefined) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_AMOUNT,
      reason: 'Amount is required',
    };
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_AMOUNT,
      reason: STATUS_MESSAGES[STATUS_CODES.INVALID_AMOUNT],
    };
  }

  return { valid: true };
}

/**
 * Validate currency is supported
 */
function validateCurrency(currency) {
  if (!currency) {
    return {
      valid: false,
      code: STATUS_CODES.UNSUPPORTED_CURRENCY,
      reason: 'Currency is required',
    };
  }

  if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
    return {
      valid: false,
      code: STATUS_CODES.UNSUPPORTED_CURRENCY,
      reason: STATUS_MESSAGES[STATUS_CODES.UNSUPPORTED_CURRENCY],
    };
  }

  return { valid: true };
}

/**
 * Validate account ID format
 * Must contain only letters, numbers, hyphens, periods, and at symbols
 */
function validateAccountIdFormat(accountId) {
  if (!accountId) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_ACCOUNT_FORMAT,
      reason: 'Account ID is required',
    };
  }

  if (!VALID_ACCOUNT_ID_CHARS.test(accountId)) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_ACCOUNT_FORMAT,
      reason: `${STATUS_MESSAGES[STATUS_CODES.INVALID_ACCOUNT_FORMAT]}: '${accountId}' contains invalid characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function validateDateFormat(dateString) {
  if (!DATE_FORMAT_REGEX.test(dateString)) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_DATE_FORMAT,
      reason: `${STATUS_MESSAGES[STATUS_CODES.INVALID_DATE_FORMAT]}: '${dateString}'`,
    };
  }

  // Validate it's an actual valid date
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return {
      valid: false,
      code: STATUS_CODES.INVALID_DATE_FORMAT,
      reason: `Invalid date: '${dateString}' does not represent a valid calendar date`,
    };
  }

  return { valid: true };
}

/**
 * Check if a date is in the future (UTC)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} True if date is in the future
 */
function isDateInFuture(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const targetDate = new Date(Date.UTC(year, month - 1, day));

  // Get current UTC date without time
  const now = new Date();
  const currentDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return targetDate > currentDate;
}

/**
 * Validate a parsed instruction against business rules
 * @param {object} parsedData - The parsed instruction data
 * @param {array} accounts - Array of account objects from the request
 * @returns {object} Validation result with updated status fields
 */
function validateInstruction(parsedData, accounts) {
  // If parsing already failed, return as-is
  if (parsedData.status_code) {
    return { ...parsedData };
  }

  // Create accounts map for quick lookups
  const accountsMap = {};
  accounts.forEach((account) => {
    accountsMap[account.account_id] = account;
  });

  // Validate amount
  const amountValidation = validateAmount(parsedData.amount);
  if (!amountValidation.valid) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: amountValidation.code,
      status_reason: amountValidation.reason,
    };
  }

  // Validate currency support
  const currencyValidation = validateCurrency(parsedData.currency);
  if (!currencyValidation.valid) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: currencyValidation.code,
      status_reason: currencyValidation.reason,
    };
  }

  // Validate account ID formats
  const debitFormatValidation = validateAccountIdFormat(parsedData.debit_account);
  if (!debitFormatValidation.valid) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: debitFormatValidation.code,
      status_reason: `Debit account: ${debitFormatValidation.reason}`,
    };
  }

  const creditFormatValidation = validateAccountIdFormat(parsedData.credit_account);
  if (!creditFormatValidation.valid) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: creditFormatValidation.code,
      status_reason: `Credit account: ${creditFormatValidation.reason}`,
    };
  }

  // Validate accounts exist
  const debitAccount = accountsMap[parsedData.debit_account];
  if (!debitAccount) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: STATUS_CODES.ACCOUNT_NOT_FOUND,
      status_reason: `Debit account '${parsedData.debit_account}' not found`,
    };
  }

  const creditAccount = accountsMap[parsedData.credit_account];
  if (!creditAccount) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: STATUS_CODES.ACCOUNT_NOT_FOUND,
      status_reason: `Credit account '${parsedData.credit_account}' not found`,
    };
  }

  // Validate accounts are different
  if (parsedData.debit_account === parsedData.credit_account) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: STATUS_CODES.SAME_ACCOUNT,
      status_reason: STATUS_MESSAGES[STATUS_CODES.SAME_ACCOUNT],
    };
  }

  // Validate currency match
  if (debitAccount.currency !== creditAccount.currency) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: STATUS_CODES.CURRENCY_MISMATCH,
      status_reason: `${STATUS_MESSAGES[STATUS_CODES.CURRENCY_MISMATCH]}: debit account uses ${debitAccount.currency}, credit account uses ${creditAccount.currency}`,
    };
  }

  // Validate instruction currency matches account currency
  if (parsedData.currency !== debitAccount.currency) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.FAILED,
      status_code: STATUS_CODES.CURRENCY_MISMATCH,
      status_reason: `${STATUS_MESSAGES[STATUS_CODES.CURRENCY_MISMATCH]}: instruction specifies ${parsedData.currency}, accounts use ${debitAccount.currency}`,
    };
  }

  // Validate date format if present
  if (parsedData.execute_by) {
    const dateValidation = validateDateFormat(parsedData.execute_by);
    if (!dateValidation.valid) {
      return {
        ...parsedData,
        status: TRANSACTION_STATUS.FAILED,
        status_code: dateValidation.code,
        status_reason: dateValidation.reason,
      };
    }
  }

  // Validate sufficient funds (only for immediate or past-dated transactions)
  const isFutureTransaction = parsedData.execute_by && isDateInFuture(parsedData.execute_by);

  if (!isFutureTransaction) {
    if (debitAccount.balance < parsedData.amount) {
      return {
        ...parsedData,
        status: TRANSACTION_STATUS.FAILED,
        status_code: STATUS_CODES.INSUFFICIENT_FUNDS,
        status_reason: `${STATUS_MESSAGES[STATUS_CODES.INSUFFICIENT_FUNDS]}: account ${debitAccount.id} has ${debitAccount.balance} ${debitAccount.currency}, needs ${parsedData.amount} ${parsedData.currency}`,
      };
    }
  }

  // All validations passed - determine if immediate or pending
  if (isFutureTransaction) {
    return {
      ...parsedData,
      status: TRANSACTION_STATUS.PENDING,
      status_code: STATUS_CODES.PENDING,
      status_reason: STATUS_MESSAGES[STATUS_CODES.PENDING],
    };
  }

  return {
    ...parsedData,
    status: TRANSACTION_STATUS.SUCCESSFUL,
    status_code: STATUS_CODES.SUCCESS,
    status_reason: STATUS_MESSAGES[STATUS_CODES.SUCCESS],
  };
}

module.exports = {
  validateInstruction,
  validateAmount,
  validateCurrency,
  validateAccountIdFormat,
  validateDateFormat,
  isDateInFuture,
};
