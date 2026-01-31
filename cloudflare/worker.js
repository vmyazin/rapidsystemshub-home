// worker.js
// Cloudflare Worker for handling contact form submissions
// Deploy this to Cloudflare Workers with: wrangler deploy

const ALLOWED_ORIGIN = 'https://www.rapidsystemshub.com';
const RATE_LIMIT_SECONDS = 120; // 2 minutes

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Only allow POST requests
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            const body = await request.json();
            const data = JSON.parse(body.body);

            // 1. HONEYPOT VALIDATION - silent reject to not alert bots
            if (data.website && data.website.trim().length > 0) {
                console.log('Bot detected via honeypot');
                return successResponse('Success');
            }

            // 2. INPUT VALIDATION
            const name = sanitizeInput(data.name);
            const email = sanitizeInput(data.email);
            const message = sanitizeInput(data.message);
            const timestamp = data.timestamp || Date.now();

            if (!name || name.length < 2 || name.length > 100) {
                return errorResponse('Invalid name', 400);
            }

            if (!isValidEmail(email)) {
                return errorResponse('Invalid email', 400);
            }

            if (!message || message.length < 10 || message.length > 5000) {
                return errorResponse('Invalid message', 400);
            }

            // 3. TIMESTAMP VALIDATION (prevent replay attacks)
            const timeDiff = Date.now() - timestamp;
            if (timeDiff > 300000 || timeDiff < 0) {
                return errorResponse('Request expired', 400);
            }

            // 4. RATE LIMITING using Cloudflare KV
            const rateLimitKey = `rate_limit:${email}`;
            const lastSubmission = await env.SUBMISSIONS_KV.get(rateLimitKey);

            if (lastSubmission && (Date.now() - parseInt(lastSubmission)) < RATE_LIMIT_SECONDS * 1000) {
                return errorResponse('Rate limit exceeded', 429);
            }

            // 5. CHECK SUPPRESSION LIST (bounced/complained emails) - silent reject
            const isSuppressed = await env.SUBMISSIONS_KV.get(`suppressed:${email}`);
            if (isSuppressed) {
                console.log(`Email ${email} is suppressed, rejecting`);
                return successResponse('Success');
            }

            // 6. GET IP ADDRESS FOR LOGGING
            const clientIP = request.headers.get('CF-Connecting-IP') || 'Unknown';

            // 7. SEND EMAIL via Resend API
            const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Contact Form <noreply@rapidsystemshub.com>',
                    to: ['info@rapidsystemshub.com'],
                    replyTo: email,
                    subject: `New Contact Form Submission from ${name}`,
                    html: generateEmailHTML(name, email, message, data.optIn, clientIP, timestamp),
                    text: generateEmailText(name, email, message, data.optIn, clientIP, timestamp),
                }),
            });

            if (!emailResponse.ok) {
                const error = await emailResponse.json();
                console.error('Resend API error:', error);
                return errorResponse('Failed to send email', 500);
            }

            // 8. UPDATE RATE LIMIT
            await env.SUBMISSIONS_KV.put(rateLimitKey, Date.now().toString(), {
                expirationTtl: RATE_LIMIT_SECONDS,
            });

            // 9. SUCCESS RESPONSE
            return successResponse('Email sent successfully');

        } catch (error) {
            console.error('Error processing form:', error);
            return errorResponse('Internal server error', 500);
        }
    },
};

// Helper functions
function sanitizeInput(input) {
    if (!input) return '';
    return String(input)
        .replace(/[\r\n]/g, '')
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, 1000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) &&
        !email.includes('..') &&
        email.length <= 254 &&
        email.length >= 5;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function generateEmailHTML(name, email, message, optIn, ip, timestamp) {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #333; }
    .value { color: #666; }
    .message { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>New Contact Form Submission</h2>
    <div class="field"><span class="label">Name:</span> <span class="value">${escapeHtml(name)}</span></div>
    <div class="field"><span class="label">Email:</span> <span class="value">${escapeHtml(email)}</span></div>
    <div class="field"><span class="label">Opt-in:</span> <span class="value">${optIn ? 'Yes' : 'No'}</span></div>
    <div class="field"><span class="label">IP Address:</span> <span class="value">${ip}</span></div>
    <div class="field"><span class="label">Timestamp:</span> <span class="value">${new Date(timestamp).toISOString()}</span></div>
    <div class="message"><div class="label">Message:</div><p class="value">${escapeHtml(message)}</p></div>
  </div>
</body>
</html>`;
}

function generateEmailText(name, email, message, optIn, ip, timestamp) {
    return `New Contact Form Submission

Name: ${name}
Email: ${email}
Opt-in: ${optIn ? 'Yes' : 'No'}
IP Address: ${ip}
Timestamp: ${new Date(timestamp).toISOString()}

Message:
${message}`;
}

function successResponse(message) {
    return new Response(JSON.stringify({ message }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
    });
}

function errorResponse(message, statusCode) {
    return new Response(JSON.stringify({ error: message }), {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
    });
}