/**
 * Integration Tests
 * End-to-end tests covering all 12 assessment scenarios
 */

const { processPaymentInstruction } = require('../index');

describe('Payment Instruction Integration Tests', () => {
  describe('Assessment Scenario 1: Successful immediate DEBIT', () => {
    it('should process valid immediate debit with updated balances', () => {
      const requestData = {
        instruction: 'DEBIT 30 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 230, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(30);
      expect(result.currency).toBe('USD');
      expect(result.debit_account).toBe('a');
      expect(result.credit_account).toBe('b');
      expect(result.execute_by).toBeNull();
      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
      expect(result.accounts[0].account_id).toBe('a');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].account_id).toBe('b');
      expect(result.accounts[1].balance).toBe(330);
    });
  });

  describe('Assessment Scenario 2: Pending future-dated CREDIT', () => {
    it('should mark future credit as pending with unchanged balances', () => {
      const requestData = {
        instruction:
          'CREDIT 450 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001 ON 2026-02-21',
        accounts: [
          { account_id: 'acc-001', balance: 1000, currency: 'NGN' },
          { account_id: 'acc-002', balance: 500, currency: 'NGN' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.type).toBe('CREDIT');
      expect(result.amount).toBe(450);
      expect(result.currency).toBe('NGN');
      expect(result.debit_account).toBe('acc-001');
      expect(result.credit_account).toBe('acc-002');
      expect(result.execute_by).toBe('2026-02-21');
      expect(result.status_code).toBe('AP02');
      expect(result.status).toBe('pending');
      expect(result.accounts[0].balance).toBe(1000);
      expect(result.accounts[1].balance).toBe(500);
    });
  });

  describe('Assessment Scenario 3: Unsupported currency', () => {
    it('should reject unsupported currency with CU02', () => {
      const requestData = {
        instruction: 'DEBIT 100 EUR FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'EUR' },
          { account_id: 'b', balance: 300, currency: 'EUR' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('CU02');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 4: Negative amount', () => {
    it('should reject negative amount with AM01', () => {
      const requestData = {
        instruction: 'DEBIT -100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AM01');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 5: Decimal amount', () => {
    it('should reject decimal amount with AM01', () => {
      const requestData = {
        instruction: 'DEBIT 100.50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AM01');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 6: Same account transfer', () => {
    it('should reject same account transfer with AC02', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT a',
        accounts: [{ account_id: 'a', balance: 200, currency: 'USD' }],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AC02');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
    });
  });

  describe('Assessment Scenario 7: Account not found', () => {
    it('should reject missing account with AC03', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT nonexistent',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AC03');
      expect(result.status).toBe('failed');
    });
  });

  describe('Assessment Scenario 8: Past date execution', () => {
    it('should execute past-dated instruction immediately with AP00', () => {
      const requestData = {
        instruction: 'DEBIT 50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b ON 2024-01-15',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
      expect(result.execute_by).toBe('2024-01-15');
      expect(result.accounts[0].balance).toBe(150);
      expect(result.accounts[1].balance).toBe(350);
    });
  });

  describe('Assessment Scenario 9: Currency mismatch', () => {
    it('should reject currency mismatch with CU01', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'GBP' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('CU01');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 10: Insufficient funds', () => {
    it('should reject insufficient funds with AC01', () => {
      const requestData = {
        instruction: 'DEBIT 500 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AC01');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 11: Invalid date format', () => {
    it('should reject invalid date format with DT01', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b ON 20-09-2026',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('DT01');
      expect(result.status).toBe('failed');
      expect(result.accounts[0].balance).toBe(200);
      expect(result.accounts[1].balance).toBe(300);
    });
  });

  describe('Assessment Scenario 12: Malformed instruction', () => {
    it('should reject malformed instruction with SY03', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle case-insensitive instruction keywords', () => {
      const requestData = {
        instruction: 'debit 50 usd from account a for credit to account b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
      expect(result.accounts[0].balance).toBe(150);
      expect(result.accounts[1].balance).toBe(350);
    });

    it('should handle account IDs with special characters', () => {
      const requestData = {
        instruction: 'DEBIT 100 GBP FROM ACCOUNT acc-001.prod FOR CREDIT TO ACCOUNT acc-002@test',
        accounts: [
          { account_id: 'acc-001.prod', balance: 500, currency: 'GBP' },
          { account_id: 'acc-002@test', balance: 200, currency: 'GBP' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
      expect(result.accounts[0].account_id).toBe('acc-001.prod');
      expect(result.accounts[1].account_id).toBe('acc-002@test');
    });

    it('should execute exact balance deduction', () => {
      const requestData = {
        instruction: 'DEBIT 200 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.status).toBe('successful');
      expect(result.accounts[0].balance).toBe(0);
      expect(result.accounts[1].balance).toBe(500);
    });

    it('should reject invalid account ID characters', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT acc#123 FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'acc#123', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AC04');
      expect(result.status).toBe('failed');
    });

    it('should handle all supported currencies', () => {
      const currencies = ['USD', 'NGN', 'GBP', 'GHS'];

      currencies.forEach((currency) => {
        const requestData = {
          instruction: `DEBIT 50 ${currency} FROM ACCOUNT a FOR CREDIT TO ACCOUNT b`,
          accounts: [
            { account_id: 'a', balance: 200, currency },
            { account_id: 'b', balance: 300, currency },
          ],
        };

        const result = processPaymentInstruction(requestData);

        expect(result.status_code).toBe('AP00');
        expect(result.status).toBe('successful');
        expect(result.currency).toBe(currency);
      });
    });

    it('should maintain account order in response', () => {
      const requestData = {
        instruction: 'DEBIT 50 USD FROM ACCOUNT x FOR CREDIT TO ACCOUNT y',
        accounts: [
          { account_id: 'y', balance: 300, currency: 'USD' },
          { account_id: 'x', balance: 200, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.accounts[0].account_id).toBe('x');
      expect(result.accounts[1].account_id).toBe('y');
    });

    it('should handle zero balance after transaction', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 100, currency: 'USD' },
          { account_id: 'b', balance: 0, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.accounts[0].balance).toBe(0);
      expect(result.accounts[1].balance).toBe(100);
    });

    it('should handle large transaction amounts', () => {
      const requestData = {
        instruction: 'DEBIT 999999 NGN FROM ACCOUNT acc-001 FOR CREDIT TO ACCOUNT acc-002',
        accounts: [
          { account_id: 'acc-001', balance: 1000000, currency: 'NGN' },
          { account_id: 'acc-002', balance: 50000, currency: 'NGN' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('AP00');
      expect(result.accounts[0].balance).toBe(1);
      expect(result.accounts[1].balance).toBe(1049999);
    });

    it('should reject empty instruction', () => {
      const requestData = {
        instruction: '',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should reject instruction with wrong keyword order', () => {
      const requestData = {
        instruction: 'DEBIT 100 USD TO ACCOUNT a FOR CREDIT FROM ACCOUNT b',
        accounts: [
          { account_id: 'a', balance: 200, currency: 'USD' },
          { account_id: 'b', balance: 300, currency: 'USD' },
        ],
      };

      const result = processPaymentInstruction(requestData);

      expect(result.status_code).toBe('SY02');
      expect(result.status).toBe('failed');
    });
  });
});
