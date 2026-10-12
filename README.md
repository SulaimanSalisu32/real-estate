# Real Estate Platform

This pnpm monorepo contains the NestJS/MongoDB API and the public property
marketplace web app.

## Workspace

```text
apps/
  api/   NestJS REST API (agents, properties, inquiries)
  web/   Next.js property marketplace
```

## Requirements

- Node.js 20.9 or later
- pnpm 10 or later
- MongoDB (local or hosted)

## Install and run

```bash
pnpm install
```

Copy `apps/api/.env.example` to `apps/api/.env` and set `MONGODB_URI` if you
aren't using the local default. Start both applications from the repository
root:

```bash
pnpm dev
```

The API runs at `http://localhost:3000`; the web app runs at
`http://localhost:3001`. `WEB_ORIGIN` configures the allowed browser origin for
the API (default `http://localhost:3001`). The marketplace reads `NEXT_PUBLIC_API_URL`
and defaults to `http://localhost:3000`.

The web app keeps development output in `.next-dev` and production build output
in `.next`, so running `pnpm build` does not overwrite files used by `pnpm dev`.

Set `JWT_SECRET` in `apps/api/.env` to a long random value for stable sessions.
Without it, the API generates a temporary secret at startup, so signing in again
will be necessary after an API restart. Always set a private secret in
production.

### Local/offline payments

The app records offline cash or bank-transfer payments; it does not process
money or connect to a payment provider. Once an agent approves a request, the
client can choose **Make payment** in **My requests** to view the bank transfer
details and amount:

| Bank | Account name | Account number |
| --- | --- | --- |
| Zenith Bank | Haven Real-Estates | `4928692953` |
| Fidelity Bank | Haven Real-Estates | `6328572654` |

After transferring or paying the agent in cash, the client reports the method
and receipt/reference in the dialog. The assigned agent checks receipt outside
the app and confirms or rejects the report in the agent workspace.

The property stays reserved while payment is reviewed. It is marked sold or
rented only after the agent confirms receipt. A rejected report lets the client
submit corrected details. These bank details are displayed for convenience;
clients should confirm the payment details with the agent before sending funds.
The app does not store payment credentials or move money.

### Account setup

Clients create their own accounts from the marketplace using an email address
and a password of at least 8 characters. Accounts receive a signed, HTTP-only
session cookie; sign-in is available to clients and agents from the same form.
Clients need to be signed in to send a purchase or rental request. The account
page shows the status and agent contact details for their requests.
Clients can also draft feedback, complaints, and suggestions in their account
and send them to a related agent through WhatsApp or email. The Facebook option
copies the message and opens a Facebook search for **Haven Real-Estates** so
the client can select the correct page and paste the message.

Agent accounts cannot self-register. Bootstrap the first administrator from
PowerShell at the repository root. Run each line separately in the same
PowerShell terminal; when prompted, type the value and press Enter. The quoted
text is only a prompt label—do not replace it with your email or password.

```powershell
$env:ADMIN_EMAIL = Read-Host "Admin email"
$env:ADMIN_FIRST_NAME = Read-Host "Admin first name"
$env:ADMIN_LAST_NAME = Read-Host "Admin last name"
$securePassword = Read-Host "Admin password (at least 8 characters)" -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new("", $securePassword).Password
pnpm create-admin
Remove-Item Env:ADMIN_EMAIL, Env:ADMIN_FIRST_NAME, Env:ADMIN_LAST_NAME, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
Remove-Variable securePassword
```

Sign in to the marketplace with that admin account and open **Agent workspace**
to provision agent accounts. Agents then sign in with the email and password
created for them. The workspace lets agents add, edit, and delete listings,
change availability, and review requests assigned to them.

## Workspace commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm seed
pnpm --filter @nest-app/api start:dev
pnpm --filter @nest-app/web dev
```

`pnpm seed` inserts or refreshes a small demo dataset in MongoDB: one sample
agent, one house, one land listing, one apartment, and three sample inquiries.
It is safe to run more than once and does not clear other database records.
To let the demo agent sign in, an administrator can provision an agent account
with the same `amina.bello@example.com` email from the agent workspace.

## API

All request and response bodies are JSON. Request bodies are validated; unknown
fields and invalid MongoDB IDs are rejected. `GET /` returns an API welcome
message.

### Authentication and access

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create a client account |
| `POST` | `/auth/signin` | Public | Sign in as a client, agent, or admin |
| `POST` | `/auth/signout` | Public | Clear the session cookie |
| `GET` | `/auth/me` | Signed in | Get the current account |
| `POST` | `/auth/agent-accounts` | Admin | Provision an agent and agent profile |

Listing reads remain public. Creating, updating, or deleting listings requires
an agent or admin session. Agents can only view and update requests assigned to
their agent profile; clients can only see their own requests. The API also
restricts inquiry-management routes to agents/admins. Authentication uses
short-lived signed cookies; configure `JWT_SECRET` before production use.

### Purchase and rental requests

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/requests` | Client | Request to buy or rent an available listing |
| `GET` | `/requests` | Client, agent, admin | List own requests or assigned requests |
| `PATCH` | `/requests/:id` | Assigned agent, admin | Mark contacted, approve, or decline |

The listing determines whether a request is for purchase or rental. The agent
can approve or decline it. Approval reserves the property. After the client
reports an offline payment, the assigned agent confirms or rejects receipt. On
confirmation the property is marked sold or rented; rejecting a report allows
the client to resubmit. An agent can decline an approved request before a
payment is reported to release the reservation. This is not a legal contract.

### Payments

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/payments/report/:requestId` | Request-owning client | Report cash or bank-transfer payment for an approved request |
| `GET` | `/payments` | Client, assigned agent, admin | List the caller's reports or assigned reports |
| `PATCH` | `/payments/:id` | Assigned agent, admin | Confirm or reject a reported payment |

The amount and currency are taken from the approved listing, not supplied by
the client. This is a manual receipt-recording workflow: agents must verify
receipt outside the app before confirming it. It does not transfer money.

### Agents

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/agents` | Create an agent |
| `GET` | `/agents` | List agents |
| `GET` | `/agents/:id` | Get an agent |
| `PATCH` | `/agents/:id` | Update an agent |
| `DELETE` | `/agents/:id` | Delete an agent |

```json
{
  "firstName": "Amina",
  "lastName": "Bello",
  "email": "amina@example.com",
  "phone": "+2348000000000",
  "agency": "Nest Realty"
}
```

Agent email addresses must be unique.

### Properties

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/properties` | Create a listing |
| `GET` | `/properties` | List listings |
| `GET` | `/properties/:id` | Get a listing |
| `PATCH` | `/properties/:id` | Update a listing |
| `DELETE` | `/properties/:id` | Delete a listing |

```json
{
  "title": "Three-bedroom apartment",
  "description": "Bright apartment close to local shops.",
  "type": "apartment",
  "listingType": "rent",
  "price": 1200,
  "currency": "USD",
  "address": "12 Example Road",
  "city": "Lagos",
  "country": "Nigeria",
  "bedrooms": 3,
  "bathrooms": 2,
  "area": 110,
  "areaUnit": "sqm",
  "agent": "REPLACE_WITH_AGENT_ID"
}
```

`type` is `house`, `land`, or `apartment`; `listingType` is `sale` or `rent`;
`status` is `available`, `reserved`, `sold`, or `rented`. The assigned agent
must exist.

### Inquiries

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/inquiries` | Submit an inquiry about a property |
| `GET` | `/inquiries` | List inquiries |
| `GET` | `/inquiries/:id` | Get an inquiry |
| `PATCH` | `/inquiries/:id` | Update inquiry status |
| `DELETE` | `/inquiries/:id` | Delete an inquiry |

```json
{
  "property": "REPLACE_WITH_PROPERTY_ID",
  "name": "Sam Example",
  "email": "sam@example.com",
  "phone": "+2348000000001",
  "message": "Can I schedule a viewing?"
}
```

The API assigns an inquiry to the listing's agent. Inquiry status can be `new`,
`contacted`, or `closed`.

## Security note

The API currently has no authentication or authorization. Add access controls
before exposing management endpoints publicly.
#   L M S  
 