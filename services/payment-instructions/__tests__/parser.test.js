/**
 * Parser Unit Tests
 * Tests the token-based instruction parser
 */

const { parseInstruction } = require('../parser');

describe('Payment Instruction Parser', () => {
  describe('DEBIT Format Parsing', () => {
    it('should parse valid DEBIT instruction without date', () => {
      const instruction = 'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('USD');
      expect(result.debit_account).toBe('N90394');
      expect(result.credit_account).toBe('N9122');
      expect(result.execute_by).toBeNull();
    });

    it('should parse valid DEBIT instruction with future date', () => {
      const instruction =
        'DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122 ON 2026-09-20';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('USD');
      expect(result.debit_account).toBe('N90394');
      expect(result.credit_account).toBe('N9122');
      expect(result.execute_by).toBe('2026-09-20');
    });

    it('should handle case-insensitive DEBIT keywords', () => {
      const instruction = 'debit 100 usd from account a for credit to account b';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.debit_account).toBe('a');
      expect(result.credit_account).toBe('b');
    });

    it('should handle account IDs with special characters', () => {
      const instruction = 'DEBIT 100 GBP FROM ACCOUNT xyz@bank FOR CREDIT TO ACCOUNT user.123';
      const result = parseInstruction(instruction);

      expect(result.debit_account).toBe('xyz@bank');
      expect(result.credit_account).toBe('user.123');
    });

    it('should handle multiple spaces between keywords', () => {
      const instruction = 'DEBIT  100   USD  FROM  ACCOUNT  a  FOR  CREDIT  TO  ACCOUNT  b';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(100);
      expect(result.debit_account).toBe('a');
      expect(result.credit_account).toBe('b');
    });
  });

  describe('CREDIT Format Parsing', () => {
    it('should parse valid CREDIT instruction without date', () => {
      const instruction = 'CREDIT 450 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('CREDIT');
      expect(result.amount).toBe(450);
      expect(result.currency).toBe('NGN');
      expect(result.debit_account).toBe('acc-001');
      expect(result.credit_account).toBe('acc-002');
      expect(result.execute_by).toBeNull();
    });

    it('should parse valid CREDIT instruction with future date', () => {
      const instruction =
        'CREDIT 450 NGN TO ACCOUNT acc-002 FOR DEBIT FROM ACCOUNT acc-001 ON 2026-02-21';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('CREDIT');
      expect(result.amount).toBe(450);
      expect(result.currency).toBe('NGN');
      expect(result.debit_account).toBe('acc-001');
      expect(result.credit_account).toBe('acc-002');
      expect(result.execute_by).toBe('2026-02-21');
    });

    it('should handle case-insensitive CREDIT keywords', () => {
      const instruction = 'credit 200 ghs to account b for debit from account a';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('CREDIT');
      expect(result.amount).toBe(200);
      expect(result.currency).toBe('GHS');
      expect(result.debit_account).toBe('a');
      expect(result.credit_account).toBe('b');
    });
  });

  describe('Error Handling', () => {
    it('should return error for empty instruction', () => {
      const instruction = '';
      const result = parseInstruction(instruction);

      expect(result.type).toBeNull();
      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should return error for invalid first keyword', () => {
      const instruction = 'SEND 100 USD TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.type).toBeNull();
      expect(result.status_code).toBe('SY01');
      expect(result.status).toBe('failed');
    });

    it('should return error for incomplete DEBIT instruction', () => {
      const instruction = 'DEBIT 100 USD FROM ACCOUNT a';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should return error for invalid keyword order in DEBIT', () => {
      const instruction = 'DEBIT 100 USD TO ACCOUNT a FOR CREDIT FROM ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY02');
      expect(result.status).toBe('failed');
    });

    it('should return error for missing FOR keyword', () => {
      const instruction = 'DEBIT 100 USD FROM ACCOUNT a CREDIT TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should return error for non-numeric amount', () => {
      const instruction = 'DEBIT abc USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should parse negative amounts (validation handles rejection)', () => {
      const instruction = 'DEBIT -100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.amount).toBe(-100);
      expect(result.type).toBe('DEBIT');
    });

    it('should parse decimal amounts (validation handles rejection)', () => {
      const instruction = 'DEBIT 100.50 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.amount).toBe(100.5);
      expect(result.type).toBe('DEBIT');
    });

    it('should return error for missing debit account ID', () => {
      const instruction = 'DEBIT 100 USD FROM ACCOUNT FOR CREDIT TO ACCOUNT b';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should return error for missing credit account ID', () => {
      const instruction = 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });

    it('should return error for missing date after ON', () => {
      const instruction = 'DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b ON';
      const result = parseInstruction(instruction);

      expect(result.status_code).toBe('SY03');
      expect(result.status).toBe('failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle leading and trailing whitespace', () => {
      const instruction = '  DEBIT 100 USD FROM ACCOUNT a FOR CREDIT TO ACCOUNT b  ';
      const result = parseInstruction(instruction);

      expect(result.type).toBe('DEBIT');
      expect(result.amount).toBe(100);
    });

    it('should preserve case sensitivity in account IDs', () => {
      const instruction =
        'DEBIT 100 USD FROM ACCOUNT Account-ABC FOR CREDIT TO ACCOUNT account-xyz';
      const result = parseInstruction(instruction);

      expect(result.debit_account).toBe('Account-ABC');
      expect(result.credit_account).toBe('account-xyz');
    });

    it('should handle account IDs with hyphens and periods', () => {
      const instruction =
        'DEBIT 100 USD FROM ACCOUNT acc-001.prod FOR CREDIT TO ACCOUNT acc-002.test';
      const result = parseInstruction(instruction);

      expect(result.debit_account).toBe('acc-001.prod');
      expect(result.credit_account).toBe('acc-002.test');
    });
  });
});
