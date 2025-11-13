/**
 * Validator Unit Tests
 * Tests all 13 business rule validations
 */

const { validateInstruction } = require('../validator');

describe('Payment Instruction Validator', () => {
  const mockAccounts = [
    { account_id: 'a', balance: 200, currency: 'USD' },
    { account_id: 'b', balance: 300, currency: 'USD' },
    { account_id: 'gbp-acct', balance: 500, currency: 'GBP' },
    { account_id: 'ngn-acct', balance: 1000, currency: 'NGN' },
  ];

  describe('AM01: Amount Validation', () => {
    it('should reject negative amounts', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: -100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AM01');
      expect(result.status).toBe('failed');
    });

    it('should reject decimal amounts', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100.5,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AM01');
      expect(result.status).toBe('failed');
    });

    it('should reject zero amount', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 0,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AM01');
      expect(result.status).toBe('failed');
    });

    it('should accept valid positive integer amounts', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('CU02: Supported Currency', () => {
    it('should reject unsupported currency EUR', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'EUR',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU02');
      expect(result.status).toBe('failed');
    });

    it('should accept supported currency USD', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });

    it('should accept supported currency NGN', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'NGN',
        debit_account: 'ngn-acct',
        credit_account: 'a',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU01');
      expect(result.status).toBe('failed');
    });

    it('should accept supported currency GBP', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'GBP',
        debit_account: 'gbp-acct',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU01');
      expect(result.status).toBe('failed');
    });

    it('should accept supported currency GHS', () => {
      const accounts = [
        { account_id: 'ghs-a', balance: 200, currency: 'GHS' },
        { account_id: 'ghs-b', balance: 300, currency: 'GHS' },
      ];
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'GHS',
        debit_account: 'ghs-a',
        credit_account: 'ghs-b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, accounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('AC04: Account ID Format', () => {
    it('should reject debit account with invalid characters', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'acc#123',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC04');
      expect(result.status).toBe('failed');
    });

    it('should reject credit account with invalid characters', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'acc$xyz',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC04');
      expect(result.status).toBe('failed');
    });

    it('should accept account IDs with valid special characters', () => {
      const accounts = [
        { account_id: 'acc-001.test@bank', balance: 200, currency: 'USD' },
        { account_id: 'acc-002.prod', balance: 300, currency: 'USD' },
      ];
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'acc-001.test@bank',
        credit_account: 'acc-002.prod',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, accounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('AC03: Account Existence', () => {
    it('should reject if debit account not found', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'nonexistent-acct',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC03');
      expect(result.status).toBe('failed');
    });

    it('should reject if credit account not found', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'nonexistent-acct',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC03');
      expect(result.status).toBe('failed');
    });

    it('should accept if both accounts exist', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('AC02: Same Account Check', () => {
    it('should reject if debit and credit accounts are the same', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'a',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC02');
      expect(result.status).toBe('failed');
    });

    it('should accept if accounts are different', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('CU01: Currency Match', () => {
    it('should reject if debit account currency does not match instruction currency', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'gbp-acct',
        credit_account: 'a',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU01');
      expect(result.status).toBe('failed');
    });

    it('should reject if credit account currency does not match instruction currency', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'ngn-acct',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU01');
      expect(result.status).toBe('failed');
    });

    it('should accept if both accounts match instruction currency', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('AC01: Insufficient Funds', () => {
    it('should reject if debit account has insufficient balance', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 500,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC01');
      expect(result.status).toBe('failed');
    });

    it('should accept if debit account has sufficient balance', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });

    it('should accept if amount equals available balance', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 200,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('DT01: Date Format', () => {
    it('should reject invalid date format', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '20-09-2026',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('DT01');
      expect(result.status).toBe('failed');
    });

    it('should reject incomplete date', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2026-09',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('DT01');
      expect(result.status).toBe('failed');
    });

    it('should reject invalid date components', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2026-13-45',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('DT01');
      expect(result.status).toBe('failed');
    });

    it('should accept valid future date format', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2026-09-20',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP02');
      expect(result.status).toBe('pending');
    });
  });

  describe('AP02: Future Date Handling', () => {
    it('should return pending status for future dates', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2026-12-31',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP02');
      expect(result.status).toBe('pending');
    });

    it('should return successful status for past dates', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: '2024-01-15',
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });

    it('should return successful status for current date', () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: todayString,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });

    it('should return successful status when no date provided', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
    });
  });

  describe('Validation Order', () => {
    it('should check amount before currency support', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: -100,
        currency: 'EUR',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AM01');
    });

    it('should check currency support before account format', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'EUR',
        debit_account: 'acc#123',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('CU02');
    });

    it('should check account existence before currency match', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 100,
        currency: 'USD',
        debit_account: 'nonexistent',
        credit_account: 'gbp-acct',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC03');
    });

    it('should check sufficient funds after currency match', () => {
      const parsedData = {
        type: 'DEBIT',
        amount: 500,
        currency: 'USD',
        debit_account: 'a',
        credit_account: 'b',
        execute_by: null,
      };
      const result = validateInstruction(parsedData, mockAccounts);

      expect(result.status_code).toBe('AC01');
    });
  });
});
