import type { Config, Flags } from 'lighthouse';
import type { AnalysisSource, PageSpeedResponse, Strategy } from '@/lib/pagespeed';

type LocalLighthouseModule = typeof import('lighthouse');

const LOCAL_LIGHTHOUSE_TIMEOUT_MS: Record<Strategy, number> = {
  mobile: 150_000,
  desktop: 270_000,
};

const chromeFlags = [
  '--headless=new',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
];

function lighthouseFlags(strategy: Strategy, port: number): Flags {
  const baseFlags: Flags = {
    port,
    output: 'json',
    locale: 'zh',
    logLevel: 'error',
    onlyCategories: ['performance'],
    maxWaitForFcp: strategy === 'desktop' ? 90_000 : 60_000,
    maxWaitForLoad: strategy === 'desktop' ? 180_000 : 120_000,
  };

  if (strategy === 'desktop') {
    return {
      ...baseFlags,
      formFactor: 'desktop',
      screenEmulation: {
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        mobile: false,
        disabled: false,
      },
    };
  }

  return {
    ...baseFlags,
    formFactor: 'mobile',
  };
}

function timeoutError(strategy: Strategy): Error {
  const seconds = Math.round(LOCAL_LIGHTHOUSE_TIMEOUT_MS[strategy] / 1000);
  return new Error(`本地 Lighthouse 在 ${seconds} 秒内没有完成，请确认页面可访问后重试。`);
}

async function withTimeout<T>(promise: Promise<T>, strategy: Strategy): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(timeoutError(strategy)), LOCAL_LIGHTHOUSE_TIMEOUT_MS[strategy]);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function desktopConfig(lighthouseModule: LocalLighthouseModule, strategy: Strategy): Config | undefined {
  return strategy === 'desktop' ? lighthouseModule.desktopConfig : undefined;
}

export async function runLocalLighthouse(url: string, strategy: Strategy): Promise<PageSpeedResponse> {
  const [lighthouseModule, chromeLauncher] = await Promise.all([import('lighthouse'), import('chrome-launcher')]);
  const chrome = await chromeLauncher.launch({
    chromeFlags,
    logLevel: 'error',
  });

  try {
    const result = await withTimeout(
      lighthouseModule.default(url, lighthouseFlags(strategy, chrome.port), desktopConfig(lighthouseModule, strategy)),
      strategy,
    );

    if (!result?.lhr) {
      throw new Error('本地 Lighthouse 没有返回可用的性能数据。');
    }

    return {
      id: result.lhr.finalDisplayedUrl ?? result.lhr.requestedUrl ?? url,
      lighthouseResult: result.lhr,
    } satisfies PageSpeedResponse;
  } finally {
    await Promise.resolve(chrome.kill());
  }
}

export const localLighthouseSource: AnalysisSource = 'local-lighthouse';
