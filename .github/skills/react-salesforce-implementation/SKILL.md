---
name: react-salesforce-implementation
description: 'Build and review React TypeScript applications backed by Node.js and Salesforce. Use for React UI, REST API, Salesforce OAuth, Case management, customer portals, Salesforce data mapping, secure file uploads, authentication, testing, and production hardening.'
argument-hint: 'Describe the React and Salesforce feature, workflow, or bug to implement.'
user-invocable: true
disable-model-invocation: false
---

# React and Salesforce Implementation

## Purpose

Deliver a secure, testable React and Salesforce feature from requirements through validation. Keep Salesforce credentials and object access behind a server-side Node.js API. Keep the React application independent of Salesforce-specific implementation details.

## When to Use

Use this skill when the task involves:

- React or React TypeScript customer-facing screens
- Node.js APIs that read or write Salesforce data
- Salesforce OAuth, External Client Apps, integration users, REST APIs, or SOQL
- Customer accounts, Contacts, Products, Cases, Case comments, Files, or Knowledge
- Customer portals requiring object-level authorization
- Connecting an existing frontend to a Salesforce-backed backend
- Reviewing or hardening a React/Salesforce integration

## Operating Principles

1. Start from the nearest concrete anchor: a requirement, route, component, failing test, API response, or Salesforce object mapping.
2. Before editing, state one local hypothesis about the controlling code path and one cheap check that could disconfirm it.
3. Preserve the existing framework, design system, public API style, and directory conventions.
4. Prefer a small vertical slice that can be executed and tested over broad scaffolding.
5. Keep Salesforce credentials, access tokens, SOQL, object names, and field mappings server-side.
6. Treat every client-supplied Salesforce ID as untrusted. Authorize it against the authenticated customer before reading or mutating data.
7. Use structured validation and typed response models at the API boundary.
8. Keep mock data and sandbox integrations clearly separated from production behavior.
9. After the first substantive edit, run the narrowest relevant executable validation before expanding the change.
10. Do not report completion until build, lint, focused tests, and the main user journey have been checked.

## Procedure

### 1. Inspect and Define the Slice

- Read the relevant PRD, task, component, route, and neighboring tests.
- Identify the owning React component, API route, service, and Salesforce operation.
- Write down the user journey and acceptance criteria.
- Identify dependencies: identity source, Salesforce objects, fields, permissions, files, notifications, and error behavior.
- Decide whether the work is local mock mode, Salesforce sandbox mode, or production-ready integration.

If Salesforce mappings are ambiguous, stop implementation at the boundary and document the decision needed. Do not guess a custom object or field name silently.

### 2. Establish the Contracts

Define or update:

- React form and view state
- Request and response schemas
- API error format and error codes
- Authentication and session requirements
- Salesforce object and field mapping
- Pagination, filtering, and sorting parameters
- Customer-visible versus internal-only fields

Use a provider-independent frontend model. Salesforce field names should appear only in the Salesforce adapter or mapping layer.

A typical API error has this shape:

```json
{
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "The requested case could not be found."
  }
}
```

### 3. Configure Salesforce Securely

For a server-to-Salesforce integration:

- Create a dedicated integration user.
- Grant least-privilege object, field, and record permissions.
- Configure an External Client App and the approved OAuth 2.0 flow.
- Store client ID, client secret, login URL, instance URL, and API version in server-only environment configuration or a secrets manager.
- Never place Salesforce secrets in React source, `VITE_*` variables, browser storage, or client bundles.
- Cache access tokens in server memory or a secure server-side store with an expiry buffer.
- Retry token acquisition once after an unauthorized Salesforce response.
- Add timeouts and bounded retries for transient Salesforce failures.
- Redact tokens, secrets, passwords, and sensitive customer data from logs.
- Use a Salesforce sandbox for local and staging verification.

Use a dedicated `SalesforceClient` or adapter. Route handlers should orchestrate validation and authorization, not construct raw Salesforce requests throughout the application.

### 4. Implement the Backend Slice

For each protected operation:

1. Authenticate the application user.
2. Resolve the application user to the Salesforce Contact and Account relationship.
3. Validate request parameters and body with a schema.
4. Authorize the requested product, Case, comment, or file against that relationship.
5. Map the validated input to an allowlisted Salesforce field set.
6. Call the Salesforce adapter.
7. Normalize Salesforce errors into safe API errors.
8. Return a frontend-oriented response model.
9. Emit an audit event for security-sensitive actions.

For Case workflows, support the approved lifecycle only:

```text
New -> In Progress -> Waiting for Customer -> Resolved -> Closed
```

Do not allow customers to modify internal-only Salesforce fields or arbitrary Case status values.

For files:

- Enforce maximum size before processing.
- Allow only approved MIME types and extensions.
- Validate file content where practical.
- Add malware scanning when required by the environment.
- Upload and link the file only after Case ownership is confirmed.
- Do not log file contents.

### 5. Implement the React Slice

Build the smallest complete customer journey:

- Add or update the route and navigation entry.
- Add loading, empty, error, unauthorized, and success states.
- Validate forms on the client for usability, but repeat validation on the server.
- Send cookies or tokens using the project’s approved authentication mechanism.
- Do not call Salesforce directly from React.
- Keep API calls in a small client or service layer.
- Avoid duplicating server state in unrelated components.
- Preserve keyboard access, labels, focus behavior, and readable error messages.
- Keep responsive layouts stable at mobile and desktop widths.
- Use existing UI patterns and icons where the application already has them.

For an existing mock-data screen, add an explicit fallback only when it is intentional and visible during development. Never let a production error silently present stale mock customer data.

### 6. Authentication and Authorization Checks

Authentication must include:

- Registration, login, logout, and password recovery as required by the feature.
- Strong password hashing using a modern password-hashing function.
- Secure, HTTP-only, same-site cookies for browser sessions, or a documented equivalent.
- Session expiration and invalidation on logout.
- Rate limiting or throttling for authentication endpoints.
- Generic invalid-credential responses.
- No passwords, reset tokens, OAuth tokens, or secrets in logs.

Authorization must include tests for:

- Unauthenticated access returning `401`.
- A customer reading another customer’s Case by changing the URL.
- A customer posting a comment to another customer’s Case.
- A customer uploading a file to another customer’s Case.
- A customer selecting a product they do not own or cannot use.
- Internal Salesforce fields remaining inaccessible from the client.

### 7. Test the Slice

Add focused tests before broad regression checks.

Backend tests should cover:

- Schema validation and error responses
- Authentication and session behavior
- Customer-to-Contact/Account mapping
- Customer-to-resource authorization
- Salesforce request and field mapping
- Token expiry and retry behavior
- Salesforce timeout, rate-limit, and error normalization
- File type and size rejection
- Case creation, comments, files, and Knowledge search

Frontend tests should cover:

- Protected-route behavior
- Form validation and submission states
- Loading, empty, error, and success states
- Search, filters, pagination, and selection
- Comment and file-upload interactions
- Logout and session restoration

End-to-end tests should cover the primary customer journey, including a negative cross-customer authorization case.

### 8. Validate and Release

Run, as available:

```text
npm run build
npm run lint
npm test
```

Also verify:

- React production bundle contains no Salesforce credentials.
- Backend starts with documented environment variables.
- Health and readiness endpoints respond.
- Staging uses Salesforce sandbox credentials.
- Production uses a separate integration user and client app.
- CORS allows only approved origins and credentials when required.
- HTTPS is enabled outside local development.
- Audit logs and error monitoring are active.
- Deployment, rollback, and secret-rotation instructions exist.

## Decision Points

### Salesforce data is not available locally

Use typed mock adapters or fixtures behind the same service interface. Do not alter the React contract to match temporary mock objects.

### Salesforce field or object mapping is unknown

Create a mapping decision record and use an adapter placeholder. Ask for the mapping rather than inventing a custom field.

### Authentication storage is not selected

Implement the interface and tests first, then choose a persistent store. An in-memory store is acceptable only for an explicitly labeled local demo and must not be described as production-ready.

### Salesforce is unavailable during development

Return a normalized `502` or configured development fallback. Keep the fallback behind an environment flag and show a clear development-only status.

### A feature touches multiple modules

Deliver one vertical slice first: API contract, backend adapter, React view, focused tests, and one end-to-end journey. Then add adjacent capabilities one at a time.

## Completion Checklist

- [ ] Requirements and Salesforce mappings are documented.
- [ ] React and API contracts are typed and validated.
- [ ] Salesforce credentials are server-only.
- [ ] OAuth token handling has expiry and retry behavior.
- [ ] Every resource request performs customer authorization.
- [ ] Internal Salesforce fields are not exposed.
- [ ] File uploads have size and type controls.
- [ ] Loading, empty, error, unauthorized, and success states exist.
- [ ] Authentication and cross-customer access tests pass.
- [ ] React and backend builds pass.
- [ ] Linters pass without new blocking findings.
- [ ] The primary customer journey works in local or sandbox mode.
- [ ] Production limitations and remaining integration work are documented.
