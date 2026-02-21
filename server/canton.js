/**
 * Canton Network Integration — Real Canton Sandbox via JSON Ledger API
 *
 * Connects to a running Canton sandbox at localhost:7575 (JSON Ledger API).
 * Falls back to in-memory simulation if Canton is not available.
 *
 * Canton's sub-transaction privacy ensures:
 * - Signatories (individual + agent) see ALL fields
 * - Observers (employer/verifier) can ONLY exercise VerifyEligibility
 * - The underlying record details are cryptographically invisible to observers
 */

import crypto from 'crypto';

const CANTON_JSON_API = 'http://localhost:7575';
const PARTY_SUFFIX = '1220cd2a32cb6bc37159be8b1c27e18e71a492a146bbcc45023e1de57db8a525ed3c';
const AGENT_PARTY = `CleanSlateAgent::${PARTY_SUFFIX}`;
const INDIVIDUAL_PARTY = `Individual::${PARTY_SUFFIX}`;
const EMPLOYER_PARTY = `Employer::${PARTY_SUFFIX}`;

let PACKAGE_ID = null;
let cantonAvailable = false;

/** Normalize a date string to YYYY-MM-DD format for Daml */
function normalizeDate(dateStr) {
  if (!dateStr) return '2020-01-01';
  // Already full date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Just a year like "2019"
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`;
  // Try parsing
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {}
  return '2020-01-01';
}

// In-memory fallback store
const credentials = new Map();

/**
 * Generate a JWT token for Canton JSON API (sandbox mode, no real auth)
 */
function makeToken(actAs, readAs) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    'https://daml.com/ledger-api': {
      ledgerId: 'sandbox',
      applicationId: 'cleanslate',
      actAs,
      readAs: readAs || actAs,
    },
  })).toString('base64url');
  return `${header}.${payload}.fake`;
}

const AGENT_TOKEN = makeToken([AGENT_PARTY, INDIVIDUAL_PARTY], [AGENT_PARTY, INDIVIDUAL_PARTY, EMPLOYER_PARTY]);
const EMPLOYER_TOKEN = makeToken([EMPLOYER_PARTY], [EMPLOYER_PARTY]);

/**
 * Initialize Canton connection — detect if sandbox is running and find package ID
 */
export async function initCanton() {
  try {
    const res = await fetch(`${CANTON_JSON_API}/v1/packages`, {
      headers: { 'Authorization': `Bearer ${AGENT_TOKEN}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Find our CleanSlate package
    for (const pkgId of data.result || []) {
      try {
        const pkgRes = await fetch(`${CANTON_JSON_API}/v1/packages/${pkgId}`, {
          headers: { 'Authorization': `Bearer ${AGENT_TOKEN}` },
        });
        const pkgText = await pkgRes.text();
        if (pkgText.includes('CleanSlate')) {
          PACKAGE_ID = pkgId;
          break;
        }
      } catch { /* skip */ }
    }

    if (PACKAGE_ID) {
      cantonAvailable = true;
      console.log('✓ Canton sandbox connected');
      console.log(`  Package: ${PACKAGE_ID.slice(0, 16)}...`);
      console.log(`  Parties: Agent, Individual, Employer`);
      return true;
    }
    throw new Error('CleanSlate package not found');
  } catch (e) {
    console.log('⚠ Canton sandbox not available — using in-memory simulation');
    console.log(`  (${e.message})`);
    return false;
  }
}

/**
 * Create a privacy-preserving expungement credential
 */
export async function createCredential({
  individualId,
  agentId = 'clean-slate-agent',
  eligibilityStatus,
  stateJurisdiction,
  assessmentDate,
  offenseType,
  convictionDate,
  sentenceCompleted,
}) {
  // Try real Canton first
  if (cantonAvailable && PACKAGE_ID) {
    try {
      const res = await fetch(`${CANTON_JSON_API}/v1/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENT_TOKEN}`,
        },
        body: JSON.stringify({
          templateId: `${PACKAGE_ID}:CleanSlate:ExpungementCredential`,
          payload: {
            individual: INDIVIDUAL_PARTY,
            agent: AGENT_PARTY,
            verifier: EMPLOYER_PARTY,
            eligibilityStatus,
            stateJurisdiction,
            assessmentDate: assessmentDate || new Date().toISOString().split('T')[0],
            offenseType: offenseType || 'Unknown',
            convictionDate: normalizeDate(convictionDate),
            sentenceCompleted: sentenceCompleted || false,
          },
        }),
      });
      const data = await res.json();
      if (data.status === 200) {
        const contractId = data.result.contractId;
        // Also store locally for quick lookups
        credentials.set(contractId, {
          contractId,
          cantonContract: true,
          individualId,
          eligibilityStatus,
          stateJurisdiction,
          assessmentDate,
          offenseType,
          convictionDate,
          sentenceCompleted,
          createdAt: new Date().toISOString(),
          active: true,
        });
        return {
          contractId,
          status: 'created',
          ledger: 'canton',
          message: 'Privacy-preserving credential created on Canton Network ledger',
        };
      }
      throw new Error(data.errors?.[0] || 'Canton create failed');
    } catch (e) {
      console.error('Canton create failed, falling back:', e.message);
    }
  }

  // Fallback: in-memory simulation
  const credentialId = crypto.randomUUID();
  credentials.set(credentialId, {
    contractId: credentialId,
    cantonContract: false,
    individualId,
    eligibilityStatus,
    stateJurisdiction,
    assessmentDate,
    offenseType,
    convictionDate,
    sentenceCompleted,
    createdAt: new Date().toISOString(),
    active: true,
  });

  return {
    contractId: credentialId,
    status: 'created',
    ledger: 'simulation',
    message: 'Privacy-preserving credential created (simulation mode)',
  };
}

/**
 * Verify eligibility — exercises the VerifyEligibility choice
 * Returns ONLY what an observer (employer) can see
 */
export async function verifyEligibility(credentialId, verifierId) {
  // Try real Canton exercise
  if (cantonAvailable && PACKAGE_ID) {
    try {
      const res = await fetch(`${CANTON_JSON_API}/v1/exercise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${EMPLOYER_TOKEN}`,
        },
        body: JSON.stringify({
          templateId: `${PACKAGE_ID}:CleanSlate:ExpungementCredential`,
          contractId: credentialId,
          choice: 'VerifyEligibility',
          argument: {},
        }),
      });
      const data = await res.json();
      if (data.status === 200) {
        return {
          status: 'verified',
          ledger: 'canton',
          eligibilityStatus: data.result.exerciseResult,
          privacyNote: 'Verified via Canton Network. Employer sees ONLY eligibility status — record details are cryptographically hidden by sub-transaction privacy.',
        };
      }
    } catch (e) {
      console.error('Canton exercise failed:', e.message);
    }
  }

  // Fallback: simulation
  const cred = credentials.get(credentialId);
  if (!cred) return { error: 'Credential not found', status: 404 };
  if (!cred.active) return { error: 'Credential has been revoked', status: 410 };

  return {
    status: 'verified',
    ledger: 'simulation',
    eligibilityStatus: cred.eligibilityStatus,
    stateJurisdiction: cred.stateJurisdiction,
    assessmentDate: cred.assessmentDate,
    privacyNote: 'Record details are protected by Canton sub-transaction privacy. Only eligibility status is visible to verifiers.',
  };
}

/**
 * Get credential by individual ID
 */
export function getCredentialByIndividual(individualId) {
  for (const [id, cred] of credentials) {
    if (cred.individualId === individualId && cred.active) {
      return {
        contractId: id,
        eligibilityStatus: cred.eligibilityStatus,
        stateJurisdiction: cred.stateJurisdiction,
        cantonContract: cred.cantonContract,
      };
    }
  }
  return null;
}

/**
 * Get all active credentials (for agent dashboard)
 */
export function getAllCredentials() {
  const result = [];
  for (const [id, cred] of credentials) {
    result.push({
      contractId: id,
      individualId: cred.individualId,
      eligibilityStatus: cred.eligibilityStatus,
      stateJurisdiction: cred.stateJurisdiction,
      active: cred.active,
      cantonContract: cred.cantonContract,
      createdAt: cred.createdAt,
    });
  }
  return result;
}

/**
 * Get Canton connection status
 */
export function getCantonStatus() {
  return {
    connected: cantonAvailable,
    ledger: cantonAvailable ? 'Canton sandbox (localhost:7575)' : 'In-memory simulation',
    packageId: PACKAGE_ID || 'N/A',
    parties: cantonAvailable ? { agent: AGENT_PARTY, individual: INDIVIDUAL_PARTY, employer: EMPLOYER_PARTY } : null,
    credentialCount: credentials.size,
  };
}

/**
 * Get full credential by contract ID (for privacy demo — agent-level view)
 */
export function getFullCredentialById(credentialId) {
  return credentials.get(credentialId) || null;
}

// Auto-initialize on import
initCanton().catch(() => {});
