# Customer Support Portal Task Backlog

Tasks derived from [project-plan.md](project-plan.md). Items are ordered by dependency and priority.

## Status and Priority

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `P0` Required for the MVP critical path
- `P1` Required for the complete MVP
- `P2` Useful follow-up or future-ready work

## Phase 0: Product and Salesforce Decisions

- [ ] **P0-001** Confirm whether customer identity is stored in the application, Salesforce, or both.
- [ ] **P0-002** Define the application-customer to Salesforce Contact and Account mapping.
- [ ] **P0-003** Document Salesforce objects and fields for Products, customer-owned products, Cases, comments, Files, and Knowledge.
- [ ] **P0-004** Map Issue Type, Priority, Preferred Contact Method, warranty, and Case status values.
- [ ] **P0-005** Define customer-visible Case fields, statuses, comments, and files.
- [ ] **P0-006** Confirm product eligibility rules and supported product relationships.
- [ ] **P0-007** Confirm file type, file size, retention, and malware-scanning requirements.
- [ ] **P0-008** Choose the Knowledge Base source for the MVP.
- [ ] **P0-009** Choose the email provider and define notification requirements.
- [ ] **P0-010** Approve the initial API contract, response shapes, validation rules, and error codes.
- [ ] **P0-011** Record data privacy, retention, and audit-log requirements.

**Exit criteria:** Salesforce data mapping, permission model, API contract, and unresolved product decisions are documented and approved.

## Phase 1: Project Foundation

- [ ] **P0-012** Scaffold the React and TypeScript frontend.
- [ ] **P0-013** Scaffold the Node.js and TypeScript backend.
- [ ] **P0-014** Configure package scripts for development, build, lint, type checking, and tests.
- [ ] **P0-015** Add environment-specific configuration with safe startup validation.
- [ ] **P0-016** Add formatting and linting rules.
- [ ] **P0-017** Add unit, integration, and end-to-end test foundations.
- [ ] **P0-018** Add a backend health-check endpoint.
- [ ] **P0-019** Define the standard API error response format.
- [ ] **P0-020** Add structured logging and request correlation IDs.
- [ ] **P0-021** Add CI checks for formatting, linting, type checking, and automated tests.
- [ ] **P0-022** Write local development and environment setup documentation.

**Exit criteria:** frontend and backend run locally, the health check works, CI is passing, and secrets are loaded only through server configuration.

## Phase 2: Authentication and Identity

- [ ] **P0-023** Design the customer account and Salesforce identity mapping schema.
- [ ] **P0-024** Implement password hashing and credential storage.
- [ ] **P0-025** Implement `POST /api/auth/register`.
- [ ] **P0-026** Implement `POST /api/auth/login`.
- [ ] **P0-027** Implement `POST /api/auth/logout`.
- [ ] **P0-028** Implement secure session or short-lived access-token handling.
- [ ] **P0-029** Implement duplicate-email and invalid-credential error handling.
- [ ] **P0-030** Add failed-login throttling or account protection.
- [ ] **P1-031** Implement password reset request and completion flows.
- [ ] **P1-032** Add email verification if required by the approved product decision.
- [ ] **P0-033** Add authentication middleware for protected routes.
- [ ] **P0-034** Implement `GET /api/customer`.
- [ ] **P0-035** Add authentication unit and integration tests.

**Exit criteria:** a customer can register, authenticate, log out, recover access, and retrieve their own customer profile.

## Phase 3: Salesforce Integration

- [ ] **P0-036** Create the dedicated Salesforce integration user.
- [ ] **P0-037** Configure the Salesforce External Client App and OAuth 2.0 flow.
- [ ] **P0-038** Configure least-privilege Salesforce object and field permissions.
- [ ] **P0-039** Implement Salesforce access-token acquisition and refresh.
- [ ] **P0-040** Implement a reusable Salesforce REST client.
- [ ] **P0-041** Add request timeouts and transient-failure retries.
- [ ] **P0-042** Normalize Salesforce errors into application API errors.
- [ ] **P0-043** Add safe Salesforce request logging without secrets or sensitive payloads.
- [ ] **P0-044** Implement customer, product, Case, comment, file, and Knowledge client operations as needed by each feature.
- [ ] **P0-045** Add mocked Salesforce integration tests.
- [ ] **P0-046** Verify the integration against a Salesforce sandbox.

**Exit criteria:** the backend can authenticate to the Salesforce sandbox and safely perform an authorized read operation.

## Phase 4: Dashboard and Products

- [ ] **P0-047** Implement `GET /api/products`.
- [ ] **P0-048** Add product ownership and eligibility checks.
- [ ] **P0-049** Build the authenticated application shell and navigation.
- [ ] **P0-050** Build the customer dashboard.
- [ ] **P0-051** Display open, pending, resolved, and recent Case summaries.
- [ ] **P0-052** Build the product list and product details view.
- [ ] **P1-053** Display serial number, purchase date, and warranty information where available.
- [ ] **P0-054** Add loading, empty, error, and unauthorized states.
- [ ] **P0-055** Add frontend tests for protected routes, dashboard, and products.

**Exit criteria:** an authenticated customer can view their dashboard and only their associated products.

## Phase 5: Case Creation

- [ ] **P0-056** Define the create-Case request and response schemas.
- [ ] **P0-057** Implement server-side validation for required and optional fields.
- [ ] **P0-058** Implement product eligibility validation during Case creation.
- [ ] **P0-059** Implement `POST /api/cases`.
- [ ] **P0-060** Map the authenticated customer to the Salesforce Contact and Account.
- [ ] **P0-061** Map the request to allowed Salesforce Case fields.
- [ ] **P0-062** Return the Case ID, Case number, status, and creation timestamp.
- [ ] **P0-063** Build the Case creation form.
- [ ] **P0-064** Add client-side validation and accessible error messages.
- [ ] **P0-065** Add confirmation view showing the created Case number.
- [ ] **P1-066** Add attachment selection and upload handling to Case creation.
- [ ] **P0-067** Add end-to-end tests for successful and rejected Case creation.

**Exit criteria:** an eligible authenticated customer can create a Salesforce Case and receive a confirmation containing the Case number.

## Phase 6: Case List, Details, Comments, and Files

- [ ] **P0-068** Implement `GET /api/cases` with pagination.
- [ ] **P0-069** Add status filtering, search, and sorting parameters.
- [ ] **P0-070** Implement centralized customer-to-Case authorization.
- [ ] **P0-071** Implement `GET /api/cases/:caseId`.
- [ ] **P0-072** Build the Case list view.
- [ ] **P0-073** Build the Case detail view and status timeline.
- [ ] **P0-074** Display only approved customer-visible fields.
- [ ] **P0-075** Implement `POST /api/cases/:caseId/comments`.
- [ ] **P0-076** Build the customer comment form and conversation view.
- [ ] **P1-077** Implement `POST /api/cases/:caseId/files`.
- [ ] **P1-078** Add file type, size, extension, and content validation.
- [ ] **P1-079** Add file list and upload states to the Case detail view.
- [ ] **P0-080** Add tests proving one customer cannot access another customer's Case.
- [ ] **P0-081** Add tests for comments, Case filtering, pagination, and status display.

**Exit criteria:** customers can list and inspect their own Cases, communicate through comments, and upload permitted files without accessing another customer's data.

## Phase 7: Knowledge Base

- [ ] **P1-082** Implement `GET /api/knowledge` with keyword search.
- [ ] **P1-083** Add the Knowledge source adapter.
- [ ] **P1-084** Build the Knowledge search interface.
- [ ] **P1-085** Build article details and popular-article views.
- [ ] **P1-086** Add loading, no-results, and provider-error states.
- [ ] **P2-087** Document the extension point for AI-powered article recommendations.

**Exit criteria:** customers can search and view approved Knowledge articles through a provider-independent API response.

## Phase 8: Notifications

- [ ] **P1-088** Define notification event payloads.
- [ ] **P1-089** Implement events for Case created, agent responded, action required, resolved, and closed.
- [ ] **P1-090** Integrate the approved email provider.
- [ ] **P1-091** Create customer-safe email templates.
- [ ] **P1-092** Implement delivery-status tracking and retry handling.
- [ ] **P1-093** Add notification integration tests.
- [ ] **P2-094** Document extension points for SMS, push, and WhatsApp channels.

**Exit criteria:** required MVP events produce safe emails, and provider failures are recorded for retry or operational review.

## Phase 9: Security, Operations, and Release

- [ ] **P0-095** Enforce HTTPS in staging and production.
- [ ] **P0-096** Configure strict CORS and CSRF protection where applicable.
- [ ] **P0-097** Add rate limiting to authentication and write endpoints.
- [ ] **P0-098** Verify secrets are absent from frontend bundles and logs.
- [ ] **P0-099** Add audit events for authentication, Case changes, uploads, and authorization failures.
- [ ] **P0-100** Add dependency vulnerability scanning.
- [ ] **P0-101** Add centralized logs and error monitoring.
- [ ] **P0-102** Add health and readiness checks for deployment.
- [ ] **P0-103** Configure local, development, staging, and production environments.
- [ ] **P0-104** Configure Salesforce sandbox integration for development and staging.
- [ ] **P0-105** Configure the separate production Salesforce integration user and client app.
- [ ] **P0-106** Run security tests for IDOR, injection, XSS, unsafe uploads, CORS, CSRF, and brute-force protection.
- [ ] **P0-107** Run full end-to-end regression tests in staging.
- [ ] **P0-108** Write deployment, rollback, incident, and operational documentation.

**Exit criteria:** staging passes functional and security acceptance tests, monitoring is active, and production deployment procedures are documented.

## MVP Release Checklist

- [ ] Customers can register, authenticate, log out, and recover access.
- [ ] Customers can view only their own products and Cases.
- [ ] Customers can create a valid Salesforce Case.
- [ ] The Case number and status are shown after creation.
- [ ] Customers can view Case details and add comments.
- [ ] Supported files can be uploaded and linked to Cases.
- [ ] Knowledge articles can be searched.
- [ ] Required email notifications are sent or recorded for retry.
- [ ] All API inputs are validated server-side.
- [ ] Salesforce credentials are never exposed to the frontend.
- [ ] Authorization, file handling, and rate limiting have automated tests.
- [ ] Staging has been verified against a Salesforce sandbox.
- [ ] Monitoring, audit logging, and operational documentation are available.