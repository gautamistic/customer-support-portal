# Customer Support Portal Project Plan

This plan translates the requirements in [prd.md](prd.md) into an incremental implementation roadmap for the React, Node.js, and Salesforce customer support portal.

## 1. MVP Scope

The MVP will provide:

- Customer registration, login, logout, and password reset
- Customer dashboard with Case summaries
- Customer product list and product eligibility information
- Salesforce Case creation
- Case list with status filtering, search, and pagination
- Case details and customer-visible Case comments
- Case file uploads
- Knowledge Base keyword search
- Email notifications for important Case events
- Secure Salesforce integration through the Node.js backend

The MVP will not include advanced AI, voice or video support, payments, SMS or WhatsApp notifications, or complex agent workflow management.

## 2. Architecture

### Frontend

React and TypeScript will provide the customer-facing application. It will contain authentication screens, the dashboard, product views, Case workflows, Knowledge Base, notifications, loading states, and error states.

The frontend will communicate only with the Node.js API. Salesforce credentials, OAuth client secrets, and access tokens must remain server-side.

### Backend

Node.js and TypeScript will provide the REST API and will be responsible for:

- Customer authentication and session management
- Server-side request validation
- Customer-to-Salesforce identity mapping
- Authorization for every customer resource request
- Salesforce OAuth and REST API integration
- File validation and upload handling
- Email notifications
- Rate limiting and abuse protection
- Audit logging and safe error handling

Recommended backend modules:

```text
src/
  auth/
  customers/
  products/
  cases/
  comments/
  files/
  knowledge/
  notifications/
  salesforce/
  middleware/
  audit/
  config/
```

### Salesforce

Salesforce remains the system of record for Accounts, Contacts, Products, customer-owned products where applicable, Cases, comments, Files, and Knowledge articles.

Use a dedicated integration user with least-privilege permissions and an External Client App configured for OAuth 2.0.

## 3. Delivery Phases

### Phase 0: Confirm Product and Salesforce Decisions

Resolve the following before implementation:

- Whether customer identity is stored in the application, Salesforce, or both
- How customer products relate to Contacts and Accounts
- Salesforce fields for Issue Type, Priority, Preferred Contact Method, and warranty data
- File upload limits, permissions, and malware-scanning requirements
- Which Case fields, statuses, and comments are customer-visible
- Whether Salesforce Knowledge is the MVP Knowledge Base source
- Email provider and notification delivery requirements
- Data retention and privacy requirements

**Deliverable:** approved Salesforce data mapping, permission model, and API contract.

### Phase 1: Project Foundation

Set up:

- React and TypeScript frontend
- Node.js and TypeScript backend
- Shared request and response types where useful
- Environment-specific configuration
- Formatting, linting, and type checking
- Unit and integration test frameworks
- CI pipeline
- Health-check endpoint
- Standard API error format
- Structured logging with correlation IDs

Suggested API error format:

```json
{
  "error": {
    "code": "CASE_NOT_FOUND",
    "message": "The requested case could not be found."
  }
}
```

### Phase 2: Authentication and Customer Identity

Implement registration, login, logout, password reset, the authenticated customer endpoint, secure session or short-lived access-token handling, password hashing, failed-login protection, duplicate-email handling, invalid-credential handling, and authentication middleware.

Each application customer must map to a known Salesforce Contact or Account relationship. This mapping will be used by every downstream authorization check.

### Phase 3: Salesforce Integration Layer

Create a dedicated Salesforce client abstraction instead of placing Salesforce calls directly in route handlers.

The client should handle OAuth token acquisition and refresh, REST API version configuration, request timeouts, transient-error retries, Salesforce error normalization, correlation IDs, and safe logging.

The integration layer should expose operations for customer lookup, product lookup, Case listing, Case creation, Case retrieval, comment creation, file upload, and Knowledge search.

### Phase 4: Dashboard and Products

Implement customer identity display, open/pending/resolved/recent Case summaries, the product list, product name, serial number, purchase date and warranty information, product eligibility checks, navigation to Products/Cases/Knowledge Base/Create Case, and loading, empty, and error states.

### Phase 5: Case Creation

Required fields:

- Product
- Issue Type
- Subject
- Description

Optional fields:

- Priority
- Serial Number
- Preferred Contact Method
- Attachments

The backend must authenticate the customer, validate the payload, resolve the Salesforce Contact and Account, verify product eligibility, validate allowed field values, create the Case, upload permitted files, trigger the Case-created notification, and return the Case number, ID, status, and timestamp.

### Phase 6: Case List, Details, and Conversation

Implement the Case list with search, status filtering, sorting, and pagination; the Case detail view; status timeline; Case metadata; customer-visible conversation history; comment submission; customer-visible files; and file uploads.

The initial Case lifecycle is:

```text
New -> In Progress -> Waiting for Customer -> Resolved -> Closed
```

Customers must not be able to modify internal Salesforce fields or access another customer's Case by changing a URL or API parameter.

### Phase 7: Knowledge Base

Implement keyword search, popular or relevant articles, article details, and empty and error states.

Use an internal response model independent of Salesforce-specific fields so future AI recommendations can be added without redesigning the frontend.

### Phase 8: Notifications

Create an event-based notification service for:

```text
case.created
case.agent_responded
case.action_required
case.resolved
case.closed
```

The MVP channel is email. Record delivery status, retry provider failures, avoid exposing unnecessary Case information in email, and include secure links back to the portal.

### Phase 9: Security and Release Hardening

Before release, verify HTTPS, server-only Salesforce secrets, secure secrets configuration, secure cookies or token handling, strict CORS, CSRF protection when cookie sessions are used, rate limiting, server-side validation, file type/size/extension/content validation, malware scanning where required, Salesforce object- and field-level permissions, safe logging, and audit logs for authentication, Case changes, uploads, and authorization failures.

## 4. API Delivery Order

Implement and test the API in this order:

1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `POST /api/auth/logout`
4. Password reset endpoints
5. `GET /api/customer`
6. `GET /api/products`
7. `GET /api/cases`
8. `POST /api/cases`
9. `GET /api/cases/:caseId`
10. `POST /api/cases/:caseId/comments`
11. `POST /api/cases/:caseId/files`
12. `GET /api/knowledge`

The API contract should define authentication requirements, pagination parameters, filtering parameters, validation rules, response shapes, and error codes for every endpoint.

## 5. Testing Strategy

### Unit Tests

Test request validation, authentication rules, Salesforce field mapping, product eligibility, status handling, file validation, notification events, and Salesforce error normalization.

### Backend Integration Tests

Test authenticated and unauthenticated access, cross-customer Case access prevention, mocked Salesforce responses, Case creation, comments, files, rate limiting, timeouts, and Salesforce failures.

### Frontend Tests

Test protected routes, authentication states, dashboard rendering, Case form validation, filtering and pagination, Case detail interactions, file-upload errors, loading states, and empty states.

### End-to-End Tests

Cover registration and login, product viewing, Case creation, Case-number confirmation, Case details, comments, supported-file upload, Knowledge Base search, and rejection of another customer's Case access.

### Security Tests

Include IDOR authorization checks, brute-force protection checks, unsafe file upload tests, XSS and injection checks, CORS and CSRF verification, secret-exposure checks, and dependency vulnerability scanning.

## 6. Deployment Plan

Use separate environments:

```text
local
development
staging
production
```

Deployment should include HTTPS, managed secrets, centralized logs, error monitoring, health and readiness checks, automated migrations if an application database is used, and CI checks for linting, type checking, tests, and dependency audits.

Development and staging should use a Salesforce sandbox. Production should use a separately configured production integration user and client application.

## 7. Key Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Incorrect customer-to-Case authorization | Centralize authorization and test cross-customer access explicitly |
| Salesforce API limits or outages | Add timeouts, retries, clear errors, and appropriate caching |
| Ambiguous Salesforce data model | Approve object and field mappings during Phase 0 |
| Unsafe file uploads | Enforce limits and add malware scanning where required |
| Customer identity mismatch | Define a stable application customer to Salesforce Contact mapping |
| Notification delivery failures | Use retryable notification processing and delivery status tracking |
| Knowledge source changes | Hide provider details behind a Knowledge adapter |
| AI or workflow scope expansion | Keep future capabilities behind interfaces and outside MVP acceptance criteria |

## 8. Definition of Done

The MVP is complete when:

- Customers can register, log in, log out, and recover access.
- Customers can view only their own products and Cases.
- Customers can create a valid Salesforce Case.
- The Case number and status are displayed after creation.
- Customers can view Case details and add comments.
- Supported files can be uploaded and linked to Cases.
- Knowledge articles can be searched.
- Required email notifications are sent or recorded for retry.
- All API inputs are validated server-side.
- Salesforce credentials are never exposed to the frontend.
- Authorization, file handling, and rate limiting have automated tests.
- Staging has been verified against a Salesforce sandbox.
- Monitoring, audit logging, and operational documentation are available.

## 9. First Sprint

1. Confirm Salesforce objects, fields, permissions, and identity mapping.
2. Scaffold the React and Node.js TypeScript applications.
3. Add environment configuration and health checks.
4. Implement registration and login.
5. Implement backend Salesforce OAuth.
6. Add `GET /api/customer`.
7. Add `GET /api/products`.
8. Build the initial authenticated dashboard.
9. Add unit and integration tests for authentication and customer authorization.

The first sprint should validate the two highest-risk foundations: customer identity and secure Salesforce access.