/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  // Limit request body size for all API routes.
  // The intake form supports large file uploads (videos, many screenshots)
  // but we cap server-side to prevent DoS / accidental $10k Sonnet calls.
  // Client-side caps (120 files / 200MB) are enforced in SupportingFiles.tsx;
  // this is the hard server-side backstop.
  api: {
    bodyParser: {
      sizeLimit: '50mb',  // Hard cap — API routes won't accept larger payloads
    },
  },
}
