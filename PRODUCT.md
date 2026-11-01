# Salvo Soccer media upload test

## Platform
Web. A private test page for the account owner to explore ImageKit uploads using Uppy.

## Confirmed purpose
Upload image and video files to the existing ImageKit account without exposing its private key to the client. Match Salvo Soccer branding. No Uppy account or paid service is required.

## Confirmed organization
Use a dedicated /salvo-soccer/test-uploads folder with program and team context (confirmed by the user).

## Hosting and access
The user requested source under anecdotal-media on GitHub and publication on GitHub Pages. The public static frontend connects to the existing owner-private backend through an authenticated connection window. The intended users of a future multi-user upload portal are not yet specified.

## Constraints
Free plan: 25 MB images, 100 MB videos, 3 GB storage, 20 GB monthly bandwidth. Test media has public delivery URLs. No deletion or paid AI calls.

## Media library expansion
The user requested a recreated DAM library guided by DAM best practices, including available ImageKit AI tools. The default view now spans all account assets across folders. It supports keyword search over names, tags, descriptions, custom metadata and generated AI labels; program/type/date filters; editable tags and descriptions; browser-local favorites and saved views; link and CSV export. The upload page remains available separately.

AI capabilities: manual AWS auto-tagging is integrated (1 included extension unit per run). Natural-language DAM Agent remains in ImageKit's dashboard and is linked from the library. ImageKit visual similarity search requires Enterprise and is not represented as working on the current free account. No plan upgrade or destructive asset operation is included.
