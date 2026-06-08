// ── Tier Configuration ─────────────────────────────────────────────────
// Central source of truth for all tier definitions, feature capabilities,
// and pricing logic. Every feature gate in the app reads from this file.

export type TierName = 'free' | 'pro' | 'institution' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
export type BillingInterval = 'monthly' | 'annual' | 'semester';

// ── Feature Capabilities ────────────────────────────────────────────────

export interface FeatureCapabilities {
  // Simulation limits
  maxPrograms: number;
  maxLineLength: number;
  cacheSimulation: boolean;
  branchPredictionOptions: string[];
  forwardingToggle: boolean;
  executionHistoryDays: number;        // -1 = indefinite
  maxExecutionSessions: number;        // -1 = unlimited
  stepBackDebugger: boolean;

  // Export
  timingDiagramExport: boolean;
  pdfExport: boolean;
  exportWatermarkFree: boolean;

  // Sharing & Collaboration
  permalinkSharing: boolean;
  programForking: boolean;
  sessionSharing: boolean;             // live view-only sharing
  programComments: boolean;

  // Editor
  riscvSupport: boolean;
  syntaxErrorExplanations: boolean;
  importMaxLines: number;

  // Analytics
  analyticsDashboard: boolean;
  conceptMastery: boolean;
  weakSpotAlerts: boolean;

  // Course / Assignment
  courseManagement: boolean;
  assignmentBuilder: boolean;
  autoGrader: boolean;
  plagiarismDetection: boolean;
  courseCloning: boolean;
  bulkRosterImport: boolean;
  cohortSegmentation: boolean;
  assignmentTemplates: boolean;
  gradingWorkflow: boolean;
  gradeExport: boolean;

  // Institution Admin
  institutionAdmin: boolean;
  seatManagement: boolean;
  usageReporting: boolean;
  instructorManagement: boolean;

  // LMS & SSO
  lmsIntegration: boolean;
  ssoSaml: boolean;
  scimProvisioning: boolean;

  // Enterprise
  apiAccess: boolean;
  customBranding: boolean;
  privateCloud: boolean;
  dedicatedInfra: boolean;
  customRetention: boolean;
  slaGuarantee: boolean;

  // Support
  supportLevel: 'community' | 'email_48h' | 'email_24h' | 'dedicated';
}

// ── Tier Definitions ────────────────────────────────────────────────────

export const TIER_CONFIGS: Record<TierName, FeatureCapabilities> = {
  free: {
    maxPrograms: 10,
    maxLineLength: 50,
    cacheSimulation: false,
    branchPredictionOptions: ['not_taken'],
    forwardingToggle: false,
    executionHistoryDays: 7,
    maxExecutionSessions: 50,
    stepBackDebugger: false,

    timingDiagramExport: false,
    pdfExport: false,
    exportWatermarkFree: false,

    permalinkSharing: false,
    programForking: false,
    sessionSharing: false,
    programComments: false,

    riscvSupport: false,
    syntaxErrorExplanations: false,
    importMaxLines: 50,

    analyticsDashboard: false,
    conceptMastery: false,
    weakSpotAlerts: false,

    courseManagement: false,
    assignmentBuilder: false,
    autoGrader: false,
    plagiarismDetection: false,
    courseCloning: false,
    bulkRosterImport: false,
    cohortSegmentation: false,
    assignmentTemplates: false,
    gradingWorkflow: false,
    gradeExport: false,

    institutionAdmin: false,
    seatManagement: false,
    usageReporting: false,
    instructorManagement: false,

    lmsIntegration: false,
    ssoSaml: false,
    scimProvisioning: false,

    apiAccess: false,
    customBranding: false,
    privateCloud: false,
    dedicatedInfra: false,
    customRetention: false,
    slaGuarantee: false,

    supportLevel: 'community',
  },

  pro: {
    maxPrograms: -1, // unlimited
    maxLineLength: 500,
    cacheSimulation: true,
    branchPredictionOptions: ['always_taken', 'not_taken', '1bit', '2bit'],
    forwardingToggle: true,
    executionHistoryDays: -1,
    maxExecutionSessions: 500,
    stepBackDebugger: true,

    timingDiagramExport: true,
    pdfExport: true,
    exportWatermarkFree: true,

    permalinkSharing: true,
    programForking: true,
    sessionSharing: true,
    programComments: true,

    riscvSupport: true,
    syntaxErrorExplanations: true,
    importMaxLines: 500,

    analyticsDashboard: true,
    conceptMastery: true,
    weakSpotAlerts: true,

    courseManagement: false,
    assignmentBuilder: false,
    autoGrader: false,
    plagiarismDetection: false,
    courseCloning: false,
    bulkRosterImport: false,
    cohortSegmentation: false,
    assignmentTemplates: false,
    gradingWorkflow: false,
    gradeExport: false,

    institutionAdmin: false,
    seatManagement: false,
    usageReporting: false,
    instructorManagement: false,

    lmsIntegration: false,
    ssoSaml: false,
    scimProvisioning: false,

    apiAccess: false,
    customBranding: false,
    privateCloud: false,
    dedicatedInfra: false,
    customRetention: false,
    slaGuarantee: false,

    supportLevel: 'email_48h',
  },

  institution: {
    maxPrograms: -1,
    maxLineLength: -1, // unlimited
    cacheSimulation: true,
    branchPredictionOptions: ['always_taken', 'not_taken', '1bit', '2bit'],
    forwardingToggle: true,
    executionHistoryDays: -1,
    maxExecutionSessions: -1,
    stepBackDebugger: true,

    timingDiagramExport: true,
    pdfExport: true,
    exportWatermarkFree: true,

    permalinkSharing: true,
    programForking: true,
    sessionSharing: true,
    programComments: true,

    riscvSupport: true,
    syntaxErrorExplanations: true,
    importMaxLines: -1,

    analyticsDashboard: true,
    conceptMastery: true,
    weakSpotAlerts: true,

    courseManagement: true,
    assignmentBuilder: true,
    autoGrader: true,
    plagiarismDetection: true,
    courseCloning: true,
    bulkRosterImport: true,
    cohortSegmentation: true,
    assignmentTemplates: true,
    gradingWorkflow: true,
    gradeExport: true,

    institutionAdmin: true,
    seatManagement: true,
    usageReporting: true,
    instructorManagement: true,

    lmsIntegration: true,
    ssoSaml: true,
    scimProvisioning: true,

    apiAccess: false,
    customBranding: false,
    privateCloud: false,
    dedicatedInfra: false,
    customRetention: false,
    slaGuarantee: false,

    supportLevel: 'email_24h',
  },

  enterprise: {
    maxPrograms: -1,
    maxLineLength: -1,
    cacheSimulation: true,
    branchPredictionOptions: ['always_taken', 'not_taken', '1bit', '2bit'],
    forwardingToggle: true,
    executionHistoryDays: -1,
    maxExecutionSessions: -1,
    stepBackDebugger: true,

    timingDiagramExport: true,
    pdfExport: true,
    exportWatermarkFree: true,

    permalinkSharing: true,
    programForking: true,
    sessionSharing: true,
    programComments: true,

    riscvSupport: true,
    syntaxErrorExplanations: true,
    importMaxLines: -1,

    analyticsDashboard: true,
    conceptMastery: true,
    weakSpotAlerts: true,

    courseManagement: true,
    assignmentBuilder: true,
    autoGrader: true,
    plagiarismDetection: true,
    courseCloning: true,
    bulkRosterImport: true,
    cohortSegmentation: true,
    assignmentTemplates: true,
    gradingWorkflow: true,
    gradeExport: true,

    institutionAdmin: true,
    seatManagement: true,
    usageReporting: true,
    instructorManagement: true,

    lmsIntegration: true,
    ssoSaml: true,
    scimProvisioning: true,

    apiAccess: true,
    customBranding: true,
    privateCloud: true,
    dedicatedInfra: true,
    customRetention: true,
    slaGuarantee: true,

    supportLevel: 'dedicated',
  },
};

// ── Pricing ─────────────────────────────────────────────────────────────

export const PRICING = {
  pro: {
    monthly: 900,       // $9.00 in cents
    annual: 7200,       // $72.00 in cents ($6/mo effective)
    studentMonthly: 500, // $5.00 in cents
    studentAnnual: 4800, // $48.00 in cents ($4/mo effective)
    trialDays: 14,
    refundDaysMonthly: 7,
    refundDaysAnnual: 30,
  },
  institution: {
    perSeatPerSemester: [
      { min: 20, max: 199, price: 600 },   // $6.00
      { min: 200, max: 499, price: 500 },   // $5.00
      { min: 500, max: 999, price: 400 },   // $4.00
      { min: 1000, max: Infinity, price: 350 }, // $3.50
    ],
    minimumSeats: 20,
    selfServeMaxSeats: 99,
    pilotSeats: 30,
    pilotDurationDays: 120, // ~one semester
  },
  enterprise: {
    typicalMin: 1500000,  // $15,000
    typicalMax: 8000000,  // $80,000
  },
} as const;

// ── Tier Display Metadata ───────────────────────────────────────────────

export interface TierDisplayInfo {
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  highlight: boolean;
  ctaText: string;
  ctaAction: 'signup' | 'checkout' | 'contact' | 'pilot';
}

export const TIER_DISPLAY: Record<TierName, TierDisplayInfo> = {
  free: {
    name: 'Free',
    tagline: 'For curious learners',
    description: 'Explore pipeline fundamentals with the visual simulator — no credit card required.',
    highlight: false,
    ctaText: 'Get Started Free',
    ctaAction: 'signup',
  },
  pro: {
    name: 'Pro',
    tagline: 'For serious students',
    description: 'Unlock the full power of visual debugging, cache simulation, and performance analytics.',
    badge: 'MOST POPULAR',
    highlight: true,
    ctaText: 'Start Free Trial',
    ctaAction: 'checkout',
  },
  institution: {
    name: 'Institution',
    tagline: 'For courses & departments',
    description: 'Equip your entire class with assignments, auto-grading, LMS integration, and cohort analytics.',
    highlight: false,
    ctaText: 'Start Pilot',
    ctaAction: 'pilot',
  },
  enterprise: {
    name: 'Enterprise',
    tagline: 'For organizations',
    description: 'Private deployment, custom branding, API access, and dedicated support for bootcamps and corporate training.',
    highlight: false,
    ctaText: 'Contact Sales',
    ctaAction: 'contact',
  },
};

// ── Feature Comparison Categories ───────────────────────────────────────
// Used by the pricing page feature comparison table.

export interface FeatureComparisonItem {
  label: string;
  feature: keyof FeatureCapabilities;
  formatter?: (value: unknown) => string;
}

export interface FeatureComparisonCategory {
  name: string;
  icon: string; // lucide icon name
  items: FeatureComparisonItem[];
}

export const FEATURE_COMPARISON: FeatureComparisonCategory[] = [
  {
    name: 'Simulation',
    icon: 'Cpu',
    items: [
      { label: 'Saved programs', feature: 'maxPrograms', formatter: (v) => (v as number) === -1 ? 'Unlimited' : `${v}` },
      { label: 'Max lines per program', feature: 'maxLineLength', formatter: (v) => (v as number) === -1 ? 'Unlimited' : `${v}` },
      { label: 'Cache simulation', feature: 'cacheSimulation' },
      { label: 'Forwarding toggle', feature: 'forwardingToggle' },
      { label: 'Branch prediction options', feature: 'branchPredictionOptions', formatter: (v) => `${(v as string[]).length} strategies` },
      { label: 'Step-back debugger', feature: 'stepBackDebugger' },
      { label: 'Execution history', feature: 'executionHistoryDays', formatter: (v) => (v as number) === -1 ? 'Indefinite' : `${v} days` },
    ],
  },
  {
    name: 'Export & Sharing',
    icon: 'Share2',
    items: [
      { label: 'Timing diagram export (PNG/SVG)', feature: 'timingDiagramExport' },
      { label: 'PDF execution report', feature: 'pdfExport' },
      { label: 'Watermark-free exports', feature: 'exportWatermarkFree' },
      { label: 'Program permalink sharing', feature: 'permalinkSharing' },
      { label: 'Program forking', feature: 'programForking' },
      { label: 'Live session sharing', feature: 'sessionSharing' },
    ],
  },
  {
    name: 'Editor',
    icon: 'Code2',
    items: [
      { label: 'RISC-V assembly support', feature: 'riscvSupport' },
      { label: 'Syntax error explanations', feature: 'syntaxErrorExplanations' },
      { label: 'Import .asm file size', feature: 'importMaxLines', formatter: (v) => (v as number) === -1 ? 'Unlimited' : `${v} lines` },
    ],
  },
  {
    name: 'Analytics',
    icon: 'BarChart3',
    items: [
      { label: 'Performance dashboard', feature: 'analyticsDashboard' },
      { label: 'Concept mastery tracker', feature: 'conceptMastery' },
      { label: 'Weak-spot alerts', feature: 'weakSpotAlerts' },
    ],
  },
  {
    name: 'Course Management',
    icon: 'GraduationCap',
    items: [
      { label: 'Create & manage courses', feature: 'courseManagement' },
      { label: 'Assignment builder', feature: 'assignmentBuilder' },
      { label: 'Auto-grading', feature: 'autoGrader' },
      { label: 'Plagiarism detection', feature: 'plagiarismDetection' },
      { label: 'Course cloning', feature: 'courseCloning' },
      { label: 'Bulk roster import', feature: 'bulkRosterImport' },
      { label: 'Cohort segmentation', feature: 'cohortSegmentation' },
      { label: 'Grade export (CSV)', feature: 'gradeExport' },
    ],
  },
  {
    name: 'Integration & Admin',
    icon: 'Building2',
    items: [
      { label: 'LTI 1.3 LMS integration', feature: 'lmsIntegration' },
      { label: 'SAML 2.0 SSO', feature: 'ssoSaml' },
      { label: 'SCIM provisioning', feature: 'scimProvisioning' },
      { label: 'Institution admin console', feature: 'institutionAdmin' },
      { label: 'REST API access', feature: 'apiAccess' },
      { label: 'Custom branding', feature: 'customBranding' },
      { label: 'Private cloud deployment', feature: 'privateCloud' },
    ],
  },
  {
    name: 'Support',
    icon: 'Headphones',
    items: [
      { label: 'Support level', feature: 'supportLevel', formatter: (v) => {
        const map: Record<string, string> = {
          community: 'Community forum',
          email_48h: 'Email (48h SLA)',
          email_24h: 'Email (24h SLA)',
          dedicated: 'Dedicated contact',
        };
        return map[v as string] || String(v);
      }},
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

/** Get the feature capabilities for a given tier */
export function getTierCapabilities(tier: TierName): FeatureCapabilities {
  return TIER_CONFIGS[tier];
}

/** Check if a specific feature is available for a tier */
export function hasFeature(tier: TierName, feature: keyof FeatureCapabilities): boolean {
  const cap = TIER_CONFIGS[tier];
  const val = cap[feature];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (Array.isArray(val)) return val.length > 0;
  return !!val;
}

/** Check if an email is a .edu address (student discount eligible) */
export function isEduEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain.endsWith('.edu') || domain.endsWith('.edu.au') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.in');
}

/** Get institution price per seat based on volume */
export function getInstitutionSeatPrice(seatCount: number): number {
  const tier = PRICING.institution.perSeatPerSemester.find(
    t => seatCount >= t.min && seatCount <= t.max
  );
  return tier?.price ?? PRICING.institution.perSeatPerSemester[0].price;
}

/** Get the tier that unlocks a specific feature */
export function getUnlockTier(feature: keyof FeatureCapabilities): TierName {
  const tiers: TierName[] = ['free', 'pro', 'institution', 'enterprise'];
  for (const tier of tiers) {
    if (hasFeature(tier, feature)) return tier;
  }
  return 'enterprise';
}

/** Human-readable feature label for upgrade modals */
export const FEATURE_LABELS: Record<string, string> = {
  cacheSimulation: 'Cache Simulation',
  stepBackDebugger: 'Step-Back Debugger',
  forwardingToggle: 'Forwarding Toggle',
  timingDiagramExport: 'Timing Diagram Export',
  pdfExport: 'PDF Report Export',
  permalinkSharing: 'Program Sharing',
  programForking: 'Program Forking',
  sessionSharing: 'Live Session Sharing',
  riscvSupport: 'RISC-V Support',
  syntaxErrorExplanations: 'Syntax Error Explanations',
  analyticsDashboard: 'Performance Analytics',
  conceptMastery: 'Concept Mastery Tracker',
  courseManagement: 'Course Management',
  assignmentBuilder: 'Assignment Builder',
  autoGrader: 'Auto-Grading',
  plagiarismDetection: 'Plagiarism Detection',
  lmsIntegration: 'LMS Integration',
  apiAccess: 'API Access',
  customBranding: 'Custom Branding',
};

/** Feature descriptions for upgrade modals */
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  cacheSimulation: 'Configure cache size, associativity, block size, and replacement policy to understand memory hierarchy performance.',
  stepBackDebugger: 'Scrub backward through execution cycle-by-cycle to pinpoint exactly where hazards and stalls occur.',
  forwardingToggle: 'Toggle data forwarding on and off to compare pipeline behavior with and without forwarding paths.',
  timingDiagramExport: 'Export clean, watermark-free timing diagrams as PNG or SVG for your reports and assignments.',
  pdfExport: 'Generate a one-page PDF summary of pipeline state at each cycle for documentation.',
  permalinkSharing: 'Generate a public read-only link to any saved program including its execution state snapshot.',
  programForking: 'Clone any public or shared program into your personal workspace.',
  sessionSharing: 'Share a live view of your simulation with a TA or study partner in real time.',
  riscvSupport: 'Write and simulate RISC-V assembly in addition to MIPS.',
  syntaxErrorExplanations: 'Get natural-language explanations of assembler errors with suggested fixes.',
  analyticsDashboard: 'Track your CPI over time, hazard frequency by type, and stall rate trends across sessions.',
  conceptMastery: 'See which pipeline concepts you\'ve mastered and which need more practice.',
  courseManagement: 'Create and manage multiple courses with student rosters, assignments, and grading.',
  assignmentBuilder: 'Build structured labs with rubrics, starter code, and auto-grading criteria.',
  autoGrader: 'Automatically check submitted programs against expected register values and memory states.',
  plagiarismDetection: 'Detect structural similarity across student submissions and flag potential plagiarism.',
  lmsIntegration: 'Launch assignments directly from Canvas, Blackboard, or Moodle with automatic grade sync.',
  apiAccess: 'Programmatic access to assignments, grades, and execution logs via REST API.',
  customBranding: 'Replace the platform logo and color scheme with your organization\'s brand.',
};
