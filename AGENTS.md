# AGENTS.md

## Cursor Cloud specific instructions

This is a **static frontend-only** GitHub Project Dashboard (3 files: `index.html`, `app.js`, `styles.css`). There are no dependencies, no package manager, no build step, and no linter/test framework configured.

### Running the app

Serve the repository root with any static HTTP server. The `<script type="module">` tag requires HTTP — `file://` will not work.

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in a browser (or use `curl` for basic verification).

### Key caveats

- The app calls the **GitHub REST API** (`api.github.com`) at runtime; internet access is required.
- Without a GitHub Personal Access Token the rate limit is 60 requests/hour. A token raises it to 5 000/hour.
- There are **no automated tests, no linter, and no build command** in this repository. Verification is manual (load the page and confirm data renders).
