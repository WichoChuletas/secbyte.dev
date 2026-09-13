// Minimal static-asset Worker. This project deploys via `wrangler deploy`
// (Cloudflare "Workers Builds", not classic Pages), which needs an explicit
// entry point even for a fully static site — this just hands every request
// to the built assets.
export default {
	async fetch(request, env) {
		return env.ASSETS.fetch(request);
	},
};
