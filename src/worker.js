import { ARTICLE_SLUGS } from './generated/article-slugs.js';

const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_BODY_BYTES = 10_000; // generous for name + message + a Turnstile token
const MAX_COMMENTS_PER_ARTICLE = 500;
const RATE_LIMIT_SECONDS = 60; // Cloudflare KV's minimum expirationTtl is 60s

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

async function handleGetComments(slug, env) {
	const raw = await env.COMMENTS.get(`comments:${slug}`);
	const comments = raw ? JSON.parse(raw) : [];
	return jsonResponse({ comments });
}

async function handlePostComment(request, slug, env) {
	const contentLength = request.headers.get('content-length');
	if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
		return jsonResponse({ error: 'Request body too large.' }, 413);
	}

	let body;
	try {
		const rawBody = await request.text();
		if (rawBody.length > MAX_BODY_BYTES) {
			return jsonResponse({ error: 'Request body too large.' }, 413);
		}
		body = JSON.parse(rawBody);
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

	const commentsKey = `comments:${slug}`;
	const raw = await env.COMMENTS.get(commentsKey);
	const comments = raw ? JSON.parse(raw) : [];

	if (comments.length >= MAX_COMMENTS_PER_ARTICLE) {
		return jsonResponse({ error: 'This article has reached its comment limit.' }, 403);
	}

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

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const match = url.pathname.match(/^\/api\/comments\/([^/]+)\/?$/);

		if (match) {
			const slug = decodeURIComponent(match[1]);
			if (!ARTICLE_SLUGS.includes(slug)) {
				return jsonResponse({ error: 'Unknown article.' }, 404);
			}
			if (request.method === 'GET') return handleGetComments(slug, env);
			if (request.method === 'POST') return handlePostComment(request, slug, env);
			return jsonResponse({ error: 'Method not allowed.' }, 405);
		}

		return env.ASSETS.fetch(request);
	},
};
