/**
 * Transaction Executor
 *
 * Executes validated payment transactions by updating account balances.
 * Handles both immediate and pending transactions.
 */

const { TRANSACTION_STATUS } = require('./constants');

/**
 * Get the accounts involved in the transaction, maintaining request order
 * @param {object} validatedData - The validated instruction data
 * @param {array} accounts - Array of account objects from the request
 * @returns {array} Array of involved accounts ordered by debit then credit
 */
function getInvolvedAccounts(validatedData, accounts) {
  // If accounts cannot be identified (parsing failed), return empty array
  if (!validatedData.debit_account && !validatedData.credit_account) {
    return [];
  }

  // Create account map for lookup
  const accountMap = {};
  accounts.forEach((account) => {
    accountMap[account.account_id] = account;
  });

  // Return accounts in transaction order: debit account first, then credit account
  const result = [];
  if (validatedData.debit_account && accountMap[validatedData.debit_account]) {
    result.push(accountMap[validatedData.debit_account]);
  }
  if (validatedData.credit_account && accountMap[validatedData.credit_account]) {
    result.push(accountMap[validatedData.credit_account]);
  }

  return result;
}

/**
 * Execute a validated transaction
 * @param {object} validatedData - The validated instruction data
 * @param {array} accounts - Array of account objects from the request
 * @returns {object} Complete transaction response with updated account balances
 */
function executeTransaction(validatedData, accounts) {
  // Get the accounts involved in the transaction
  const involvedAccounts = getInvolvedAccounts(validatedData, accounts);

  // If transaction is pending or failed, return accounts unchanged
  if (
    validatedData.status === TRANSACTION_STATUS.PENDING ||
    validatedData.status === TRANSACTION_STATUS.FAILED
  ) {
    return {
      ...validatedData,
      accounts: involvedAccounts.map((account) => ({
        account_id: account.account_id,
        balance: account.balance,
        balance_before: account.balance,
        currency: account.currency.toUpperCase(),
      })),
    };
  }

  // Execute successful transaction - update balances
  const updatedAccounts = involvedAccounts.map((account) => {
    const balanceBefore = account.balance;
    let newBalance = account.balance;

    // Update balance based on account role in transaction
    if (account.account_id === validatedData.debit_account) {
      newBalance = account.balance - validatedData.amount;
    } else if (account.account_id === validatedData.credit_account) {
      newBalance = account.balance + validatedData.amount;
    }

    return {
      account_id: account.account_id,
      balance: newBalance,
      balance_before: balanceBefore,
      currency: account.currency.toUpperCase(),
    };
  });

  return {
    ...validatedData,
    accounts: updatedAccounts,
  };
}

module.exports = {
  executeTransaction,
};
