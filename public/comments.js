const section = document.querySelector('[data-comments]');
const slug = section.dataset.comments;

const listEl = document.getElementById('comments-list');
const statusEl = document.getElementById('comments-status');
const formEl = document.getElementById('comments-form');
const errorEl = document.getElementById('comments-error');

function renderComments(comments) {
	listEl.innerHTML = '';
	if (comments.length === 0) {
		const empty = document.createElement('p');
		empty.className = 'status';
		empty.textContent = 'No comments yet — be the first.';
		listEl.appendChild(empty);
		return;
	}
	for (const comment of comments) {
		const item = document.createElement('article');
		item.className = 'comment';

		const header = document.createElement('div');
		header.className = 'comment-header';

		const name = document.createElement('span');
		name.className = 'comment-name';
		name.textContent = comment.name;

		const date = document.createElement('span');
		date.className = 'comment-date';
		date.textContent = new Date(comment.createdAt).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});

		header.append(name, date);

		const message = document.createElement('p');
		message.className = 'comment-message';
		message.textContent = comment.message;

		item.append(header, message);
		listEl.appendChild(item);
	}
}

async function loadComments() {
	try {
		const res = await fetch(`/api/comments/${slug}`);
		const data = await res.json();
		renderComments(data.comments ?? []);
	} catch {
		statusEl.textContent = 'Could not load comments.';
	}
}

formEl.addEventListener('submit', async (event) => {
	event.preventDefault();
	errorEl.hidden = true;

	const formData = new FormData(formEl);
	const name = formData.get('name')?.toString().trim();
	const message = formData.get('message')?.toString().trim();
	const turnstileToken = formEl.querySelector('[name="cf-turnstile-response"]')?.value;

	if (!name || !message) return;

	const submitButton = formEl.querySelector('button[type="submit"]');
	submitButton.disabled = true;

	try {
		const res = await fetch(`/api/comments/${slug}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, message, turnstileToken }),
		});
		const data = await res.json();

		if (!res.ok) {
			errorEl.textContent = data.error ?? 'Something went wrong. Please try again.';
			errorEl.hidden = false;
			return;
		}

		formEl.reset();
		if (window.turnstile) window.turnstile.reset();
		await loadComments();
	} catch {
		errorEl.textContent = 'Something went wrong. Please try again.';
		errorEl.hidden = false;
	} finally {
		submitButton.disabled = false;
	}
});

loadComments();
