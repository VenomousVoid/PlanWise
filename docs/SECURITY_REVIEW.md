# Security Review Report

**Date:** October 25, 2026  
**Reviewer:** Security Audit Process  
**Application:** PlanWise v0.0.0  
**Scope:** Server-side security architecture, API endpoints, data handling, and client-side security

---

## Executive Summary

PlanWise implements several security best practices including helmet security headers, CORS configuration, rate limiting, and input validation. However, several findings require attention for production deployment.

**Overall Risk Assessment:** MEDIUM  
**Critical Findings:** 0  
**High Findings:** 2  
**Medium Findings:** 4  
**Low Findings:** 3

---

## Findings

### HIGH SEVERITY

#### H-1: Trust Proxy Configuration Issue
**Location:** `server/middleware/rateLimiter.ts` lines 29-32, `server/app.ts` line 12  
**Severity:** HIGH  
**Status:** REQUIRES FIX

**Description:**  
The application sets `trust proxy: 1` in `app.ts` but the rate limiters explicitly disable proxy trust with `trustProxy: false` and `xForwardedForHeader: false`. This creates a configuration mismatch where:
1. Express will trust X-Forwarded-For due to `trust proxy: 1`
2. Rate limiters will NOT trust X-Forwarded-For 
3. Behind a reverse proxy (Cloud Run, nginx), rate limiting will apply per-proxy-IP rather than per-client-IP

**Impact:**  
- Rate limiting becomes ineffective behind reverse proxies
- Single malicious proxy can exhaust rate limits for all legitimate users
- README claims rate limiting (200/10min, 50/10min) cannot be enforced properly

**Evidence:**
```typescript
// server/app.ts
app.set('trust proxy', 1);  // Enables proxy trust

// server/middleware/rateLimiter.ts
validate: {
  trustProxy: false,           // Disables proxy trust!
  xForwardedForHeader: false,  // Ignores X-Forwarded-For!
  default: false,
}
```

**Recommended Fix:**
```typescript
// In rateLimiter.ts - enable proxy trust to match app.ts
validate: {
  trustProxy: true,
  xForwardedForHeader: true,
  default: true,
}
```

**Alternatively**, if proxies are NOT used:
```typescript
// In app.ts - remove trust proxy
// app.set('trust proxy', 1);  // REMOVE THIS LINE
```

---

#### H-2: Unauthenticated Destructive Endpoints
**Location:** `server/routes/api.ts`  
**Severity:** HIGH (by design for demo, but must be documented)  
**Status:** KNOWN LIMITATION

**Description:**  
The following endpoints allow destructive operations without authentication:
- `DELETE /api/events/:id` - Delete any event
- `POST /api/events/reset` - Reset all data to seed state
- `PUT /api/events/:id` - Modify any event

**Impact:**  
- Any user can delete or modify any other user's events
- Data can be wiped at any time
- Not suitable for production multi-tenant deployment without auth layer

**Justification:**  
This is explicitly by design for a single-user demo application as stated in README "Known Limitations" section. However, it should be more prominently documented.

**Recommended Fix:**  
1. Add prominent warning to SECURITY.md
2. Create authentication middleware skeleton for future implementation
3. Add rate limiting specifically to DELETE and reset endpoints

---

### MEDIUM SEVERITY

#### M-1: CORS Configuration Too Permissive
**Location:** `server/middleware/security.ts` lines 7-13  
**Severity:** MEDIUM

**Description:**  
CORS middleware accepts ALL origins with `callback(null, true)` regardless of the origin value. While credentials are enabled, there is no origin allowlist.

**Current Code:**
```typescript
origin: (origin, callback) => {
  if (!origin) return callback(null, true);
  callback(null, true);  // Accepts ANY origin!
}
```

**Impact:**  
- Any website can make authenticated requests to the API
- CSRF protection is weakened
- Contradicts README claim of "strict CORS allowlist"

**Recommended Fix:**
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  process.env.APP_URL,
].filter(Boolean);

origin: (origin, callback) => {
  if (!origin) return callback(null, true); // Allow same-origin and tools
  if (ALLOWED_ORIGINS.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
```

---

#### M-2: Content Security Policy Disabled
**Location:** `server/middleware/security.ts` line 19  
**Severity:** MEDIUM

**Description:**  
CSP is completely disabled with `contentSecurityPolicy: false` to accommodate Vite dev mode.

**Impact:**  
- No XSS protection via CSP in production
- Inline scripts and styles allowed from any source
- README claims "Helmet & Strict CORS Headers" but CSP is disabled

**Recommended Fix:**  
Enable CSP conditionally:
```typescript
export const helmetMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  } : false,
  crossOriginEmbedderPolicy: false,
});
```

---

#### M-3: Gemini Model Name Not Verified
**Location:** `server/config.ts` line 8, `.env.example`  
**Severity:** MEDIUM

**Description:**  
The default model is set to `gemini-3.8-flash` but this model name does not exist in Google's Gemini API as of the review date. Current models are:
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.0-pro`

The version "3.8" does not exist and will cause API failures.

**Impact:**  
- Application will fail to use Gemini AI features with default config
- README claim of working AI integration is false with default settings
- Users will see fallback mode incorrectly

**Recommended Fix:**
```bash
# .env.example
GEMINI_MODEL=gemini-1.5-flash

# server/config.ts
GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
```

---

#### M-4: Request ID Truncation Reduces Uniqueness
**Location:** `server/middleware/security.ts` line 23  
**Severity:** MEDIUM

**Description:**  
Request IDs are generated using `crypto.randomUUID().substring(0, 8)`, reducing a 128-bit UUID to only 32 bits of entropy (8 hex characters).

**Impact:**  
- Collision probability increases significantly
- Request tracing across distributed systems may have collisions
- Only ~4 billion unique IDs before collision becomes likely

**Recommended Fix:**
```typescript
const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
```
Use full UUID for better tracing.

---

### LOW SEVERITY

#### L-1: Session/Authentication Token Storage
**Location:** N/A (not implemented)  
**Severity:** LOW

**Description:**  
No authentication is implemented. When added, ensure:
- Tokens are httpOnly, secure, sameSite=strict cookies
- No tokens in localStorage (XSS vulnerability)
- Proper CSRF protection

**Recommended Fix:**  
Reference implementation for future auth:
```typescript
res.cookie('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000
});
```

---

#### L-2: Error Stack Traces in Development
**Location:** `server/middleware/errorHandler.ts` (not reviewed in detail)  
**Severity:** LOW

**Description:**  
Verify that stack traces are NOT exposed in production mode error responses.

**Verification:**  
The error handler security tests check this, but review the actual implementation to ensure `NODE_ENV` check exists.

---

#### L-3: No Rate Limit on Health Endpoint
**Location:** `/api/health`  
**Severity:** LOW

**Description:**  
The health endpoint is not excluded from rate limiting, but also reveals "aiStatus.isKeyConfigured" which could be used for reconnaissance.

**Impact:**  
- Attackers can probe for API key configuration
- Minimal risk but unnecessary information disclosure

**Recommended Fix:**  
```typescript
aiStatus: {
  mode: geminiClientService.isKeyConfigured() ? 'live_gemini' : 'deterministic_fallback',
  // Remove isKeyConfigured from public response
}
```

---

## Verification of README Claims

### ✅ VERIFIED CLAIMS

1. **"Helmet & Strict CORS Headers"** - Partially verified
   - Helmet is configured (though CSP is disabled)
   - CORS exists but is NOT strict (accepts all origins)

2. **"Dual Rate Limiting"** - Verified
   - Standard: 200/10min ✅
   - AI: 50/10min ✅
   - BUT: Not effective behind reverse proxy (see H-1)

3. **"Sanitized Logging"** - Verified
   - Only logs method, sanitized path, duration ✅
   - Request ID included ✅

4. **"Cryptographic Share Tokens"** - Verified
   - Uses crypto.randomBytes(24) = 192 bits ✅
   - base64url encoding ✅
   - 24-hour expiration ✅
   - Revocation capability ✅

5. **"500KB JSON body limit"** - Verified
   - `express.json({ limit: '500kb' })` in app.ts ✅

### ❌ FALSE CLAIMS

1. **"npm audit reports 0 vulnerabilities"** - NOT VERIFIED YET
   - Requires actual npm audit run (see Task #5)

2. **"gemini-3.8-flash" model** - FALSE
   - This model does not exist (see M-3)

3. **"Strict CORS allowlist"** - FALSE
   - All origins are accepted (see M-1)

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Fix trust proxy / rate limiter mismatch (H-1)
- [ ] Document authentication limitations prominently (H-2)
- [ ] Implement CORS allowlist (M-1)
- [ ] Enable CSP in production (M-2)
- [ ] Fix Gemini model name (M-3)
- [ ] Use full UUIDs for request IDs (M-4)
- [ ] Add authentication layer
- [ ] Review and restrict destructive endpoints
- [ ] Set up monitoring and alerting
- [ ] Perform penetration testing
- [ ] Enable HSTS in production
- [ ] Configure proper logging aggregation

---

## Positive Security Practices Observed

1. ✅ Helmet middleware for basic security headers
2. ✅ Input validation using Zod schemas
3. ✅ Centralized error handling
4. ✅ No secrets in repository (uses env vars)
5. ✅ Sanitized logging (no PII/tokens)
6. ✅ Cryptographically secure share tokens
7. ✅ Prompt injection hardening with delimiters
8. ✅ Separate rate limits for AI endpoints
9. ✅ Express trust proxy configured (even if not used correctly)
10. ✅ Compression enabled

---

## Conclusion

PlanWise demonstrates good security awareness with multiple layers of protection. The high-severity findings are primarily configuration issues that can be resolved quickly. The application is suitable for demo/development use but requires the fixes outlined above before production deployment with real user data.

**Next Steps:**
1. Address H-1 (trust proxy) immediately
2. Update documentation to reflect actual CORS and CSP behavior
3. Fix model name default
4. Implement authentication framework for future production use
