const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_SECONDS = 60; // Cloudflare KV's minimum expirationTtl is 60s

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export async function onRequestGet(context) {
	const { params, env } = context;
	const raw = await env.COMMENTS.get(`comments:${params.slug}`);
	const comments = raw ? JSON.parse(raw) : [];
	return jsonResponse({ comments });
}

export async function onRequestPost(context) {
	const { request, params, env } = context;

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid request body.' }, 400);
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';

	if (!name || !message) {
		return jsonResponse({ error: 'Name and comment are required.' }, 400);
	}
	if (name.length > MAX_NAME_LENGTH) {
		return jsonResponse({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }, 400);
	}
	if (message.length > MAX_MESSAGE_LENGTH) {
		return jsonResponse({ error: `Comment must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, 400);
	}
	if (!turnstileToken) {
		return jsonResponse({ error: 'Verification failed. Please try again.' }, 400);
	}

	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';

	const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			secret: env.TURNSTILE_SECRET_KEY,
			response: turnstileToken,
			remoteip: ip,
		}),
	});
	const verifyResult = await verifyResponse.json();
	if (!verifyResult.success) {
		return jsonResponse({ error: 'Verification failed. Please try again.' }, 400);
	}

	const rateLimitKey = `ratelimit:${ip}`;
	const recentSubmission = await env.COMMENTS.get(rateLimitKey);
	if (recentSubmission) {
		return jsonResponse({ error: 'Please wait a moment before posting again.' }, 429);
	}

	const commentsKey = `comments:${params.slug}`;
	const raw = await env.COMMENTS.get(commentsKey);
	const comments = raw ? JSON.parse(raw) : [];

	const comment = {
		id: crypto.randomUUID(),
		name,
		message,
		createdAt: new Date().toISOString(),
	};
	comments.push(comment);

	await env.COMMENTS.put(commentsKey, JSON.stringify(comments));
	await env.COMMENTS.put(rateLimitKey, '1', { expirationTtl: RATE_LIMIT_SECONDS });

	return jsonResponse({ comment }, 201);
}
