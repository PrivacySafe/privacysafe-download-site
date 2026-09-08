# Deployment

Use `public/` as the website payload for `download.privacysafe.app`.

The production server already provides Nginx autoindex directory listings and already
uses the `privacysafe-index/header.html` / `privacysafe-index/footer.html` hooks. This
repository intentionally does **not** require or ship an Nginx configuration change.

The two fragments cooperate to form the browser document: `header.html` opens the
PrivacySafe document and an inert raw-text container, the native Nginx autoindex output
is captured inside that container, and `footer.html` closes it and loads
`autoindex.js`. The JavaScript parses the captured listing and renders the accessible
PrivacySafe directory UI into the page.

Deploy the files under `public/` while preserving paths. Release directories live beside
the static files, for example:

```text
/
├── latest/
│   ├── android/
│   ├── gnulinux/
│   ├── mac/
│   └── windows/
├── test/
│   └── ...
├── nightly/
│   └── ...
├── privacysafe-index/
├── robots.txt
├── llms.txt
├── weblabels.html
└── index.html
```

For ordinary releases, no web-server configuration edit or reload should be needed.
