export type Strategy = 'mobile' | 'desktop';

export type AnalyzeMode = 'external' | 'internal';

export type AnalysisSource = 'psi' | 'local-lighthouse';

export type MetricKey = 'score' | 'lcp' | 'cls' | 'fcp' | 'tbt' | 'speedIndex' | 'interactive';

export type MetricSnapshot = {
  score: number | null;
  lcp: number | null;
  cls: number | null;
  fcp: number | null;
  tbt: number | null;
  speedIndex: number | null;
  interactive: number | null;
};

export type AuditItem = {
  id: string;
  title: string;
  description: string;
  displayValue: string | null;
  score: number | null;
  numericValue: number | null;
  savingsMs: number | null;
  savingsBytes: number | null;
};

export type ActionItem = {
  title: string;
  reason: string;
  metric: string;
  impact: 'high' | 'medium' | 'low';
};

export type PageSpeedSummary = {
  url: string;
  finalUrl: string | null;
  pageTitle: string | null;
  strategy: Strategy;
  source: AnalysisSource;
  fetchedAt: string;
  metrics: MetricSnapshot;
  opportunities: AuditItem[];
  diagnostics: AuditItem[];
  actions: ActionItem[];
};

type LighthouseAudit = {
  id?: string;
  title?: string;
  description?: string;
  displayValue?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  details?: {
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    [key: string]: unknown;
  };
};

export type PageSpeedResponse = {
  id?: string;
  lighthouseResult?: {
    finalDisplayedUrl?: string;
    requestedUrl?: string;
    fetchTime?: string;
    categories?: {
      performance?: {
        score?: number | null;
      };
    };
    audits?: Record<string, LighthouseAudit>;
  };
};

const metricAudits = {
  lcp: 'largest-contentful-paint',
  cls: 'cumulative-layout-shift',
  fcp: 'first-contentful-paint',
  tbt: 'total-blocking-time',
  speedIndex: 'speed-index',
  interactive: 'interactive',
} as const;

const auditToMetric: Record<string, string> = {
  'largest-contentful-paint': 'LCP',
  'largest-contentful-paint-element': 'LCP',
  'render-blocking-resources': 'FCP/LCP',
  'server-response-time': 'TTFB/LCP',
  'unused-javascript': 'TBT',
  'legacy-javascript': 'TBT',
  'unminified-javascript': 'TBT',
  'third-party-summary': 'TBT',
  'total-blocking-time': 'TBT',
  'cumulative-layout-shift': 'CLS',
  'layout-shifts': 'CLS',
  'uses-responsive-images': 'LCP',
  'uses-optimized-images': 'LCP',
  'modern-image-formats': 'LCP',
  'offscreen-images': 'LCP',
  'uses-text-compression': 'FCP/LCP',
};

function numericAudit(audits: Record<string, LighthouseAudit>, id: string): number | null {
  const value = audits[id]?.numericValue;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function cleanDescription(description?: string): string {
  if (!description) return '';
  return description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}

function normalizeAudit(id: string, audit: LighthouseAudit): AuditItem {
  return {
    id,
    title: audit.title ?? id,
    description: cleanDescription(audit.description),
    displayValue: audit.displayValue ?? null,
    score: typeof audit.score === 'number' ? audit.score : null,
    numericValue: typeof audit.numericValue === 'number' ? audit.numericValue : null,
    savingsMs: typeof audit.details?.overallSavingsMs === 'number' ? audit.details.overallSavingsMs : null,
    savingsBytes:
      typeof audit.details?.overallSavingsBytes === 'number' ? audit.details.overallSavingsBytes : null,
  };
}

function auditWeight(audit: AuditItem): number {
  return (audit.savingsMs ?? 0) + (audit.savingsBytes ?? 0) / 1024 + (audit.score === 0 ? 500 : 0);
}

function pickOpportunities(audits: Record<string, LighthouseAudit>): AuditItem[] {
  return Object.entries(audits)
    .filter(([, audit]) => audit.scoreDisplayMode === 'opportunity')
    .map(([id, audit]) => normalizeAudit(id, audit))
    .sort((a, b) => auditWeight(b) - auditWeight(a))
    .slice(0, 10);
}

function pickDiagnostics(audits: Record<string, LighthouseAudit>): AuditItem[] {
  return Object.entries(audits)
    .filter(([, audit]) => {
      if (audit.scoreDisplayMode === 'opportunity') return false;
      if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'manual') return false;
      return typeof audit.score === 'number' && audit.score < 0.9;
    })
    .map(([id, audit]) => normalizeAudit(id, audit))
    .sort((a, b) => auditWeight(b) - auditWeight(a))
    .slice(0, 8);
}

function buildActions(metrics: MetricSnapshot, audits: AuditItem[]): ActionItem[] {
  const actions = audits.slice(0, 8).map((audit) => {
    const metric = auditToMetric[audit.id] ?? 'Performance';
    const hasLargeSavings = (audit.savingsMs ?? 0) >= 500 || (audit.savingsBytes ?? 0) >= 100_000;
    return {
      title: audit.title,
      reason: audit.displayValue ? `${audit.displayValue}. ${audit.description}` : audit.description,
      metric,
      impact: hasLargeSavings || audit.score === 0 ? 'high' : audit.score !== null && audit.score < 0.5 ? 'medium' : 'low',
    } satisfies ActionItem;
  });

  if (metrics.lcp !== null && metrics.lcp > 2500) {
    actions.unshift({
      title: '优先优化 Largest Contentful Paint 路径',
      reason: `当前 LCP 为 ${(metrics.lcp / 1000).toFixed(2)}s。优先检查首屏大图、关键 CSS 和服务器响应路径。`,
      metric: 'LCP',
      impact: 'high',
    });
  }

  if (metrics.tbt !== null && metrics.tbt > 200) {
    actions.unshift({
      title: '减少阻塞主线程的 JavaScript',
      reason: `当前 TBT 为 ${Math.round(metrics.tbt)}ms。拆分较重 bundle，并延后加载非关键第三方脚本。`,
      metric: 'TBT',
      impact: 'high',
    });
  }

  if (metrics.cls !== null && metrics.cls > 0.1) {
    actions.unshift({
      title: '为会移动的元素预留稳定空间',
      reason: `当前 CLS 为 ${metrics.cls.toFixed(3)}。为图片、嵌入内容、广告、横幅和延迟加载 UI 设置稳定尺寸。`,
      metric: 'CLS',
      impact: 'high',
    });
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.title}:${action.metric}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('只能分析 http 或 https URL。');
  }

  parsed.hash = '';
  return parsed.toString();
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(hostname: string): boolean {
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') return true;
  const firstGroup = Number.parseInt(hostname.split(':')[0] || '0', 16);
  if (!Number.isFinite(firstGroup)) return false;
  return (firstGroup & 0xfe00) === 0xfc00 || (firstGroup & 0xffc0) === 0xfe80;
}

export function isLocalNetworkUrl(url: string): boolean {
  const { hostname } = new URL(url);
  const normalized = normalizeHostname(hostname);

  if (
    normalized === 'localhost' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    return true;
  }

  if (isPrivateIpv4(normalized) || isPrivateIpv6(normalized)) return true;

  return !normalized.includes('.') && !normalized.includes(':');
}

export function parsePageSpeedResponse(
  data: PageSpeedResponse,
  url: string,
  strategy: Strategy,
  source: AnalysisSource = 'psi',
): PageSpeedSummary {
  const result = data.lighthouseResult;
  const audits = result?.audits ?? {};
  const scoreRaw = result?.categories?.performance?.score;
  const metrics: MetricSnapshot = {
    score: typeof scoreRaw === 'number' ? Math.round(scoreRaw * 100) : null,
    lcp: numericAudit(audits, metricAudits.lcp),
    cls: numericAudit(audits, metricAudits.cls),
    fcp: numericAudit(audits, metricAudits.fcp),
    tbt: numericAudit(audits, metricAudits.tbt),
    speedIndex: numericAudit(audits, metricAudits.speedIndex),
    interactive: numericAudit(audits, metricAudits.interactive),
  };
  const opportunities = pickOpportunities(audits);
  const diagnostics = pickDiagnostics(audits);

  return {
    url,
    finalUrl: result?.finalDisplayedUrl ?? result?.requestedUrl ?? data.id ?? null,
    pageTitle: audits['document-title']?.displayValue ?? null,
    strategy,
    source,
    fetchedAt: result?.fetchTime ?? new Date().toISOString(),
    metrics,
    opportunities,
    diagnostics,
    actions: buildActions(metrics, [...opportunities, ...diagnostics]),
  };
}

export function metricRating(key: MetricKey, value: number | null): 'good' | 'needs-work' | 'poor' | 'unknown' {
  if (value === null) return 'unknown';
  if (key === 'score') return value >= 90 ? 'good' : value >= 50 ? 'needs-work' : 'poor';
  if (key === 'cls') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-work' : 'poor';
  if (key === 'tbt') return value <= 200 ? 'good' : value <= 600 ? 'needs-work' : 'poor';
  if (key === 'lcp') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-work' : 'poor';
  if (key === 'fcp') return value <= 1800 ? 'good' : value <= 3000 ? 'needs-work' : 'poor';
  if (key === 'speedIndex') return value <= 3400 ? 'good' : value <= 5800 ? 'needs-work' : 'poor';
  return value <= 3800 ? 'good' : value <= 7300 ? 'needs-work' : 'poor';
}
