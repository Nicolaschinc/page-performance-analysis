import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeUrl, type Strategy } from '@/lib/pagespeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseList(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawUrl = searchParams.get('url');
    const strategy = (searchParams.get('strategy') === 'desktop' ? 'desktop' : 'mobile') satisfies Strategy;
    const url = rawUrl ? normalizeUrl(rawUrl) : null;
    const runs = await prisma.run.findMany({
      where: url ? { url, strategy } : { strategy },
      orderBy: { createdAt: 'desc' },
      take: url ? 30 : 50,
    });

    return NextResponse.json({
      runs: runs.map((run) => ({
        id: run.id,
        url: run.url,
        finalUrl: run.finalUrl,
        strategy: run.strategy,
        createdAt: run.createdAt.toISOString(),
        metrics: {
          score: run.score,
          lcp: run.lcp,
          cls: run.cls,
          fcp: run.fcp,
          tbt: run.tbt,
          speedIndex: run.speedIndex,
          interactive: run.interactive,
        },
        opportunities: parseList(run.opportunities),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
