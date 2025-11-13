/**
 * Payment Instruction Parser
 *
 * Parses natural language payment instructions into structured data.
 * Uses token-based parsing (no regex) for better maintainability and error reporting.
 *
 * Supported formats:
 * 1. DEBIT [amount] [currency] FROM ACCOUNT [id] FOR CREDIT TO ACCOUNT [id] [ON date]
 * 2. CREDIT [amount] [currency] TO ACCOUNT [id] FOR DEBIT FROM ACCOUNT [id] [ON date]
 */

const {
  KEYWORDS,
  TRANSACTION_TYPES,
  STATUS_CODES,
  STATUS_MESSAGES,
  TRANSACTION_STATUS,
} = require('./constants');

/**
 * Find the index of a keyword in the tokens array (case-insensitive)
 * @param {string[]} tokens - Array of instruction tokens
 * @param {string} keyword - The keyword to find
 * @param {number} startIndex - Index to start searching from
 * @returns {number} Index of keyword, or -1 if not found
 */
function findKeywordIndex(tokens, keyword, startIndex = 0) {
  for (let i = startIndex; i < tokens.length; i += 1) {
    if (tokens[i].toUpperCase() === keyword) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse DEBIT format instruction
 * Format: DEBIT [amount] [currency] FROM ACCOUNT [id] FOR CREDIT TO ACCOUNT [id] [ON date]
 */
function parseDebitFormat(tokens) {
  const result = {
    type: TRANSACTION_TYPES.DEBIT,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
    status: TRANSACTION_STATUS.FAILED,
    status_reason: '',
    status_code: '',
  };

  // Expected structure: DEBIT amount currency FROM ACCOUNT id FOR CREDIT TO ACCOUNT id [ON date]
  if (tokens.length < 11) {
    return {
      ...result,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'DEBIT instruction is incomplete',
    };
  }

  // Parse amount (token[1])
  const amountStr = tokens[1];
  const amount = Number(amountStr);
  if (Number.isNaN(amount)) {
    return {
      ...result,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Invalid or missing amount',
    };
  }

  // Parse currency (token[2])
  const currency = tokens[2].toUpperCase();

  // Validate keyword order: FROM (token[3])
  if (tokens[3].toUpperCase() !== KEYWORDS.FROM) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected FROM after currency, found: ${tokens[3]}`,
    };
  }

  // Validate ACCOUNT keyword (token[4])
  if (tokens[4].toUpperCase() !== KEYWORDS.ACCOUNT) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected ACCOUNT after FROM, found: ${tokens[4]}`,
    };
  }

  // Find the FOR keyword to extract debit account ID
  const forIndex = findKeywordIndex(tokens, KEYWORDS.FOR, 5);
  if (forIndex === -1) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.MISSING_KEYWORD,
      status_reason: 'Missing FOR keyword',
    };
  }

  // Extract debit account ID (between ACCOUNT and FOR)
  const debitAccountTokens = tokens.slice(5, forIndex);
  if (debitAccountTokens.length === 0) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Missing debit account ID',
    };
  }
  const debitAccount = debitAccountTokens.join(' ');

  // Validate: FOR CREDIT TO ACCOUNT
  if (tokens[forIndex + 1]?.toUpperCase() !== KEYWORDS.CREDIT) {
    return {
      ...result,
      amount,
      currency,
      debit_account: debitAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected CREDIT after FOR, found: ${tokens[forIndex + 1]}`,
    };
  }

  if (tokens[forIndex + 2]?.toUpperCase() !== KEYWORDS.TO) {
    return {
      ...result,
      amount,
      currency,
      debit_account: debitAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected TO after CREDIT, found: ${tokens[forIndex + 2]}`,
    };
  }

  if (tokens[forIndex + 3]?.toUpperCase() !== KEYWORDS.ACCOUNT) {
    return {
      ...result,
      amount,
      currency,
      debit_account: debitAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected ACCOUNT after TO, found: ${tokens[forIndex + 3]}`,
    };
  }

  // Find optional ON keyword for date
  const onIndex = findKeywordIndex(tokens, KEYWORDS.ON, forIndex + 4);

  // Extract credit account ID
  const creditAccountEndIndex = onIndex === -1 ? tokens.length : onIndex;
  const creditAccountTokens = tokens.slice(forIndex + 4, creditAccountEndIndex);
  if (creditAccountTokens.length === 0) {
    return {
      ...result,
      amount,
      currency,
      debit_account: debitAccount,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Missing credit account ID',
    };
  }
  const creditAccount = creditAccountTokens.join(' ');

  // Parse optional date
  let executeBy = null;
  if (onIndex !== -1) {
    const dateTokens = tokens.slice(onIndex + 1);
    if (dateTokens.length === 0) {
      return {
        ...result,
        amount,
        currency,
        debit_account: debitAccount,
        credit_account: creditAccount,
        status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
        status_reason: 'Missing date after ON keyword',
      };
    }
    executeBy = dateTokens.join(' ');
  }

  return {
    ...result,
    amount,
    currency,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
    status: TRANSACTION_STATUS.FAILED, // Will be updated by validator
    status_code: '', // Will be set by validator
    status_reason: '', // Will be set by validator
  };
}

/**
 * Parse CREDIT format instruction
 * Format: CREDIT [amount] [currency] TO ACCOUNT [id] FOR DEBIT FROM ACCOUNT [id] [ON date]
 */
function parseCreditFormat(tokens) {
  const result = {
    type: TRANSACTION_TYPES.CREDIT,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
    status: TRANSACTION_STATUS.FAILED,
    status_reason: '',
    status_code: '',
  };

  // Expected structure: CREDIT amount currency TO ACCOUNT id FOR DEBIT FROM ACCOUNT id [ON date]
  if (tokens.length < 11) {
    return {
      ...result,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'CREDIT instruction is incomplete',
    };
  }

  // Parse amount (token[1])
  const amountStr = tokens[1];
  const amount = Number(amountStr);
  if (Number.isNaN(amount)) {
    return {
      ...result,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Invalid or missing amount',
    };
  }

  // Parse currency (token[2])
  const currency = tokens[2].toUpperCase();

  // Validate keyword order: TO (token[3])
  if (tokens[3].toUpperCase() !== KEYWORDS.TO) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected TO after currency, found: ${tokens[3]}`,
    };
  }

  // Validate ACCOUNT keyword (token[4])
  if (tokens[4].toUpperCase() !== KEYWORDS.ACCOUNT) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected ACCOUNT after TO, found: ${tokens[4]}`,
    };
  }

  // Find the FOR keyword to extract credit account ID
  const forIndex = findKeywordIndex(tokens, KEYWORDS.FOR, 5);
  if (forIndex === -1) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.MISSING_KEYWORD,
      status_reason: 'Missing FOR keyword',
    };
  }

  // Extract credit account ID (between ACCOUNT and FOR)
  const creditAccountTokens = tokens.slice(5, forIndex);
  if (creditAccountTokens.length === 0) {
    return {
      ...result,
      amount,
      currency,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Missing credit account ID',
    };
  }
  const creditAccount = creditAccountTokens.join(' ');

  // Validate: FOR DEBIT FROM ACCOUNT
  if (tokens[forIndex + 1]?.toUpperCase() !== KEYWORDS.DEBIT) {
    return {
      ...result,
      amount,
      currency,
      credit_account: creditAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected DEBIT after FOR, found: ${tokens[forIndex + 1]}`,
    };
  }

  if (tokens[forIndex + 2]?.toUpperCase() !== KEYWORDS.FROM) {
    return {
      ...result,
      amount,
      currency,
      credit_account: creditAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected FROM after DEBIT, found: ${tokens[forIndex + 2]}`,
    };
  }

  if (tokens[forIndex + 3]?.toUpperCase() !== KEYWORDS.ACCOUNT) {
    return {
      ...result,
      amount,
      currency,
      credit_account: creditAccount,
      status_code: STATUS_CODES.INVALID_KEYWORD_ORDER,
      status_reason: `Expected ACCOUNT after FROM, found: ${tokens[forIndex + 3]}`,
    };
  }

  // Find optional ON keyword for date
  const onIndex = findKeywordIndex(tokens, KEYWORDS.ON, forIndex + 4);

  // Extract debit account ID
  const debitAccountEndIndex = onIndex === -1 ? tokens.length : onIndex;
  const debitAccountTokens = tokens.slice(forIndex + 4, debitAccountEndIndex);
  if (debitAccountTokens.length === 0) {
    return {
      ...result,
      amount,
      currency,
      credit_account: creditAccount,
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
      status_reason: 'Missing debit account ID',
    };
  }
  const debitAccount = debitAccountTokens.join(' ');

  // Parse optional date
  let executeBy = null;
  if (onIndex !== -1) {
    const dateTokens = tokens.slice(onIndex + 1);
    if (dateTokens.length === 0) {
      return {
        ...result,
        amount,
        currency,
        debit_account: debitAccount,
        credit_account: creditAccount,
        status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
        status_reason: 'Missing date after ON keyword',
      };
    }
    executeBy = dateTokens.join(' ');
  }

  return {
    ...result,
    amount,
    currency,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
    status: TRANSACTION_STATUS.FAILED, // Will be updated by validator
    status_code: '', // Will be set by validator
    status_reason: '', // Will be set by validator
  };
}

/**
 * Parse a payment instruction string
 * @param {string} instruction - The natural language instruction
 * @returns {object} Parsed instruction data with status information
 */
function parseInstruction(instruction) {
  try {
    // Normalize instruction: trim and handle multiple spaces
    const normalized = instruction.trim().replace(/\s+/g, ' ');

    // Split into tokens for parsing
    const tokens = normalized.split(' ');

    // Initialize error result structure
    const errorResult = {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: TRANSACTION_STATUS.FAILED,
      status_reason: '',
      status_code: '',
    };

    // Check if instruction is empty
    if (tokens.length === 0 || normalized === '') {
      return {
        ...errorResult,
        status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
        status_reason: STATUS_MESSAGES[STATUS_CODES.MALFORMED_INSTRUCTION],
      };
    }

    // Get transaction type from first keyword
    const firstKeyword = tokens[0].toUpperCase();

    if (firstKeyword === KEYWORDS.DEBIT) {
      return parseDebitFormat(tokens);
    }
    if (firstKeyword === KEYWORDS.CREDIT) {
      return parseCreditFormat(tokens);
    }
    return {
      ...errorResult,
      status_code: STATUS_CODES.MISSING_KEYWORD,
      status_reason: `Expected instruction to start with DEBIT or CREDIT, found: ${tokens[0]}`,
    };
  } catch (error) {
    // Handle unexpected parsing errors
    return {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: TRANSACTION_STATUS.FAILED,
      status_reason: STATUS_MESSAGES[STATUS_CODES.MALFORMED_INSTRUCTION],
      status_code: STATUS_CODES.MALFORMED_INSTRUCTION,
    };
  }
}

module.exports = {
  parseInstruction,
};
