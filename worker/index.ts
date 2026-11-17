// §8 — Cloudflare Worker: bwh-contact-worker
// Receives POST from the contact form, validates payload, sends via ZeptoMail.
// CORS restricted to allowed origins. HTML-escapes all user input before email body.

export interface Env {
  ZEPTO_API_KEY: string;
  ZEPTO_FROM_ADDRESS: string;
  ZEPTO_FROM_NAME: string;
  ZEPTO_TO_ADDRESS: string;
}

// §8 spec: update ALLOWED_ORIGINS when domain is confirmed.
const ALLOWED_ORIGINS = [
  'https://bluewavehz.com',
  'https://www.bluewavehz.com',
  'https://bluewavehorizon.dwellr.ng',
  'https://www.bluewavehorizon.dwellr.ng',
  'http://localhost:4321', // Astro dev server
];

function corsHeaders(origin: string | null): HeadersInit {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    let body: { name?: string; email?: string; subject?: string; message?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, subject, message } = body;

    // Server-side validation — §8 spec
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, message' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Build ZeptoMail payload — §8 spec
    const zeploPayload = {
      from: {
        address: env.ZEPTO_FROM_ADDRESS,
        name: env.ZEPTO_FROM_NAME,
      },
      to: [
        {
          email_address: {
            address: env.ZEPTO_TO_ADDRESS,
            name: 'Blue Wave Horizon',
          },
        },
      ],
      reply_to: [{ email_address: { address: email, name: name } }],
      subject: subject
        ? `[BWH Contact] ${subject}`
        : `[BWH Contact] New message from ${name}`,
      htmlbody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #18d8eb;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject ?? 'No subject provided')}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    };

    try {
      const zeploResponse = await fetch('https://api.zeptomail.com/v1.1/email', {
        method: 'POST',
        headers: {
          Authorization: `Zoho-enczapikey ${env.ZEPTO_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(zeploPayload),
      });

      if (!zeploResponse.ok) {
        const errText = await zeploResponse.text();
        console.error('ZeptoMail error:', errText);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 502,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Worker fetch error:', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  },
};

// §8 spec — sanitise user input before embedding in HTML email
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
