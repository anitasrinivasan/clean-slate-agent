# Clean Slate Agent

**An AI-powered public defender that helps people understand their eligibility to clear a criminal record — for free, confidentially, and without judgment.**

Nearly 1 in 3 American adults has a criminal record. Most are eligible for some form of expungement or record sealing, but navigating the legal system is expensive, confusing, and intimidating. Clean Slate Agent removes those barriers by providing a conversational AI assistant that walks individuals through the process, state by state, and issues a privacy-preserving credential that proves eligibility to employers — without ever revealing the underlying record.

---

## The Problem

Millions of people with old or minor convictions are locked out of employment, housing, and education — even when the law says their record can be cleared. The system fails them in three ways:

1. **Legal complexity.** Every state has different rules, terminology, waiting periods, and exclusions. Colorado calls it "sealing." California calls it "dismissal." Texas calls it "expunction." A misdemeanor theft in Ohio has a 1-year wait; in Michigan, it's 3 years.

2. **Cost.** Hiring an attorney for expungement can cost $1,000–$5,000. Legal aid organizations are overwhelmed and under-resourced.

3. **Privacy.** Even after expungement, the process of proving eligibility to an employer often requires disclosing the very details the law intended to protect. There is no standardized way to say "I'm cleared" without saying "here's what I was cleared of."

## What Clean Slate Agent Does

### For Individuals

Talk to the agent like you'd talk to a person. Describe your situation — what happened, when, where — and the agent assesses your likely eligibility based on the expungement laws of your state.

- Covers **10 states**: Colorado, California, Texas, New York, Florida, Illinois, Pennsylvania, Ohio, Michigan, and Georgia
- Understands state-specific terminology, waiting periods, eligible offense categories, and exclusions
- Accepts **RAP sheet uploads** — take a photo of your record and the agent reads it
- Issues a **credential** you can share with employers to prove eligibility without revealing your record
- Free. Always.

### For Employers

Verify a candidate's expungement eligibility using only a credential ID. You learn one thing: whether this person is eligible for employment consideration. You never see the offense, the date, the jurisdiction, or any detail about the underlying record.

This is what Ban the Box laws intended — and what privacy technology now makes enforceable.

- Enter a credential ID shared by the candidate
- Receive a binary eligibility determination: eligible or not eligible
- **No criminal record details are transmitted, stored, or visible** at any point in the verification
- Powered by Canton Network's sub-transaction privacy, which ensures that the employer's view of the credential is cryptographically limited to the eligibility field alone

---

## How It Works

```
Individual                    Clean Slate Agent                 Employer
    |                               |                               |
    |  "I had a misdemeanor in      |                               |
    |   Colorado in 2019..."        |                               |
    |------------------------------>|                               |
    |                               |                               |
    |  Assessment: eligible         |                               |
    |  + Credential issued          |                               |
    |<------------------------------|                               |
    |                               |                               |
    |  Shares credential ID         |                               |
    |------------------------------------------------------>        |
    |                               |                               |
    |                               |   Verify credential           |
    |                               |<------------------------------|
    |                               |                               |
    |                               |   Result: "eligible"          |
    |                               |   (no record details)         |
    |                               |------------------------------>|
```

### The Privacy Model

When the agent determines eligibility, it creates a credential on the Canton Network containing:

| Field | Individual sees | Employer sees |
|-------|:-:|:-:|
| Eligibility status | Yes | Yes |
| State jurisdiction | Yes | **No** |
| Offense type | Yes | **No** |
| Conviction date | Yes | **No** |
| Sentence completed | Yes | **No** |
| Assessment date | Yes | **No** |

This isn't access control or permissions — it's cryptographic. The employer's node literally cannot see the redacted fields. Canton's sub-transaction privacy makes this a property of the ledger itself, not an application-layer choice.

### The Economic Model

The agent operates its own smart wallet on Base. Individuals receive help for free. Employers pay a micropayment (fractions of a cent via the x402 protocol) to verify credentials. This creates a self-sustaining model where the public-interest service funds itself through the B2B verification market — no donations, no grants, no data monetization.

---

## Architecture

```
Frontend (React + Vite + Tailwind)
  |
  |--- /chat          Conversational eligibility assessment
  |--- /employer      Credential verification portal
  |--- /status        Agent transparency dashboard
  |
Backend (Express.js)
  |
  |--- Claude AI      Conversational assessment + RAP sheet analysis
  |--- Canton Network Privacy-preserving credential ledger (Daml)
  |--- Base Sepolia   On-chain activity logging + smart wallet
  |--- x402 Protocol  Micropayment layer for employer verification
```

**Canton Network** — A Daml smart contract (`CleanSlate.daml`) defines the `ExpungementCredential` template with sub-transaction privacy. The `VerifyEligibility` choice is nonconsuming, meaning a credential can be verified by multiple employers without being archived.

**x402 Protocol** — Employer verification endpoints return HTTP 402 with payment requirements. The employer's client signs a USDC micropayment on Base Sepolia, attaches it to the retry request, and receives the verification result. This happens in a single user flow.

**Base Sepolia** — A Solidity smart wallet (`CleanSlateAgent.sol`) tracks individuals helped, employer assessments, revenue, and expenses on-chain, providing full transparency into the agent's operations.

**Claude AI** — Powers the conversational interface, RAP sheet image analysis (via Claude Vision), eligibility assessment against state-specific rules, and case detail extraction.

---

## Running Locally

### Prerequisites

- Node.js 20+
- [Daml SDK 2.10.3](https://docs.daml.com/getting-started/installation.html) (for Canton)
- An [Anthropic API key](https://console.anthropic.com/)
- A MetaMask wallet with Base Sepolia ETH (for blockchain features)

### Setup

```bash
git clone https://github.com/anitasrinivasan/clean-slate-agent.git
cd clean-slate-agent

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env with your API keys and wallet details
```

### Start Canton (privacy layer)

```bash
# Terminal 1: Start Canton sandbox
daml sandbox --json-api-port 7575 --dar .daml/dist/clean-slate-0.1.0.dar

# Terminal 2: Upload contract and bootstrap parties
cd daml
daml build
daml ledger upload-dar .daml/dist/clean-slate-0.1.0.dar
```

### Start the application

```bash
# Terminal 3: Backend
npm run dev

# Terminal 4: Frontend
npm run frontend:dev
```

Open **http://localhost:5173**

---

## State Coverage

| State | Terminology | Key Statute |
|-------|------------|-------------|
| Colorado | Sealing | CRS 24-72-706 |
| California | Dismissal / Expungement | Penal Code 1203.4 |
| Texas | Expunction / Nondisclosure | Code of Criminal Procedure Ch. 55 |
| New York | Sealing | CPL 160.59 |
| Florida | Sealing / Expunction | FS 943.0585 |
| Illinois | Sealing / Expungement | 20 ILCS 2630 |
| Pennsylvania | Clean Slate / Expungement | 18 Pa.C.S. 9122.2 |
| Ohio | Sealing / Expungement | ORC 2953.32 |
| Michigan | Set Aside / Expungement | MCL 780.621 |
| Georgia | Record Restriction | OCGA 35-3-37 |

---

## Disclaimer

Clean Slate Agent provides general legal information, not legal advice. It does not create an attorney-client relationship. Always consult a qualified attorney for guidance specific to your situation.
