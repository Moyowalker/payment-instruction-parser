# Payment Instruction Parser & Executor

> A robust REST API for parsing and executing financial transaction instructions in structured natural language format.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 Overview

This API simulates a core component of payment processing systems used in modern fintech applications. It accepts payment instructions in human-readable format, validates them against comprehensive business rules, and executes transactions on provided accounts.

### Key Capabilities

- **Natural Language Processing**: Parses complex payment instructions using string manipulation (no regex)
- **Multi-Format Support**: Handles both DEBIT-first and CREDIT-first instruction formats
- **Comprehensive Validation**: Implements 13 distinct validation rules with specific error codes
- **Transaction Execution**: Processes immediate and future-dated transactions
- **Fintech-Grade Error Handling**: Returns detailed, actionable error messages

## 🏗️ Architecture & Design Decisions

### Parsing Strategy

Rather than using regex (which can be fragile and hard to maintain), I've implemented a **token-based parser** that:
- Tokenizes instructions by whitespace
- Validates keyword order and structure
- Extracts account IDs with proper boundary detection
- Handles case-insensitivity while preserving account ID integrity

This approach provides:
- ✅ Better error messages (can pinpoint exact parsing failures)
- ✅ Easier testing and debugging
- ✅ More maintainable code for future instruction format extensions
- ✅ Clear separation of concerns

### Service Layer Architecture

```
endpoints/payment-instructions/     → Route handler (HTTP layer)
    ↓
services/payment-instructions/      → Business logic orchestration
    ↓
├── parser.js                       → Instruction parsing
├── validator.js                    → Business rule validation
└── executor.js                     → Transaction execution
```

**Why this structure?**
- Each service has a single responsibility
- Easy to unit test in isolation
- Facilitates future enhancements (e.g., adding new instruction types)
- Follows the existing template's modular architecture

## 📋 API Specification

### Endpoint

```
POST /payment-instructions
```

### Request Format

```json
{
  "accounts": [
    {"id": "N90394", "balance": 1000, "currency": "USD"},
    {"id": "N9122", "balance": 500, "currency": "USD"}
  ],
  "instruction": "DEBIT 500 USD FROM ACCOUNT N90394 FOR CREDIT TO ACCOUNT N9122 ON 2026-09-20"
}
```

### Supported Instruction Formats

**Format 1 - DEBIT emphasis:**
```
DEBIT [amount] [currency] FROM ACCOUNT [id] FOR CREDIT TO ACCOUNT [id] [ON date]
```

**Format 2 - CREDIT emphasis:**
```
CREDIT [amount] [currency] TO ACCOUNT [id] FOR DEBIT FROM ACCOUNT [id] [ON date]
```

### Supported Currencies

- `NGN` - Nigerian Naira
- `USD` - US Dollar
- `GBP` - British Pound
- `GHS` - Ghanaian Cedi

### Response Format

```json
{
  "type": "DEBIT",
  "amount": 500,
  "currency": "USD",
  "debit_account": "N90394",
  "credit_account": "N9122",
  "execute_by": "2026-09-20",
  "status": "pending",
  "status_reason": "Transaction scheduled for future execution",
  "status_code": "AP02",
  "accounts": [
    {
      "id": "N90394",
      "balance": 1000,
      "balance_before": 1000,
      "currency": "USD"
    },
    {
      "id": "N9122",
      "balance": 500,
      "balance_before": 500,
      "currency": "USD"
    }
  ]
}
```

## 🛡️ Validation & Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AP00` | Transaction executed successfully | 200 |
| `AP02` | Transaction scheduled for future execution | 200 |
| `AM01` | Amount must be a positive integer | 400 |
| `CU01` | Account currency mismatch | 400 |
| `CU02` | Unsupported currency | 400 |
| `AC01` | Insufficient funds in debit account | 400 |
| `AC02` | Debit and credit accounts cannot be the same | 400 |
| `AC03` | Account not found | 400 |
| `AC04` | Invalid account ID format | 400 |
| `DT01` | Invalid date format | 400 |
| `SY01` | Missing required keyword | 400 |
| `SY02` | Invalid keyword order | 400 |
| `SY03` | Malformed instruction | 400 |

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Moyowalker/payment-instruction-parser.git

# Navigate to project directory
cd payment-instruction-parser

# Install dependencies
npm install

# Start the server
npm start
```

The API will be available at `http://localhost:3000`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Testing Strategy

Comprehensive test coverage including:

1. **Parser Tests**
   - DEBIT format parsing
   - CREDIT format parsing
   - Case-insensitive keyword handling
   - Account ID extraction with special characters
   - Date parsing and validation

2. **Validator Tests**
   - All 13 validation rules
   - Edge cases (zero amounts, missing accounts, etc.)
   - Currency validation
   - Account ID format validation

3. **Executor Tests**
   - Immediate transaction execution
   - Future-dated transaction handling
   - Balance updates
   - Transaction rollback scenarios

4. **Integration Tests**
   - End-to-end request/response flows
   - All test cases from assessment specification

## 🔧 Technology Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Testing**: Jest
- **Code Quality**: ESLint
- **Version Control**: Git

## 📈 Future Enhancements

Potential improvements for production deployment:

- [ ] Add request rate limiting
- [ ] Implement transaction logging and audit trails
- [ ] Add support for batch instructions
- [ ] Integrate with actual banking APIs
- [ ] Add webhook notifications for pending transactions
- [ ] Implement idempotency keys for duplicate prevention
- [ ] Add metrics and monitoring (Prometheus/Grafana)

## 🤝 Development Process

This project follows a structured commit strategy demonstrating:
- Incremental feature development
- Test-driven development practices
- Clear separation of concerns
- Professional git workflow

## 📝 License

MIT

## 👤 Author

**Moyowalker**
- GitHub: [@Moyowalker](https://github.com/Moyowalker)

---

*Built with attention to detail and passion for clean, maintainable code.*
