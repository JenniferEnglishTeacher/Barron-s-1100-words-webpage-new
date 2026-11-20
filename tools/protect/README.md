# Protected (student-code) build

`APP_KEY=<base64 key> node tools/protect/build.js <output dir>` turns the readable site into the version that is published:

- every `*.html` becomes an empty shell that loads `gate.js`; the real page is in `e/p/<page>.bin`, its local scripts in `e/<script>.bin`
  (AES-256-GCM, same key and same student codes as the phone app `sat-vocab-test-app`; the key comes from the Apps Script backend after login);
- pictures are copied to `i/<unguessable name>.webp`; pages keep writing `images/<zone>/<word>.webp` and the gate translates it;
- free sample (`config.json` → `samplePages`): those pages and cut-down copies of the shared indexes go to `s/`, encrypted with the public sample key;
- `styles.css` and `vendor/` stay as they are. Output is deterministic: an unchanged source file gives an unchanged output file.

The build fails on anything it does not understand (new script tag form, a new global in a shared file used by sample pages, a non-webp picture).
Local test: `ROOT=<output dir> APP_KEY=… node <sat-vocab-test-app>/tools/mock-server.js 8766` with `--api /api` on the build.
