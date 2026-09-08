# Contributing

Contributions to the download-site source should preserve the site's small,
server-friendly design and its accessibility, licensing, and security properties.

Before submitting a change:

1. Keep generated download-directory pages functional without requiring a build step.
2. Preserve keyboard access, visible focus, semantic links, useful alt text, and
   WCAG 2.2 AA contrast.
3. Do not add external JavaScript, fonts, trackers, or CDNs without explicit review.
4. Keep the JavaScript quick-download resolver compatible with `latest`, `test`,
   and `nightly` channels and the documented platform architecture names.
5. Add SPDX headers to source files where the format permits them.
6. Update `public/weblabels.html` if JavaScript files or licensing changes.
7. Do not alter PrivacySafe or Ivy Cyber trademark usage without review.

Security vulnerabilities should be reported through `SECURITY.md`, not a public issue.
