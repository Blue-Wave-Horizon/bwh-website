// §8 — Cloudflare Worker: bwh-contact-worker
// Receives POST from the contact form, validates payload, sends via ZeptoMail.
// CORS restricted to allowed origins. HTML-escapes all user input before email body.

export interface Env {
  ZEPTO_API_KEY: string;
  ZEPTO_FROM_ADDRESS: string;
  ZEPTO_FROM_NAME: string;
  ZEPTO_TO_ADDRESS: string;
  TURNSTILE_SECRET_KEY?: string;
}

// §8 spec: update ALLOWED_ORIGINS when domain is confirmed.
const ALLOWED_ORIGINS = [
  'https://bluewavehz.com',
  'https://www.bluewavehz.com',
  'https://bluewavehorizon.dwellr.ng',
  'https://www.bluewavehorizon.dwellr.ng',
  'http://localhost:4321', // Astro dev server
];

// Allow bwh-website production and Cloudflare Workers preview/branch URLs
const WORKERS_DEV_ORIGIN_RE =
  /^https:\/\/([a-z0-9-]+-)?bwh-website\.blue-wave-horizon\.workers\.dev$/;

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || WORKERS_DEV_ORIGIN_RE.test(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
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

    let body: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      bwh_hp?: string;
      turnstileToken?: string;
    };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Honeypot: silently accept bot submissions without sending email
    if (typeof body.bwh_hp === 'string' && body.bwh_hp.trim().length > 0) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Verify Cloudflare Turnstile token when secret is configured
    if (env.TURNSTILE_SECRET_KEY) {
      const token = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
      if (!token) {
        return new Response(JSON.stringify({ error: 'Bot verification required' }), {
          status: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const verifyRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: env.TURNSTILE_SECRET_KEY,
            response: token,
            remoteip: request.headers.get('CF-Connecting-IP') ?? '',
          }),
        }
      );
      const verifyData = (await verifyRes.json()) as { success?: boolean };
      if (!verifyData.success) {
        return new Response(JSON.stringify({ error: 'Bot verification failed' }), {
          status: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
    }

    const name = typeof body.name === 'string' ? body.name.replace(/[\r\n]+/g, ' ').trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subject =
      typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

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

    if (name.length > 120 || email.length > 254 || subject.length > 200 || message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Input exceeds maximum length' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
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
      reply_to: [{ address: email, name: name }],
      subject: subject
        ? `[BWH Contact] ${subject}`
        : `[BWH Contact] New message from ${name}`,
      htmlbody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #18d8eb;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject || 'No subject provided')}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
      `,
    };

    try {
      const rawKey = (env.ZEPTO_API_KEY ?? '').trim();
      const authHeader = rawKey.startsWith('Zoho-enczapikey ')
        ? rawKey
        : `Zoho-enczapikey ${rawKey}`;

      const zeploResponse = await fetch('https://cpaas.zoho.com/v1.1/email', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(zeploPayload),
      });

      if (!zeploResponse.ok) {
        const errText = await zeploResponse.text();
        console.error(
          'ZeptoMail error:',
          zeploResponse.status,
          zeploResponse.statusText,
          errText
        );
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          {
            status: 502,
            headers: { ...headers, 'Content-Type': 'application/json' },
          }
        );
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
