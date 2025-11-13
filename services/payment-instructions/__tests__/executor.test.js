/**
 * Executor Unit Tests
 * Tests transaction execution and balance updates
 */

const { executeTransaction } = require('../executor');

describe('Payment Instruction Executor', () => {
  describe('Successful Transaction Execution', () => {
    it('should update balances for immediate successful transaction', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].account_id).toBe('a');
      expect(result.accounts[0].balance).toBe(150);
      expect(result.accounts[1].account_id).toBe('b');
      expect(result.accounts[1].balance).toBe(350);
    });

    it('should update balances for past-dated successful transaction', () => {
      const validatedData = {
        type: 'CREDIT',
        amount: 100,
        currency: 'NGN',
        debit_account: 'acc-001',
        credit_account: 'acc-002',
        execute_by: '2024-01-15',
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'acc-001', balance: 500, currency: 'NGN' },
        { account_id: 'acc-002', balance: 200, currency: 'NGN' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(400);
      expect(result.accounts[1].balance).toBe(300);
    });

    it('should handle exact balance deduction', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 200,
        currency: 'GBP',
        debit_account: 'acc-x',
        credit_account: 'acc-y',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'acc-x', balance: 200, currency: 'GBP' },
        { account_id: 'acc-y', balance: 100, currency: 'GBP' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(0);
      expect(result.accounts[1].balance).toBe(300);
    });

    it('should handle large transaction amounts', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50000,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'a', balance: 100000, currency: 'USD' },
        { account_id: 'b', balance: 5000, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(50000);
      expect(result.accounts[1].balance).toBe(55000);
    });
  });

  describe('Pending Transaction Handling', () => {
    it('should preserve balances for future-dated pending transaction', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2026-09-20',
        status_code: 'AP02',
        status: 'pending',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
      expect(result.status).toBe('pending');
      expect(result.status_code).toBe('AP02');
    });

    it('should include execute_by date in pending transaction result', () => {
      const validatedData = {
        type: 'CREDIT',
        amount: 450,
        currency: 'NGN',
        debit_account: 'acc-001',
        credit_account: 'acc-002',
        execute_by: '2026-02-21',
        status_code: 'AP02',
        status: 'pending',
      };
      const accounts = [
        { account_id: 'acc-001', balance: 1000, currency: 'NGN' },
        { account_id: 'acc-002', balance: 500, currency: 'NGN' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.execute_by).toBe('2026-02-21');
      expect(result.accounts[0].balance).toBe(1000);
      expect(result.accounts[1].balance).toBe(500);
    });
  });

  describe('Failed Transaction Handling', () => {
    it('should preserve balances for insufficient funds failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 500,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AC01',
        status: 'failed',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
      expect(result.status).toBe('failed');
      expect(result.status_code).toBe('AC01');
    });

    it('should preserve balances for currency mismatch failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'gbp-acct',
        credit_account: 'a',
        execute_by: null,
        status_code: 'CU01',
        status: 'failed',
      };
      const accounts = [
        { account_id: 'gbp-acct', balance: 500, currency: 'GBP' },
        { account_id: 'a', balance: 200, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(500);
      expect(result.accounts[1].balance).toBe(200);
      expect(result.status).toBe('failed');
      expect(result.status_code).toBe('CU01');
    });

    it('should preserve balances for unsupported currency failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'EUR',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'CU02',
        status: 'failed',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'EUR' },
        { account_id: 'b', balance: 300, currency: 'EUR' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
      expect(result.status).toBe('failed');
      expect(result.status_code).toBe('CU02');
    });

    it('should preserve balances for invalid amount failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: -100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AM01',
        status: 'failed',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });

    it('should preserve balances for account not found failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'nonexistent',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AC03',
        status: 'failed',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      // When one account doesn't exist, only the existing account is returned
      expect(result.accounts.length).toBe(1);
      expect(result.accounts[0].account_id).toBe('b');
      expect(result.accounts[0].balance).toBe(300);
    });

    it('should preserve balances for same account failure', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'a',
        execute_by: null,
        status_code: 'AC02',
        status: 'failed',
      };
      const accounts = [{ account_id: 'a', balance: 200, currency: 'USD' }];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].balance).toBe(200);
    });
  });

  describe('Account Order Preservation', () => {
    it('should return accounts in request order (debit first, credit second)', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'USD',
        debit_account: 'x',
        credit_account: 'y',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'x', balance: 200, currency: 'USD' },
        { account_id: 'y', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].account_id).toBe('x');
      expect(result.accounts[1].account_id).toBe('y');
    });

    it('should preserve account order for CREDIT type instructions', () => {
      const validatedData = {
        type: 'CREDIT',
        amount: 100,
        currency: 'NGN',
        debit_account: 'acc-001',
        credit_account: 'acc-002',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'acc-001', balance: 500, currency: 'NGN' },
        { account_id: 'acc-002', balance: 200, currency: 'NGN' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].account_id).toBe('acc-001');
      expect(result.accounts[1].account_id).toBe('acc-002');
    });

    it('should handle accounts when input array has reversed order', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 30,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'b', balance: 300, currency: 'USD' },
        { account_id: 'a', balance: 200, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].account_id).toBe('a');
      expect(result.accounts[0].balance).toBe(170);
      expect(result.accounts[1].account_id).toBe('b');
      expect(result.accounts[1].balance).toBe(330);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all transaction fields in result', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(50);
      expect(result.currency).toBe('USD');
      expect(result.debit_account).toBe('a');
      expect(result.credit_account).toBe('b');
      expect(result.execute_by).toBeNull();
      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });

    it('should preserve account currency in result', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'GBP',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'GBP' },
        { account_id: 'b', balance: 300, currency: 'GBP' },
      ];

      const result = executeTransaction(validatedData, accounts);

      expect(result.accounts[0].currency).toBe('GBP');
      expect(result.accounts[1].currency).toBe('GBP');
    });

    it('should not mutate input accounts array', () => {
      const validatedData = {
        type: 'DEBIT',
        amount: 50,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
        status_code: 'AP00',
        status: 'successful',
      };
      const accounts = [
        { account_id: 'a', balance: 200, currency: 'USD' },
        { account_id: 'b', balance: 300, currency: 'USD' },
      ];
      const originalBalances = [accounts[0].balance, accounts[1].balance];

      executeTransaction(validatedData, accounts);

      expect(accounts[0].balance).toBe(originalBalances[0]);
      expect(accounts[1].balance).toBe(originalBalances[1]);
    });
  });
});
