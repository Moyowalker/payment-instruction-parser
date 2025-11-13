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
 * @returns {array} Array of involved accounts in original request order
 */
function getInvolvedAccounts(validatedData, accounts) {
  // If accounts cannot be identified (parsing failed), return empty array
  if (!validatedData.debit_account && !validatedData.credit_account) {
    return [];
  }

  // Get the account IDs involved in the transaction
  const involvedIds = new Set(
    [validatedData.debit_account, validatedData.credit_account].filter(Boolean)
  );

  // Filter accounts maintaining original request order
  return accounts.filter((account) => involvedIds.has(account.id));
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
        id: account.id,
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
    if (account.id === validatedData.debit_account) {
      newBalance = account.balance - validatedData.amount;
    } else if (account.id === validatedData.credit_account) {
      newBalance = account.balance + validatedData.amount;
    }

    return {
      id: account.id,
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
