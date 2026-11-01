# Salvo Soccer upload lab

Salvo Soccer ImageKit Upload V1 + Uppy test page, published on GitHub Pages with an authenticated private signing backend.

- [GitHub Pages uploader](https://anecdotal-media.github.io/salvo-soccer-upload/)
- [Private backend and original uploader](https://salvo-soccer-upload-lab.fankymalloon.chatgpt.site)

GitHub Pages hosts only static code. Choose **Connect ImageKit**, sign in as the owner in the connection window, and keep that window open while uploading. The page uses the private server for one-time upload signatures and the test-file listing. The ImageKit private key stays in the backend's secret environment.

## Use it

1. On GitHub Pages, choose **Connect ImageKit** and sign in in the connection window. If sign-in takes longer than two minutes, choose Connect ImageKit again after signing in.
2. Select a program and optionally enter a team or event.
3. Drop or browse for photos/videos, then press Upload.
4. Recent uploads persist in ImageKit. Open/copy delivery URLs, or try square cropping and grayscale previews.

Destination: `/salvo-soccer/test-uploads/<program>`. Tags: `salvo-soccer`, `upload-test`, program, optional team/event. Unique filenames prevent overwrites. There is no delete route.

Supported: JPEG, PNG, WebP, GIF, HEIC/HEIF, MP4, MOV, WebM. Photos ≤25 MB, videos ≤100 MB, 20 files/batch, two simultaneous transfers. Browser previews vary for HEIC and MOV.

## Architecture

- `worker/index.js`: self-contained page and Cloudflare-compatible server routes.
- `POST /api/upload-auth`: authenticated identity, same-origin request and custom header required. Unique HMAC-SHA1 signature expires in five minutes. The private key never reaches the client.
- Uppy sends multipart files directly to `https://upload.imagekit.io/api/v1/files/upload`.
- `GET /api/files`: authenticated server search for the latest 12 test-tagged assets, filtered to the dedicated folder.
- `/github-pages-bridge`: authenticated connection window. Accepts messages only from its opener at `https://anecdotal-media.github.io`, and forwards only the three permitted API calls. No private key is sent through this bridge.
- `docs/index.html`: generated, credential-free GitHub Pages frontend. Public visitors can see the interface; API access requires the owner's private backend session.
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
