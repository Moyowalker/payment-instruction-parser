const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const { processPaymentInstruction } = require('@app/services/payment-instructions');
const { TRANSACTION_STATUS } = require('@app/services/payment-instructions/constants');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'payment-instruction-request-completed');
  },
  async handler(rc, helpers) {
    const payload = rc.body;

    // Validate request payload
    if (!payload || !payload.instruction || !payload.accounts) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          type: null,
          amount: null,
          currency: null,
          debit_account: null,
          credit_account: null,
          execute_by: null,
          status: TRANSACTION_STATUS.FAILED,
          status_reason: 'Request must include instruction and accounts',
          status_code: 'SY03',
          accounts: [],
        },
      };
    }

    // Validate accounts array
    if (!Array.isArray(payload.accounts)) {
      return {
        status: helpers.http_statuses.HTTP_400_BAD_REQUEST,
        data: {
          type: null,
          amount: null,
          currency: null,
          debit_account: null,
          credit_account: null,
          execute_by: null,
          status: TRANSACTION_STATUS.FAILED,
          status_reason: 'Accounts must be an array',
          status_code: 'SY03',
          accounts: [],
        },
      };
    }

    // Process the payment instruction
    const result = processPaymentInstruction(payload);

    // Determine HTTP status based on transaction status
    const httpStatus =
      result.status === TRANSACTION_STATUS.FAILED
        ? helpers.http_statuses.HTTP_400_BAD_REQUEST
        : helpers.http_statuses.HTTP_200_OK;

    return {
      status: httpStatus,
      data: result,
    };
  },
});
