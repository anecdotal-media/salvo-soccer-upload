# Salvo Soccer upload lab

Private ImageKit Upload V1 + Uppy test page. Sites supplies authentication; the private API key is stored as a secret runtime value.

## Use it

1. Select a program and optionally enter a team or event.
2. Drop or browse for photos/videos, then press Upload.
3. Recent uploads persist in ImageKit. Open/copy delivery URLs, or try square cropping and grayscale previews.

Destination: `/salvo-soccer/test-uploads/<program>`. Tags: `salvo-soccer`, `upload-test`, program, optional team/event. Unique filenames prevent overwrites. There is no delete route.

Supported: JPEG, PNG, WebP, GIF, HEIC/HEIF, MP4, MOV, WebM. Photos ≤25 MB, videos ≤100 MB, 20 files/batch, two simultaneous transfers. Browser previews vary for HEIC and MOV.

## Architecture

- `worker/index.js`: self-contained page and Cloudflare-compatible server routes.
- `POST /api/upload-auth`: authenticated identity, same-origin request and custom header required. Unique HMAC-SHA1 signature expires in five minutes. The private key never reaches the client.
- Uppy sends multipart files directly to `https://upload.imagekit.io/api/v1/files/upload`.
- `GET /api/files`: authenticated server search for the latest 12 test-tagged assets, filtered to the dedicated folder.
- ImageKit URL transformations preserve originals.
- Uppy v6.0.5 loads from the official Transloadit release CDN. No Uppy account or paid service required.

## Configuration and access

Runtime variables: `IMAGEKIT_PRIVATE_KEY` (secret), `IMAGEKIT_PUBLIC_KEY`. No credential files are included. Never put the private key in source, a browser bundle, or `.openai/hosting.json`.

This page is owner-private. A future public portal needs membership/authorization and a server-enforced upload policy before changing access. Uploaded media has public ImageKit delivery URLs, so use sample or approved media.

## Validate and package

```sh
node scripts/test-api.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

Tests cover identity, origin rejection, HMAC correctness, expiry, token uniqueness, credential isolation and folder filtering. Real browser uploads and URL transformations were also checked.

## References

- [ImageKit upload API](https://imagekit.io/docs/api-reference/upload-file/upload-file#Upload-file-V1)
- [ImageKit authentication](https://imagekit.io/docs/integration/javascript)
- [Free-plan limits](https://imagekit.io/plans/)
- [Uppy XHR](https://uppy.io/docs/xhr-upload/)
- [Official Salvo Soccer branding](https://salvosoccer.org/)
