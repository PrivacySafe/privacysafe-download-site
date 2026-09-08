<p align="center">
  <a href="https://download.privacysafe.app"><img src="privacysafe_logo.svg" width="300" alt="PrivacySafe" /></a>
</p>
<h1 align="center">PrivacySafe Downloads</h1>

Source and deployment files for the official PrivacySafe software download host:
[download.privacysafe.app](https://download.privacysafe.app).

PrivacySafe is Free/Libre and Open Source Software (FLOSS) for private communication and
storage. PrivacySafe builds are published by [Ivy Cyber](https://ivycyber.com). Upstream
development, education, standards, and public-interest research are funded by donations to
[PrivacySafe Foundation](https://privacysafe.foundation), a 501(c)(3) nonprofit public charity.
The [download.privacysafe.app](https://download.privacysafe.app) site is hosted in Canada by
[3NSoft](https://3nsoft.com) for Ivy Cyber.

This repository contains the static site, Nginx autoindex presentation layer, metadata,
licensing information, accessibility styling, release-shortcut logic, and deployment
documentation for the download host. Release binaries themselves are deployment data and are
not maintained in this source tree.

## What the download site does

The production server supplies native Nginx autoindex directory listings. The files in
`public/privacysafe-index/` turn those listings into the branded PrivacySafe download UI without
requiring a custom Nginx configuration change for normal deployments.

The site currently supports three release channels:

- `latest/` — displayed as **Latest Builds**
- `test/` — displayed as **Test Builds**
- `nightly/` — displayed as **Nightly Builds**

At each channel root, operating-system directories are presented in this order:

1. Android
2. Windows
3. Mac OS
4. GNU/Linux
5. Apple iOS

The matching supplied SVG operating-system icon is shown beside Android, Windows, Mac OS,
GNU/Linux, and Apple iOS labels and headings. The Apple icon is used for both Mac OS and Apple
iOS. Icons inherit the link color so they remain white normally and change with the text on
hover or keyboard focus.

Channel-specific headings are rendered as, for example, **Latest Android Version**,
**Test Windows Version**, **Nightly Mac OS Version**, **Latest GNU/Linux Version**, and
**Nightly Apple iOS Version**.

The download root also provides direct links to the nightly Android, Windows, Mac OS, and
GNU/Linux directories. Android and Apple iOS directory pages include subdued "Coming soon"
store-availability notices beneath the page heading.

## Repository layout

```text
.
├── README.md
├── privacysafe_logo.svg
├── LICENSE
├── LICENSES/
│   ├── AGPL-3.0-or-later.txt
│   └── Stack-Sans-OFL-1.1.txt
├── NOTICE
├── TRADEMARKS.md
├── SECURITY.md
├── SPDX-HEADERS.md
├── CONTRIBUTING.md
├── docs/
│   ├── DEPLOYMENT.md
│   └── RELEASE-ALIASES.md
└── public/                         # production web document root
    ├── index.html
    ├── robots.txt
    ├── sitemap.xml
    ├── llms.txt
    ├── weblabels.html
    ├── security.txt
    ├── .well-known/
    │   └── security.txt
    ├── favicon.ico                 # root/browser fallback
    ├── social-preview.jpg          # compatibility copy
    └── privacysafe-index/          # intentionally flat
        ├── autoindex.css
        ├── autoindex.js
        ├── header.html
        ├── footer.html
        ├── plausible-metrics.js
        ├── privacysafe_logo.svg
        ├── social-preview.jpg
        ├── favicon.ico
        ├── favicon.png
        ├── favicon.gif
        ├── icon-os-android.svg
        ├── icon-os-linux.svg
        ├── icon-os-mac.svg
        ├── icon-os-windows.svg
        ├── stack-sans-headline-latin-400-normal.woff2
        ├── stack-sans-headline-latin-500-normal.woff2
        ├── stack-sans-headline-latin-600-normal.woff2
        └── stack-sans-headline-latin-700-normal.woff2
```

`public/` is the production document root for
[download.privacysafe.app](https://download.privacysafe.app). Release directories such as
`latest/`, `test/`, and `nightly/` live beside these static files on the production host and do
not belong in this repository unless a deployment workflow explicitly manages them here.

`public/privacysafe-index/` is intentionally kept flat because the production download host
references these assets directly from that path.

## Nginx autoindex integration

The production Nginx configuration already uses `privacysafe-index/header.html` and
`privacysafe-index/footer.html` around autoindex output. This repository does not require an
Nginx configuration change for ordinary site updates.

The fragments cooperate to build one valid browser document:

1. `header.html` opens the PrivacySafe document and an inert raw-text container.
2. Nginx writes its native autoindex HTML into that container.
3. `footer.html` closes the raw-text container and loads `autoindex.js`.
4. `autoindex.js` parses the captured listing and renders the accessible PrivacySafe directory
   interface into the page.

This preserves the existing server-side autoindex behavior while preventing the Nginx-generated
`html`, `head`, and `body` markup from becoming nested document elements in the parsed DOM.

## Quick downloads

For supported release directories, `autoindex.js` creates a **Quick downloads** section above
**All files**. Quick-download rows are synthesized from the newest matching versioned build in
the current directory rather than depending on a filesystem alias.

For every synthetic shortcut, the UI keeps the selected build's real modification date and file
size. When a same-directory `checksums.json` file is available, the matching SHA-256 value is
shown directly beneath the shortcut. The checksum parser supports the PrivacySafe JSON format,
including `sha256_in_hex`, and tolerates several common nested JSON and sha256sum-style forms.

Dates are displayed as `Sep 7, 2026`. File sizes are displayed with the concise labels `B`,
`KB`, `MB`, `GB`, and `TB`.

Quick-download rows use alternating dark-brown backgrounds for easier row tracking, with a
subtle lighter hover/focus state. The ordinary **All files** listing remains visually quieter.

If a physical file or symlink already uses the clean alias name, its raw autoindex row is hidden
and the browser-generated shortcut takes precedence. Filesystem aliases therefore remain
optional for the directory UI, although they are still useful when a stable direct URL must
work without first loading the directory page.

### Quick-download naming and architecture rules

| Platform | Quick-download behavior |
| --- | --- |
| Windows | `.exe`; `x64` and `arm64` are recognized. The architecture may be omitted from the clean alias while only one architecture is published. |
| Android | `.apk`; `arm64-v8a`, `x86_64`, and `armeabi-v7a` are recognized. The architecture may be omitted from the clean alias while only one architecture is published. |
| Mac OS | `.dmg`; `arm64` and `x86_64`; Apple Silicon `arm64` is labeled **M Series**. |
| GNU/Linux | `.AppImage` aliases use `x86_64` / `aarch64`; Debian `.deb` aliases use `amd64` / `arm64`. |
| Apple iOS | `.ipa`; `arm64e` is labeled **newer iPhone/iPad** and listed before `arm64`, which is labeled **older iPhone/iPad**. `x86_64` builds remain visible under **All files** but are deliberately excluded from **Quick downloads**. |

Architecture spellings used by release tooling are normalized where appropriate. In particular,
`x86_64`, `x64`, and `amd64` are treated as the same 64-bit x86 family, while `aarch64`,
`aarch64-v8`, `aarch64-v8a`, `arm64`, `arm64-v8`, and `arm64-v8a` are treated as the same
64-bit ARM family. Public shortcut names still use the platform-appropriate canonical spelling.

See `docs/RELEASE-ALIASES.md` for the complete alias rules and optional filesystem symlink
examples.

## Accessibility and responsive behavior

The directory UI is designed for WCAG 2.2 AA-oriented use and includes semantic headings and
lists, a skip link, visible keyboard focus states, minimum-size primary directory targets,
mobile wrapping for long filenames and checksums, reduced-motion handling, forced-colors
support, and text labels for information that is also conveyed visually.

Operating-system SVG icons are decorative and marked so they do not duplicate the visible text
for assistive technologies. Store links and other inline links remain visually distinguishable
without relying on color alone.

## Search, crawler, and machine-readable metadata

The download host publishes `robots.txt`, `sitemap.xml`, `llms.txt`, Open Graph and Twitter
metadata, canonical URLs, structured data, security metadata, and source/licensing information.
The site identifies the main PrivacySafe language-model summary at
[privacysafe.app/llms.txt](https://privacysafe.app/llms.txt).

The download pages also expose GNU LibreJS metadata. The canonical `rel="jslicense"` declaration
points to [privacysafe.app/weblabels.html](https://privacysafe.app/weblabels.html), while the
download host retains its own `weblabels.html` page for download-site script information.

Privacy-respecting aggregate metrics are loaded from `privacysafe.click` for the
`download.privacysafe.app` domain. `plausible-metrics.js` is retained as the corresponding
source copy used by the JavaScript licensing information.

## Deployment

Deploy the contents of `public/` while preserving paths. The release tree on the server is
expected to look broadly like this:

```text
/
├── latest/
│   ├── android/
│   ├── windows/
│   ├── mac/
│   ├── gnulinux/
│   └── ios/
├── test/
│   └── ...
├── nightly/
│   └── ...
├── privacysafe-index/
├── robots.txt
├── sitemap.xml
├── llms.txt
├── weblabels.html
└── index.html
```

For ordinary releases, no web-server configuration edit or reload should be required. See
`docs/DEPLOYMENT.md` for deployment details.

## Security

Security issues should be reported through the PrivacySafe security process rather than a public
issue tracker. See `SECURITY.md` and [ivycyber.com/security-policy](https://ivycyber.com/security-policy/).

## ⚖️ License

© 2026 <a href="https://ivycyber.com" rel="nofollow">Ivy Cyber LLC</a>. This project is dedicated to ethical <a href="https://fsf.org/" rel="nofollow">Free/Libre and Open Source Software (FLOSS)</a>.

Unless otherwise noted, this repository and the website it publishes, including HTML, CSS,
JavaScript, text, images, and other original site materials, are free software licensed under the 
<a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="nofollow">GNU Affero General Public License version 3 or later</a> (`AGPL-3.0-or-later`).

PrivacySafe® and 3NWeb® are registered trademarks. PrivacySafe Foundation™ and Ivy Cyber™ are
pending trademarks. Other product, service, technology, and organization names, logos, and marks
used in connection with PrivacySafe, 3NWeb, PrivacySafe Foundation, Ivy Cyber, or 3NSoft may also
be protected by applicable trademark law. Copyright and software licenses do not grant trademark
rights or permission to use such marks in a manner that suggests sponsorship, endorsement,
affiliation, or origin.

Third-party software, content, fonts, icons, and documentation retain their original copyrights
and licenses where applicable. See `NOTICE`, `LICENSES`, `TRADEMARKS.md`, and file-level SPDX
identifiers for details. Stack Sans Headline is bundled as WOFF2 webfonts under the SIL Open Font
License 1.1.

Per-script JavaScript licensing information used by the download site is available through the
LibreJS information linked from the site footer and canonical `rel="jslicense"` metadata.
