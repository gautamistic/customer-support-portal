Product Requirements Document

Customer Support Portal

Version: 1.0
Status: Draft
Frontend: React.js / TypeScript
Backend: Node.js / TypeScript
CRM: Salesforce

1. Product Overview

The Customer Support Portal is an external web application that enables customers to obtain product support through a modern self-service experience. React provides the customer-facing interface, Node.js provides the application/API layer, and Salesforce remains the system of record for customer, product, and support-case data.

2. Problem Statement

Customers frequently depend on email or phone channels to report product issues, making it difficult to track requests, provide complete information, exchange files, and obtain timely updates. Support teams also spend time manually creating and maintaining cases.

3. Goals

Allow customers to securely create Salesforce Cases.

Allow customers to view and track their Cases.

Allow customers to communicate with support through Case comments.

Allow customers to upload supporting files.

Provide product-aware support and self-service.

Reduce manual Case creation and repetitive support work.

Provide an architecture that can later support knowledge search and AI/Agentforce.

4. Non-Goals for MVP

Replacing the Salesforce Service Console.

Voice or video support.

Payment processing or product purchasing.

Advanced AI chatbot functionality.

Complex agent workflow management.

5. Personas

Persona

Primary Needs

Customer

Create cases, track cases, communicate with support, upload evidence, find solutions.

Support Agent

Work Cases, investigate issues, communicate with customers, resolve Cases in Salesforce.

Support Manager

Monitor Case volume, SLA, unresolved work, and support performance.

6. High-Level Architecture

Customer
   |
   v
React Web Application
   |
   | HTTPS
   v
Node.js REST API
   |
   | OAuth 2.0
   v
Salesforce
   |
   +-- Account
   +-- Contact
   +-- Product
   +-- Case
   +-- Case Comments
   +-- Files

Salesforce credentials and client secrets must remain server-side and must never be embedded in the React application.

7. Authentication and Salesforce Integration

Customers should have an application-level identity rather than being required to hold Salesforce credentials. The Node.js backend should use a dedicated Salesforce integration user and an External Client App/OAuth configuration for server-to-Salesforce communication.

Requirements:

Create a dedicated Salesforce integration user with least-privilege permissions.

Create/configure a Salesforce External Client App for the integration.

Use OAuth 2.0 for backend-to-Salesforce authentication.

Store Salesforce client credentials in secure server-side configuration or a secrets manager.

Use HTTPS for all customer and API traffic.

Enforce customer-to-Case authorization on every Case request.

8. Functional Requirements

8.1 Customer Registration and Login

Customer can register using email and required profile information.

Customer can log in and log out securely.

Customer can reset a forgotten password.

Duplicate email and invalid credentials must be handled gracefully.

Sessions/tokens must be securely managed.

8.2 Customer Dashboard

Show customer identity and a summary of Cases.

Show open, pending, resolved, and recent Cases.

Provide navigation to Products, Cases, Knowledge Base, and Create Case.

8.3 Products

Display products associated with the authenticated customer.

Show product name, serial number, purchase date, and warranty information where available.

Allow the customer to start a support Case for an eligible product.

8.4 Create Case

Required fields:

Product

Issue Type

Subject

Description

Optional fields:

Priority

Serial Number

Preferred Contact Method

Attachments

On submission, Node.js validates the request, identifies the Salesforce Account and Contact for the authenticated customer, validates the selected product, creates the Salesforce Case, and returns the Case number/ID to React.

8.5 Case List

Customer can view only their own Cases.

Customer can filter by status.

Customer can search or paginate through Cases.

Each Case shows Case Number, Subject, Product, Status, Priority, and Created Date.

8.6 Case Details and Comments

Display Case details and current status.

Display customer/support conversation.

Allow customer to add comments.

Allow customer to upload files where permitted.

Prevent customers from changing internal-only Salesforce fields.

8.7 Case Status

Initial lifecycle:

New
  |
  v
In Progress
  |
  v
Waiting for Customer
  |
  v
Resolved
  |
  v
Closed

8.8 Knowledge Base

Provide keyword search.

Display popular/relevant articles.

Use Salesforce Knowledge or another approved knowledge source.

Prepare the interface for future AI-powered article recommendations.

8.9 Notifications

Notifications should be supported for:

Case created.

Agent responded.

Customer action required.

Case resolved.

Case closed.

MVP channel: Email.

Future channels may include SMS, push notifications, and WhatsApp.

9. Salesforce Data Model

Object

Purpose

Account

Customer/company account.

Contact

Individual customer identity.

Product2

Products supported by the organization.

Customer Product

Optional custom object representing customer-owned products.

Case

Primary support request.

CaseComment

Case conversation/comments where applicable.

ContentDocument / ContentVersion / ContentDocumentLink

Customer/support files attached to Cases.

10. API Requirements

Method

Endpoint

Purpose

POST

/api/auth/login

Authenticate customer

POST

/api/auth/register

Register customer

GET

/api/customer

Get authenticated customer

GET

/api/products

Get customer products

GET

/api/cases

List customer's Cases

POST

/api/cases

Create a Case

GET

/api/cases/:caseId

Get Case details

POST

/api/cases/:caseId/comments

Add Case comment

POST

/api/cases/:caseId/files

Upload Case file

GET

/api/knowledge

Search knowledge articles

11. Salesforce API Flow

Customer submits the Create Case form in React.

React sends the request to the Node.js API.

Node.js authenticates the customer and validates the payload.

Node.js identifies the customer's Salesforce Contact/Account.

Node.js authenticates to Salesforce using OAuth.

Node.js calls the Salesforce REST API to create the Case.

Salesforce returns the Case ID.

Node.js returns the Case number and status to React.

React displays a confirmation to the customer.

React
  |
  | POST /api/cases
  v
Node.js
  |
  | Authenticate + Validate
  v
Salesforce OAuth
  |
  | Access Token
  v
Salesforce REST API
  |
  | Create Case
  v
Salesforce Case
  |
  v
Node.js
  |
  v
React
  |
  v
Case #00012345 created

12. Security Requirements

Use HTTPS for all production traffic.

Never expose Salesforce client secrets in React.

Use least-privilege permissions for the Salesforce integration user.

Enforce object and field-level permissions where appropriate.

Authorize every customer request against the authenticated customer identity.

Prevent insecure direct object references to another customer's Case.

Validate all input on the server.

Apply API rate limiting and abuse protection.

Validate file type and size; add malware scanning where required.

Never log passwords, OAuth client secrets, access tokens, or sensitive customer data.

Maintain application and integration audit logs.

13. Non-Functional Requirements

Requirement

Target

Initial page load

< 3 seconds

Typical API response

< 2 seconds

Case creation

< 3 seconds under normal conditions

Availability

99.5%+

Case list

Paginated

Scalability

Support growth without redesigning Salesforce integration

14. Error Handling

Technical Salesforce errors should be logged server-side and translated into customer-friendly messages. The React application should never expose raw Salesforce exceptions, SOQL errors, OAuth credentials, or internal stack traces.

Example:

We couldn't create your support case. Please try again.

15. MVP Scope

Customer registration/login

Customer dashboard

Customer products

Create Case

Salesforce Case creation

My Cases

Case details

Case comments

Basic email notifications

Secure React → Node.js → Salesforce integration

16. Future Roadmap

Release

Capabilities

V2

Attachments, Knowledge Base, advanced notifications, warranty information, improved Case filtering.

V3

AI support assistant, Case classification, suggested Knowledge articles, Case summarization, sentiment analysis.

V4

Live chat, WhatsApp, mobile app, voice support, advanced analytics.

17. Success Metrics

Metric

Target

Cases created through portal

> 60%

Successful Case creation

> 99%

Portal availability

> 99.5%

Case creation response

< 3 seconds

Customer self-service resolution

> 20%

Customer satisfaction

> 85%

18. Acceptance Criteria — MVP

Authenticated customers can access only their own customer data.

A customer can select one of their products and create a Case.

A successfully submitted Case appears in Salesforce.

The portal displays the Salesforce Case number after successful creation.

A customer can retrieve and view their Cases.

A customer can open a Case and view its details.

A customer can add a Case comment.

Salesforce credentials are not present in frontend source code or browser network payloads.

Unauthorized attempts to access another customer's Case are rejected.

Salesforce/API failures produce a usable customer-facing error.

19. Recommended Implementation Sequence

Design Salesforce objects, relationships, fields, and permissions.

Create the Salesforce integration user and External Client App.

Implement Node.js Salesforce OAuth authentication.

Implement a Node.js Salesforce health-check/test endpoint.

Implement Case creation through Salesforce REST API.

Implement customer authorization and Case retrieval.

Build the React authentication and dashboard experience.

Build Products and Create Case screens.

Build My Cases and Case Details.

Add comments and files.

Add notifications and monitoring.

Perform security, performance, and end-to-end testing.

20. Key Architectural Decision

The recommended architecture is React + TypeScript for the customer experience, Node.js + TypeScript for the API and integration layer, and Salesforce as the CRM/system of record.

React should never directly hold Salesforce client secrets. Node.js should encapsulate Salesforce authentication, authorization, validation, business rules, and API calls.