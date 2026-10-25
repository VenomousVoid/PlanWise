## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Test coverage improvement
- [ ] CI/CD or tooling change

## Checklist

<!-- Mark completed items with an "x" -->

### Code Quality
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have run `npm run lint` and fixed any issues
- [ ] I have run `npm run typecheck` and fixed any type errors

### Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes (`npm test`)
- [ ] I have run the security test suite (`npm run test:security`) and all tests pass
- [ ] Test coverage remains at or above the required thresholds

### Security
- [ ] I have considered the security implications of my changes
- [ ] I have not introduced any secrets, API keys, or sensitive data in my code
- [ ] Input validation is implemented for any new user-facing inputs
- [ ] I have reviewed the code for potential XSS, injection, or other vulnerabilities
- [ ] Any new dependencies have been reviewed for security issues (`npm audit`)

### Accessibility
- [ ] I have tested my changes for keyboard navigation
- [ ] I have verified ARIA labels are present where needed
- [ ] Color is not the only means of conveying information
- [ ] Interactive elements meet minimum 44x44px touch target size
- [ ] I have tested with a screen reader (if UI changes)

### Documentation
- [ ] I have updated the README.md if needed
- [ ] I have updated relevant documentation in `/docs`
- [ ] I have added/updated JSDoc comments for new functions
- [ ] I have updated SECURITY.md if security implications exist

### Database/Data Changes
- [ ] N/A - No data changes (in-memory only)
- [ ] I have considered migration impact (if applicable in future)

## Related Issues

<!-- Link to related issues using #issue_number -->

Closes #
Relates to #

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Testing Instructions

<!-- Provide detailed steps for reviewers to test your changes -->

1. 
2. 
3. 

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No significant performance impact
- [ ] Performance improvement (describe below)
- [ ] Potential performance concern (describe below)

**Details:**

## Breaking Changes

<!-- List any breaking changes and migration path -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

**Details:**

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] No special deployment steps required
- [ ] Requires environment variable changes (list below)
- [ ] Requires dependency update (`npm ci`)
- [ ] Other (describe below)

**Details:**

## Rollback Plan

<!-- How can this change be rolled back if needed? -->

## Additional Context

<!-- Add any other context about the PR here -->

---

## Reviewer Notes

<!-- For reviewers -->

**Focus Areas for Review:**
- 
- 
- 

**Known Limitations:**
- 
- 
