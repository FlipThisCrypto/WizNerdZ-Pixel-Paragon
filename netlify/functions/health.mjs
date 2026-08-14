// Health check — proves the Netlify function pipeline works end to end.
//
// Deliberately does NOTHING but report status: no chain access, no keys, no
// blob writes, no mint logic. It exists so we can confirm deploys + routing
// before any real mint code goes near it.
//
// GET /api/health
export default async (req) => {
  const body = {
    ok: true,
    service: "wiznerdz-mint-api",
    stage: "0-scaffold",
    note: "Backend scaffold only. No mint endpoints exist yet. Nothing touches the chain.",
    // Confirms this site is isolated from any other Netlify site's data.
    blobsNamespace: "wiznerdz-* (per-site scoped)",
    time: new Date().toISOString(),
    // Surfaced so we can verify which commit is deployed.
    commit: process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(0, 8) : null,
    context: process.env.CONTEXT || null,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // The GitHub Pages frontend needs to be able to call this cross-origin.
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
};
