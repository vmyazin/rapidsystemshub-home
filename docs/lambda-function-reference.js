// lambda-function-reference.js
// Reference Lambda function for secure contact form handling
// Deploy this to AWS Lambda with appropriate IAM permissions for SES

const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-1' });

// Rate limiting storage (use DynamoDB or Redis in production)
// This is a simple in-memory cache for demonstration
const submissionCache = new Map();

exports.handler = async (event) => {
    try {
        // Parse the incoming request
        const body = JSON.parse(event.body);
        const data = JSON.parse(body.body);

        // 1. HONEYPOT VALIDATION
        // If the honeypot field (website) is filled, reject silently
        if (data.website && data.website.trim().length > 0) {
            console.log('Bot detected via honeypot');
            return {
                statusCode: 200, // Return 200 to not alert the bot
                headers: {
                    'Access-Control-Allow-Origin': 'https://www.rapidsystemshub.com',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                body: JSON.stringify({ message: 'Success' }),
            };
        }

        // 2. INPUT VALIDATION
        const name = sanitizeInput(data.name);
        const email = sanitizeInput(data.email);
        const message = sanitizeInput(data.message);
        const timestamp = data.timestamp || Date.now();

        // Validate required fields
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
        if (timeDiff > 300000 || timeDiff < 0) { // 5 minutes
            return errorResponse('Request expired', 400);
        }

        // 4. SERVER-SIDE RATE LIMITING (per email)
        // In production, use DynamoDB with TTL or Redis
        const rateLimitKey = `email:${email}`;
        const lastSubmission = submissionCache.get(rateLimitKey);
        
        if (lastSubmission && (Date.now() - lastSubmission) < 120000) { // 2 minutes
            return errorResponse('Rate limit exceeded', 429);
        }

        // 5. IP-BASED RATE LIMITING (optional, requires API Gateway configuration)
        const sourceIp = event.requestContext?.identity?.sourceIp;
        if (sourceIp) {
            const ipRateLimitKey = `ip:${sourceIp}`;
            const lastIpSubmission = submissionCache.get(ipRateLimitKey);
            
            if (lastIpSubmission && (Date.now() - lastIpSubmission) < 60000) { // 1 minute
                return errorResponse('Too many requests', 429);
            }
            submissionCache.set(ipRateLimitKey, Date.now());
        }

        // 6. SEND EMAIL via SES
        const emailParams = {
            Source: 'noreply@rapidsystemshub.com', // Must be verified in SES
            Destination: {
                ToAddresses: ['info@rapidsystemshub.com'], // Your receiving email
            },
            Message: {
                Subject: {
                    Data: `New Contact Form Submission from ${name}`,
                    Charset: 'UTF-8',
                },
                Body: {
                    Text: {
                        Data: `
Name: ${name}
Email: ${email}
Opt-in: ${data.optIn ? 'Yes' : 'No'}
IP Address: ${sourceIp || 'Unknown'}
Timestamp: ${new Date(timestamp).toISOString()}

Message:
${message}
                        `,
                        Charset: 'UTF-8',
                    },
                    Html: {
                        Data: `
<!DOCTYPE html>
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
        <div class="field">
            <span class="label">Name:</span>
            <span class="value">${escapeHtml(name)}</span>
        </div>
        <div class="field">
            <span class="label">Email:</span>
            <span class="value">${escapeHtml(email)}</span>
        </div>
        <div class="field">
            <span class="label">Opt-in:</span>
            <span class="value">${data.optIn ? 'Yes' : 'No'}</span>
        </div>
        <div class="field">
            <span class="label">IP Address:</span>
            <span class="value">${sourceIp || 'Unknown'}</span>
        </div>
        <div class="field">
            <span class="label">Timestamp:</span>
            <span class="value">${new Date(timestamp).toISOString()}</span>
        </div>
        <div class="message">
            <div class="label">Message:</div>
            <p class="value">${escapeHtml(message)}</p>
        </div>
    </div>
</body>
</html>
                        `,
                        Charset: 'UTF-8',
                    },
                },
            },
        };

        await ses.sendEmail(emailParams).promise();

        // Update rate limit cache
        submissionCache.set(rateLimitKey, Date.now());

        // Clean up old cache entries (simple cleanup)
        if (submissionCache.size > 1000) {
            const entries = Array.from(submissionCache.entries());
            entries.slice(0, 500).forEach(([key]) => submissionCache.delete(key));
        }

        // 7. SUCCESS RESPONSE
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://www.rapidsystemshub.com',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ message: 'Email sent successfully' }),
        };

    } catch (error) {
        console.error('Error processing form:', error);
        return errorResponse('Internal server error', 500);
    }
};

// Helper functions
function sanitizeInput(input) {
    if (!input) return '';
    return String(input)
        .replace(/[\r\n]/g, '') // Remove newlines
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim()
        .substring(0, 1000); // Limit length
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && 
           !email.includes('..') && 
           email.length <= 254 &&
           email.length >= 5;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function errorResponse(message, statusCode) {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': 'https://www.rapidsystemshub.com',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: message }),
    };
}
