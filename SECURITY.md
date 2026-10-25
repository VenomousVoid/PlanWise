# Security Policy

## Reporting a Vulnerability

We take the security of PlanWise seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues via one of the following methods:

1. **Email:** Send details to the project maintainer's security email
2. **GitHub Security Advisories:** Use the "Security" tab on the repository to create a private security advisory
3. **Direct Message:** Contact the maintainers directly through GitHub

### What to Include

When reporting a vulnerability, please include:

- **Description:** A clear description of the vulnerability
- **Impact:** What an attacker could achieve
- **Steps to Reproduce:** Detailed steps to reproduce the issue
- **Proof of Concept:** Code or screenshots demonstrating the vulnerability (if applicable)
- **Affected Versions:** Which versions are affected
- **Suggested Fix:** Any ideas you have for fixing the issue (optional)
- **Your Contact Info:** So we can follow up with questions

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### Security Update Process

1. We will confirm the vulnerability and determine its severity
2. We will develop and test a fix
3. We will release a security patch
4. We will credit you in the release notes (unless you prefer to remain anonymous)
5. We will publish a security advisory after the fix is released

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

---

## Security Features

PlanWise implements multiple layers of security:

### HTTP Security
- **Helmet middleware** for security headers
- **CORS** configuration (Note: Currently accepts all origins - see Known Limitations)
- **Rate limiting** 
  - Standard API: 200 requests per 10 minutes
  - AI endpoints: 50 requests per 10 minutes
- **Body size limit:** 500KB max
- **Request logging:** Sanitized (no PII, secrets, or tokens)

### Data Security
- **Cryptographic tokens:** Share links use 192-bit random tokens
- **Token expiration:** 24-hour TTL on share links
- **Input validation:** Zod schema validation on all inputs
- **XSS prevention:** JSON-only API responses
- **Injection protection:** Prompt injection hardening for AI inputs

### Error Handling
- **Sanitized errors:** No stack traces, file paths, or environment details in responses
- **Request IDs:** Unique identifiers for debugging without exposing sensitive data

---

## Known Security Limitations

⚠️ **Important:** PlanWise is designed as a single-user demo application. The following limitations exist:

### No Authentication
- **All API endpoints are unauthenticated**
- Any user can view, modify, or delete any event
- `DELETE /api/events/:id` allows deletion without authorization
- `POST /api/events/reset` allows complete data reset

**Impact:** Not suitable for multi-tenant production without adding authentication

### No Data Persistence
- **All data is stored in memory**
- Server restart wipes all data
- No database encryption (no database exists)

**Impact:** Not suitable for production use with persistent data requirements

### CORS Configuration
- **Current implementation accepts all origins**
- Despite README claim of "strict allowlist"

**Impact:** Reduced CSRF protection. Should implement origin allowlist before production.

### Trust Proxy Configuration
- **Mismatch between Express and rate limiter settings**
- Rate limiting may not work correctly behind reverse proxies

**Impact:** Rate limiting ineffective in production deployments behind proxies.

### Content Security Policy
- **CSP is disabled** to support Vite development mode

**Impact:** Reduced XSS protection. Should enable CSP in production.

---

## Security Testing

PlanWise includes comprehensive security tests:

```bash
# Run all security tests
npm run test:security

# Run full test suite with coverage
npm run test:coverage

# Audit dependencies
npm audit
```

Test coverage includes:
- HTTP security headers
- CORS and rate limiting
- Input validation and injection prevention
- XSS and script injection
- Share token security
- Error handling and logging

---

## Secure Development Practices

When contributing to PlanWise:

### Input Handling
- ✅ Validate all user input with Zod schemas
- ✅ Sanitize strings before use in AI prompts
- ✅ Never use user input directly in SQL/NoSQL queries (when DB added)
- ✅ Never use `eval()` or `Function()` constructor
- ✅ Limit string lengths appropriately

### Authentication (When Implemented)
- Use httpOnly, secure, sameSite=strict cookies
- Never store tokens in localStorage
- Implement proper CSRF protection
- Use strong password hashing (bcrypt, argon2)
- Implement rate limiting on auth endpoints

### Secrets Management
- Never commit secrets to git
- Use environment variables for all secrets
- Add new secrets to `.env.example` with placeholder values
- Ensure `.env` is in `.gitignore`

### Dependencies
- Run `npm audit` before committing
- Keep dependencies up to date
- Review dependency changes in PRs
- Avoid dependencies with known vulnerabilities

### Error Handling
- Never expose stack traces in production
- Use generic error messages for users
- Log detailed errors securely for debugging
- Include request IDs for tracing

---

## Security Configuration Recommendations

### For Production Deployment

1. **Enable Authentication**
   ```typescript
   // Add authentication middleware
   import { authenticateUser } from './middleware/auth';
   app.use('/api', authenticateUser);
   ```

2. **Restrict CORS**
   ```typescript
   const ALLOWED_ORIGINS = [process.env.APP_URL];
   origin: (origin, callback) => {
     if (!origin || ALLOWED_ORIGINS.includes(origin)) {
       callback(null, true);
     } else {
       callback(new Error('Not allowed by CORS'));
     }
   }
   ```

3. **Enable CSP**
   ```typescript
   contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
     directives: {
       defaultSrc: ["'self'"],
       scriptSrc: ["'self'"],
       // ... other directives
     }
   } : false
   ```

4. **Fix Trust Proxy**
   ```typescript
   // In rateLimiter.ts
   validate: {
     trustProxy: true,
     xForwardedForHeader: true,
   }
   ```

5. **Environment Variables**
   ```bash
   NODE_ENV=production
   PORT=3000
   APP_URL=https://yourdomain.com
   GEMINI_API_KEY=your-key-here
   SESSION_SECRET=your-secret-here
   ```

---

## Security Disclosure Policy

We believe in responsible disclosure:

- We will work with you to validate and fix the vulnerability
- We will credit you in our security advisories (unless you request anonymity)
- We ask that you give us reasonable time to fix the issue before public disclosure
- We will keep you informed of our progress

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)

---

## Contact

For security-related questions that are not vulnerability reports, you can open a public issue on GitHub.

For security vulnerabilities, please follow the reporting process outlined at the top of this document.

---

**Last Updated:** October 25, 2026  
**Version:** 1.0
