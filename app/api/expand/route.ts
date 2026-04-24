import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { keywords } = await req.json();
  if (!keywords) return NextResponse.json({ sentence: keywords });

  try {
    // Call your local Python ML server
    const res = await fetch('http://localhost:8000/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords }),
    });

    const data = await res.json();
    return NextResponse.json({ sentence: data.sentence });
  } catch (e) {
    // Fallback to Anthropic if local server is down
    console.log('Local model unavailable, falling back to Anthropic');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `A paralyzed hospital patient typed these keywords: "${keywords}". 
                    Expand into one natural caring sentence they want spoken aloud. 
                    Reply with ONLY the sentence, nothing else.`,
        }],
      }),
    });
    const anthropicData = await response.json();
    const sentence = anthropicData.content?.[0]?.text ?? keywords;
    return NextResponse.json({ sentence });
  }
}