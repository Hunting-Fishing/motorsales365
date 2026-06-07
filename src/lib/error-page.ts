// Self-contained HTML error page. Must NOT import any app code — if it did,
// the same module-init failure that triggered the wrapper could also break
// the error page itself.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Something went wrong — 365 MotorSales</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         background: #f8fafc; color: #0f172a; padding: 24px; }
  @media (prefers-color-scheme: dark) { body { background: #0f172a; color: #f8fafc; } }
  .card { max-width: 480px; text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 8px; }
  p  { margin: 0 0 24px; opacity: .8; font-size: .95rem; }
  .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  a, button { display: inline-flex; align-items: center; justify-content: center;
              padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: .9rem;
              text-decoration: none; border: 1px solid currentColor; color: inherit;
              background: transparent; cursor: pointer; }
  .primary { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
</style>
</head>
<body>
  <div class="card">
    <h1>Something went wrong</h1>
    <p>We hit an unexpected error. Our team has been notified. Please try again.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Try again</button>
      <a href="/">Go home</a>
    </div>
  </div>
</body>
</html>`;
}
