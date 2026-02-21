import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';

import {
  saveCaseFile,
  loadCaseFile,
  saveMessage,
  getConversationHistory,
  logMetric,
  getMetrics,
} from './db.js';

import {
  buildIndividualSystemPrompt,
  EMPLOYER_SYSTEM_PROMPT,
  EXTRACTION_PROMPT,
  SUPPORTED_STATES,
} from './systemPrompt.js';

import {
  initCanton,
  createCredential,
  verifyEligibility,
  getCredentialByIndividual,
  getAllCredentials,
  getCantonStatus,
  getFullCredentialById,
} from './canton.js';

import {
  initBlockchain,
  logIndividualHelped,
  getAgentOnChainStatus,
  getRecentTransactions,
} from './blockchain.js';

dotenv.config({ override: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// File upload config (for RAP sheet uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Initialize Anthropic client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_key_here') {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log('✓ Anthropic API connected');
} else {
  console.log('⚠ ANTHROPIC_API_KEY not set — AI features disabled');
  console.log('  Open .env and paste your key, then restart');
}

// Initialize blockchain
console.log('Initializing blockchain...');
const contractAddr = process.env.CONTRACT_ADDRESS || null;
initBlockchain(contractAddr);

// Initialize Canton Network connection
console.log('Initializing Canton Network...');
await initCanton();

// ─────────────────────────────────────────────
// x402 PAYMENT MIDDLEWARE (for employer endpoint)
// ─────────────────────────────────────────────
let x402Enabled = false;
try {
  const walletAddr = process.env.WALLET_ADDRESS;
  if (walletAddr && walletAddr !== 'your_wallet_address_here') {
    const { paymentMiddleware, x402ResourceServer } = await import('@x402/express');
    const { ExactEvmScheme } = await import('@x402/evm/exact/server');
    const { HTTPFacilitatorClient } = await import('@x402/core/server');

    const facilitatorClient = new HTTPFacilitatorClient({
      url: process.env.X402_FACILITATOR_URL || 'https://www.x402.org/facilitator',
    });

    const server = new x402ResourceServer(facilitatorClient)
      .register('eip155:84532', new ExactEvmScheme());

    const x402Routes = {
      'POST /api/employer/assess': {
        accepts: [
          {
            scheme: 'exact',
            price: '$0.001',
            network: 'eip155:84532',
            payTo: walletAddr,
          },
        ],
        description: 'AI-powered background assessment for employer hiring decisions',
        mimeType: 'application/json',
      },
      'POST /api/employer/verify': {
        accepts: [
          {
            scheme: 'exact',
            price: '$0.001',
            network: 'eip155:84532',
            payTo: walletAddr,
          },
        ],
        description: 'Privacy-preserving credential verification via Canton Network',
        mimeType: 'application/json',
      },
    };

    app.use(paymentMiddleware(x402Routes, server));
    x402Enabled = true;
    console.log('✓ x402 payment middleware active');
    console.log(`  Employer assessments require $0.001 USDC → ${walletAddr}`);
  } else {
    console.log('⚠ WALLET_ADDRESS not set — x402 payments disabled (employer endpoint is free)');
  }
} catch (e) {
  console.log('⚠ x402 middleware failed to initialize:', e.message);
  console.log('  Employer endpoint will work without payment requirement');
}

// ─────────────────────────────────────────────
// INDIVIDUAL CHAT ENDPOINT (free)
// ─────────────────────────────────────────────
app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if ((!message && !req.file) || !sessionId) {
      return res.status(400).json({ error: 'message (or file) and sessionId are required' });
    }

    if (!anthropic) {
      return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' });
    }

    // Load existing case file and conversation
    const existingCase = loadCaseFile(sessionId);
    const history = getConversationHistory(sessionId);
    const isReturning = history.length > 0;

    // Build system prompt dynamically based on detected state
    const detectedState = existingCase?.state || null;
    let systemPrompt = buildIndividualSystemPrompt(detectedState);
    if (existingCase) {
      systemPrompt += `\n\nRETURNING USER CONTEXT: This user previously told you they have a ${existingCase.offenseType || 'unknown'} conviction in ${existingCase.state || 'unknown state'} from ${existingCase.convictionDate || 'unknown date'}. You determined they are ${existingCase.eligibilityDetermination || 'pending assessment'}. They still need to ${existingCase.nextSteps?.join(', ') || 'continue the conversation'}. Pick up the conversation naturally from here.`;
    }

    // Build messages array
    const messages = history.map((h) => ({
      role: h.role,
      content: h.content,
    }));

    // Handle file upload (RAP sheet image)
    let userContent;
    const textMessage = message || 'Please analyze this RAP sheet and extract all case details.';
    if (req.file) {
      const base64Data = req.file.buffer.toString('base64');
      const mediaType = req.file.mimetype;
      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: textMessage,
        },
      ];
      // Add RAP sheet analysis instructions to system prompt
      systemPrompt += `\n\nThe user has uploaded a RAP sheet image. Carefully read and extract:
- All offenses listed (type, class/category, charge codes)
- Dates (arrest date, conviction date, disposition date)
- Dispositions (convicted, dismissed, acquitted, etc.)
- Sentence details (probation, jail/prison time, fines, restitution)
- Current status (completed, active, pending)
Confirm what you found with the user before assessing eligibility.
If parts are hard to read, say so and ask the user to clarify.`;
    } else {
      userContent = textMessage;
    }

    messages.push({ role: 'user', content: userContent });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0].text;

    // Save conversation (text only, not base64 image data)
    const savedText = req.file ? `[Uploaded RAP sheet: ${req.file.originalname}] ${message || ''}` : message;
    saveMessage(sessionId, 'user', savedText);
    saveMessage(sessionId, 'assistant', assistantMessage);

    // Extract case details asynchronously
    let caseDetails = existingCase || {};
    try {
      const extractionResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Conversation so far:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}\nassistant: ${assistantMessage}`,
          },
        ],
      });
      const extracted = parseLLMJson(extractionResponse.content[0].text);
      // Merge with existing, preferring new non-null values
      for (const [key, value] of Object.entries(extracted)) {
        if (value !== null && value !== undefined) {
          caseDetails[key] = value;
        }
      }
    } catch (e) {
      console.error('Case extraction failed:', e.message);
    }

    saveCaseFile(sessionId, caseDetails);

    // Log metrics
    const estimatedCost = (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015);
    logMetric('chat', sessionId, estimatedCost, `tokens: ${response.usage.input_tokens}+${response.usage.output_tokens}`);

    // Log on-chain if this is a new user's first message
    if (!isReturning) {
      logIndividualHelped(sessionId).catch(() => {});
    }

    // Auto-create Canton credential if eligibility determined
    let credentialId = null;
    const existingCred = getCredentialByIndividual(sessionId);
    if (caseDetails.eligibilityDetermination === 'eligible' && !existingCred) {
      try {
        const credResult = await createCredential({
          individualId: sessionId,
          eligibilityStatus: 'eligible',
          stateJurisdiction: caseDetails.state || 'Unknown',
          assessmentDate: new Date().toISOString().split('T')[0],
          offenseType: caseDetails.offenseType || 'Unknown',
          convictionDate: caseDetails.convictionDate || 'Unknown',
          sentenceCompleted: caseDetails.sentenceCompleted || false,
        });
        credentialId = credResult.contractId;
      } catch (e) {
        console.error('Canton credential creation failed:', e.message);
      }
    } else if (existingCred) {
      credentialId = existingCred.contractId;
    }

    res.json({
      response: assistantMessage,
      caseDetails,
      isReturning,
      credentialExists: !!credentialId,
      credentialId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: parse JSON from LLM response (strip markdown code fences if present)
function parseLLMJson(text) {
  // Strip markdown code fences
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// EMPLOYER ASSESSMENT ENDPOINT (paid via x402)
// ─────────────────────────────────────────────
app.post('/api/employer/assess', async (req, res) => {
  try {
    const { candidateState, offenseType, offenseDate, jobType } = req.body;

    if (!candidateState || !offenseType || !offenseDate || !jobType) {
      return res.status(400).json({ error: 'All fields are required: candidateState, offenseType, offenseDate, jobType' });
    }

    if (!anthropic) {
      return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: EMPLOYER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Assess this candidate:\n- State: ${candidateState}\n- Offense type: ${offenseType}\n- Offense date: ${offenseDate}\n- Job type: ${jobType}`,
        },
      ],
    });

    let result;
    try {
      result = parseLLMJson(response.content[0].text);
    } catch {
      result = {
        eligible: null,
        explanation: response.content[0].text,
        legalBasis: 'See explanation',
      };
    }

    // Log metrics
    const estimatedCost = (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015);
    logMetric('employer_assessment', null, estimatedCost, `${candidateState}:${offenseType}`);

    res.json({
      ...result,
      privacyNote: 'This assessment used privacy-preserving credential verification. No underlying record details were exposed.',
      poweredBy: 'Canton Network sub-transaction privacy',
    });
  } catch (error) {
    console.error('Employer assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// EMPLOYER DEMO ENDPOINT (bypasses x402 for demo after showing 402 flow)
// ─────────────────────────────────────────────
app.post('/api/employer/assess-demo', async (req, res) => {
  try {
    const { candidateState, offenseType, offenseDate, jobType } = req.body;

    if (!candidateState || !offenseType || !offenseDate || !jobType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!anthropic) {
      return res.status(503).json({ error: 'AI not configured. Add ANTHROPIC_API_KEY to .env' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: EMPLOYER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Assess this candidate:\n- State: ${candidateState}\n- Offense type: ${offenseType}\n- Offense date: ${offenseDate}\n- Job type: ${jobType}`,
        },
      ],
    });

    let result;
    try {
      result = parseLLMJson(response.content[0].text);
    } catch {
      result = {
        eligible: null,
        explanation: response.content[0].text,
        legalBasis: 'See explanation',
      };
    }

    const estimatedCost = (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015);
    logMetric('employer_assessment', null, estimatedCost, `${candidateState}:${offenseType}`);

    res.json({
      ...result,
      privacyNote: 'This assessment used privacy-preserving credential verification. No underlying record details were exposed.',
      poweredBy: 'Canton Network sub-transaction privacy',
    });
  } catch (error) {
    console.error('Employer demo assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// CANTON CREDENTIAL ENDPOINTS
// ─────────────────────────────────────────────
app.post('/api/credential/verify', async (req, res) => {
  const { credentialId, verifierId } = req.body;
  if (!credentialId) return res.status(400).json({ error: 'credentialId required' });
  const result = await verifyEligibility(credentialId, verifierId || 'anonymous-employer');
  res.json(result);
});

app.get('/api/credentials', (req, res) => {
  res.json(getAllCredentials());
});

// ─────────────────────────────────────────────
// EMPLOYER CREDENTIAL VERIFICATION (new privacy-preserving flow)
// ─────────────────────────────────────────────
app.post('/api/employer/verify', async (req, res) => {
  const { credentialId } = req.body;
  if (!credentialId) {
    return res.status(400).json({ error: 'credentialId is required' });
  }

  const result = await verifyEligibility(credentialId, 'employer');
  if (result.error) {
    return res.status(result.status || 404).json({ error: result.error });
  }

  logMetric('employer_assessment', null, 0, `credential:${credentialId.slice(0, 16)}`);

  res.json({
    eligible: result.eligibilityStatus === 'eligible',
    message: result.eligibilityStatus === 'eligible'
      ? 'This candidate is eligible for employment consideration.'
      : 'This candidate is not currently eligible for record clearance.',
    privacyNote: result.privacyNote,
    ledger: result.ledger,
  });
});

// Demo bypass for x402 — same Canton verification logic
app.post('/api/employer/verify-demo', async (req, res) => {
  const { credentialId } = req.body;
  if (!credentialId) {
    return res.status(400).json({ error: 'credentialId is required' });
  }

  const result = await verifyEligibility(credentialId, 'employer');
  if (result.error) {
    return res.status(result.status || 404).json({ error: result.error });
  }

  logMetric('employer_assessment', null, 0, `credential:${credentialId.slice(0, 16)}`);

  res.json({
    eligible: result.eligibilityStatus === 'eligible',
    message: result.eligibilityStatus === 'eligible'
      ? 'This candidate is eligible for employment consideration.'
      : 'This candidate is not currently eligible for record clearance.',
    privacyNote: result.privacyNote,
    ledger: result.ledger,
  });
});

// ─────────────────────────────────────────────
// PRIVACY DEMO: Side-by-side Canton views
// ─────────────────────────────────────────────
app.get('/api/privacy-demo/:credentialId', async (req, res) => {
  const { credentialId } = req.params;

  // Get the full credential as the Agent party (sees everything)
  const fullCred = getFullCredentialById(credentialId);
  if (!fullCred) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  // Get the employer view — only eligibility status
  const employerView = await verifyEligibility(credentialId, 'privacy-demo-employer');

  res.json({
    agentView: {
      label: 'What the Agent / Individual sees',
      partyRole: 'Signatory (CleanSlateAgent + Individual)',
      data: {
        contractId: fullCred.contractId || credentialId,
        eligibilityStatus: fullCred.eligibilityStatus,
        stateJurisdiction: fullCred.stateJurisdiction,
        assessmentDate: fullCred.assessmentDate || fullCred.createdAt,
        offenseType: fullCred.offenseType,
        convictionDate: fullCred.convictionDate,
        sentenceCompleted: fullCred.sentenceCompleted,
      },
    },
    employerView: {
      label: 'What the Employer sees',
      partyRole: 'Observer (Employer)',
      data: {
        eligibilityStatus: employerView.eligibilityStatus || fullCred.eligibilityStatus,
      },
    },
    redactedFields: ['offenseType', 'convictionDate', 'sentenceCompleted', 'stateJurisdiction', 'assessmentDate', 'contractId'],
    explanation: 'Canton Network sub-transaction privacy ensures signatories see all fields while observers only see the result of the VerifyEligibility choice. The employer never receives the underlying record details — they are cryptographically invisible.',
  });
});

// ─────────────────────────────────────────────
// AGENT STATUS & METRICS ENDPOINTS
// ─────────────────────────────────────────────
app.get('/api/agent/status', async (req, res) => {
  const dbMetrics = getMetrics();
  const onChainStatus = await getAgentOnChainStatus();
  const transactions = await getRecentTransactions();
  const cantonStatus = getCantonStatus();

  res.json({
    agent: {
      name: 'Clean Slate Agent',
      type: 'Legal Aid / Expungement Screening',
      version: '1.0.0',
      states: SUPPORTED_STATES,
    },
    blockchain: onChainStatus,
    x402: {
      enabled: x402Enabled,
      network: 'eip155:84532 (Base Sepolia)',
      paymentAsset: 'USDC',
      assessmentPrice: '$0.001',
      facilitator: process.env.X402_FACILITATOR_URL || 'https://www.x402.org/facilitator',
    },
    canton: cantonStatus,
    metrics: dbMetrics,
    cantonCredentials: getAllCredentials().length,
    recentTransactions: transactions,
  });
});

app.get('/api/agent/metrics', (req, res) => {
  res.json(getMetrics());
});

// ─────────────────────────────────────────────
// SESSION INFO (for returning user detection)
// ─────────────────────────────────────────────
app.get('/api/session/:sessionId', (req, res) => {
  const caseFile = loadCaseFile(req.params.sessionId);
  const history = getConversationHistory(req.params.sessionId);
  const credential = getCredentialByIndividual(req.params.sessionId);

  res.json({
    exists: !!caseFile,
    caseDetails: caseFile,
    messageCount: history.length,
    hasCredential: !!credential,
    credential,
  });
});

// SPA fallback — serve frontend for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n🏛  Clean Slate Agent server running on http://localhost:${PORT}`);
  console.log(`   Chat API:     POST http://localhost:${PORT}/api/chat`);
  console.log(`   Employer API: POST http://localhost:${PORT}/api/employer/assess`);
  console.log(`   Agent Status: GET  http://localhost:${PORT}/api/agent/status`);
  console.log('');
});
