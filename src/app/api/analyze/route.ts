import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
});

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch previous run
    const previousRun = await prisma.run.findFirst({
      where: { url },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch PageSpeed API
    const apiKey = process.env.GOOGLE_API_KEY;
    const pageSpeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      url
    )}&strategy=mobile&category=performance${apiKey ? `&key=${apiKey}` : ''}`;
    
    const psRes = await fetch(pageSpeedUrl);
    const psData = await psRes.json();

    if (psData.error) {
      return NextResponse.json({ error: psData.error.message }, { status: 500 });
    }

    const lighthouseResult = psData.lighthouseResult;
    
    // Extract metrics
    const scoreRaw = lighthouseResult?.categories?.performance?.score;
    const score = scoreRaw !== undefined && scoreRaw !== null ? Math.round(scoreRaw * 100) : null;
    const lcp = parseFloat(lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue || '0');
    const cls = parseFloat(lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue || '0');
    const fcp = parseFloat(lighthouseResult?.audits?.['first-contentful-paint']?.numericValue || '0');
    const tbt = parseFloat(lighthouseResult?.audits?.['total-blocking-time']?.numericValue || '0');

    // Extract opportunities / failed audits
    const audits = lighthouseResult?.audits || {};
    const failedAudits = Object.values(audits)
      .filter((audit: any) => {
        if (audit.score === null || audit.score === undefined) return false;
        if (audit.score >= 0.9) return false;
        if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'informative') return false;
        return true;
      })
      .map((audit: any) => ({
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || '',
      }))
      .slice(0, 15);

    const auditText = failedAudits.length > 0 
      ? failedAudits.map((a: any) => `- ${a.title} ${a.displayValue ? `(${a.displayValue})` : ''}: ${a.description}`).join('\n')
      : 'No major performance issues found.';

    // Prepare the prompt
    const prompt = `You are a performance optimization expert. Based on the following Google PageSpeed mobile metrics for ${url}:
- Score: ${score}/100
- Largest Contentful Paint (LCP): ${lcp.toFixed(2)} ms
- Cumulative Layout Shift (CLS): ${cls.toFixed(4)}
- First Contentful Paint (FCP): ${fcp.toFixed(2)} ms
- Total Blocking Time (TBT): ${tbt.toFixed(2)} ms

Here are the specific performance issues and opportunities identified by Lighthouse:
${auditText}

Generate a Prioritized Todo List (in markdown format with checkboxes, e.g., - [ ]) to improve these specific performance metrics. Focus on actionable, concrete steps based ONLY on the identified issues above. Do not hallucinate generic advice that isn't related to the issues found. Keep it concise but helpful.`;

    console.log("=== PROMPT TO LLM ===");
    console.log(prompt);
    console.log("=====================");

    // OpenAI streaming call
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // using a faster/cheaper model for performance, or gpt-4o as preferred
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullContent = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 1. Send initial JSON data (metrics and previous run diff) via SSE
          const initialData = {
            metrics: { score, lcp, cls, fcp, tbt },
            previous: previousRun
              ? {
                  score: previousRun.score,
                  lcp: previousRun.lcp,
                  cls: previousRun.cls,
                  fcp: previousRun.fcp,
                  tbt: previousRun.tbt,
                }
              : null,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'metrics', data: initialData })}\n\n`)
          );

          // 2. Stream the LLM text
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', data: content })}\n\n`)
              );
            }
          }

          // 3. Save to database at the end of the stream
          await prisma.run.create({
            data: {
              url,
              score,
              lcp,
              cls,
              fcp,
              tbt,
              todoList: fullContent,
            },
          });

          // 4. Signal completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', data: 'Stream interrupted' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
