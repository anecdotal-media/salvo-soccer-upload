# Salvo Soccer media library

Salvo Soccer media library and uploader, published on GitHub Pages with an authenticated private backend.

- [GitHub Pages upload portal](https://anecdotal-media.github.io/salvo-soccer-upload/)
- [Upload media](https://anecdotal-media.github.io/salvo-soccer-upload/upload.html)
- [Private library backend](https://salvo-soccer-upload-lab.fankymalloon.chatgpt.site)

ImageKit is already configured on the private backend. Choose files and **Upload** on GitHub Pages. If your browser session needs authorization, a sign-in window opens before the transfer starts; the selected files upload automatically after sign-in. Keep that window open while uploading. You can also choose **Sign in to upload** to authorize the session before selecting files. The ImageKit private key stays in the backend's secret environment.

## Parent upload flow (prepared revision)

The homepage and `upload.html` both open the focused uploader. Staff management is at `library.html` (or `/library` on the backend). Parents see no library navigation, destination fields, previous submissions, or editing tools.

1. Open the team-specific link.
2. Choose photos/videos, then press **Upload**.
3. See a confirmation for successfully transferred files; failed files remain available for retry.

Example link: `/?folder=woodbury/u12-orange&label=U12%20Orange`.

`folder` is a relative path within `/salvo-soccer/test-uploads/`, beginning with a known program (`club`, `academy`, `rosemount`, `two-rivers`, `woodbury`). It accepts up to four path segments of letters, digits, underscores and hyphens. Invalid links stop instead of uploading into a fallback folder. `label` is the parent-facing destination name. Without link context the private prototype uses the existing `club` destination. Existing `program` and `team` links remain usable; use `folder` for distinct team folders.

**Access remains owner-private.** The current sign-in bridge is retained for testing; this revision does not grant parents backend access. Before distributing links, implement a public, upload-only endpoint with server-validated invitations, folder binding, limits and abuse controls. Query parameters are not authorization. Do not expose the existing library or signing endpoint as a shortcut.

Supported: JPEG, PNG, WebP, GIF, HEIC/HEIF, MP4, MOV, WebM. Photos ≤25 MB, videos ≤100 MB, 20 files/batch, two simultaneous transfers. Browser previews vary for HEIC and MOV.

## Architecture

- `worker/index.js`: self-contained page and Cloudflare-compatible server routes.
- `POST /api/upload-auth`: authenticated identity, same-origin request and custom header required. Unique HMAC-SHA1 signature expires in five minutes. The private key never reaches the client.
- Uppy sends multipart files directly to `https://upload.imagekit.io/api/v1/files/upload`.
- `GET /api/files`: authenticated server search for the latest 12 test-tagged assets, filtered to the dedicated folder.
- `/github-pages-bridge`: authenticated connection window. Accepts messages only from its opener at `https://anecdotal-media.github.io`, and forwards only the three permitted API calls. No private key is sent through this bridge.
- `docs/index.html` and `docs/upload.html`: generated, credential-free upload frontend. `docs/library.html` is the separate staff workspace. Public visitors can see the interface; API access requires the owner's private backend session.
- ImageKit URL transformations preserve originals.
- Uppy v6.0.5 loads from the official Transloadit release CDN. No Uppy account or paid service required.

## Configuration and access

Runtime variables: `IMAGEKIT_PRIVATE_KEY` (secret), `IMAGEKIT_PUBLIC_KEY`. No credential files are included. Never put the private key in source, a browser bundle, or `.openai/hosting.json`.

The API remains owner-private. A future portal accepting uploads from other people needs membership/authorization and a server-enforced upload policy. Uploaded media has public ImageKit delivery URLs, so use sample or approved media.

## Validate and package

```sh
node scripts/test-api.mjs
node scripts/build-pages.mjs
node scripts/test-pages.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

Tests cover identity, origin rejection, HMAC correctness, expiry, token uniqueness, credential isolation, folder filtering and the Pages bridge's origin/opener/route restrictions. Real browser uploads and URL transformations were also checked.

GitHub Pages publishes the committed `docs/` directory on `main`. After editing the page in `worker/index.js`, regenerate `docs/`, run the tests and commit both files. Backend changes must also be deployed to Sites; pushing to GitHub alone updates the static frontend only. Runtime secrets are managed outside GitHub.

## References

- [ImageKit upload API](https://imagekit.io/docs/api-reference/upload-file/upload-file#Upload-file-V1)
- [ImageKit authentication](https://imagekit.io/docs/integration/javascript)
- [Free-plan limits](https://imagekit.io/plans/)
- [Uppy XHR](https://uppy.io/docs/xhr-upload/)
- [Official Salvo Soccer branding](https://salvosoccer.org/)

## Media library

The upload portal is the homepage. The staff library is at `library.html`; the private server also serves it at `/library`.

- All assets across folders, newest first. The backend pages through the ImageKit account; the client builds a complete searchable index before reporting the loaded count.
- Search names, tags, descriptions, custom metadata and AI labels. Program, media type and upload-date filters combine with the search.
- Favorites and saved filter views persist on the current browser only, clearly labeled in the UI.
- Select assets to copy public links or export a CSV manifest. Files remain in their original ImageKit folders.
- Asset details include image/video previews, dimensions, size, upload date, folder and visibility. Save tags/descriptions directly to ImageKit.
- Generate AI labels on an image using ImageKit's `aws-auto-tagging` extension, with a minimum 80% confidence and at most 12 labels. A run consumes 1 extension unit. No automatic tagging or repeat billing request is made during polling.
- DAM Agent opens in ImageKit's own dashboard. Native visual search is Enterprise-only and isn't available on this free-tier integration.

The private backend adds `GET /api/library`, `GET /api/asset`, `POST /api/asset/update` and `POST /api/asset/ai-tags`. All routes require the private owner session. Mutations validate origin, header, ID and allowed fields; the AI route permits only AWS auto-tagging. No delete endpoint is exposed.

Editable source lives in `web/library.html`, `web/library.css`, `web/library.js`, `web/upload.html`, `src/server.mjs` and `src/bridge.html`. `scripts/compile.mjs` embeds everything into a single Worker module. `scripts/build-pages.mjs` generates both static Pages routes. Run `npm run build:pages`, `npm test` and `npm run build` before publishing. Both GitHub Pages and the private backend must be deployed for API changes.

## Interface wording

The library and uploader use final product wording. Program names appear in destination summaries and folder breadcrumbs; legacy storage paths and system tags stay intact for compatibility. Internal routing tags are preserved when users edit descriptive tags.
