# Release aliases and JavaScript quick downloads

Directory pages create synthetic quick-download links in JavaScript. These are
independent of filesystem aliases: if an alias-named file or symlink already
exists, the raw alias row is hidden and the browser-generated shortcut is rebuilt
from the newest matching versioned installer. The shortcut displays the selected
installer's real date and file size.

This means filesystem symlinks are optional for the directory UI. They are still
useful when a stable direct URL must work without loading the directory page.

## Symbolic-link command

Use:

```sh
ln -sfn TARGET LINK_NAME
```

- `-s` creates a symbolic link.
- `-f` replaces an existing destination link or file.
- `-n` treats an existing destination symlink as the object to replace rather
  than dereferencing it when it points to a directory.

Example:

```sh
cd /nightly/windows
ln -sfn PrivacySafe-26.09-win-0.21.2.5-x64.exe PrivacySafe-nightly.exe
```

Prefer relative targets, as above, so the release tree remains portable.

## Public alias naming

- Windows: `x64`, `arm64`; architecture may be omitted while only one `.exe`
  architecture is published.
- Android: `x86_64`, `armeabi-v7a`, `arm64-v8a`; architecture may be omitted
  while only one `.apk` architecture is published.
- Mac OS: `x86_64`, `arm64`; the UI labels `arm64` as `M Series`.
- GNU/Linux AppImage: `x86_64`, `aarch64`.
- Debian packages: `amd64`, `arm64`.
- Apple iOS `.ipa`: `arm64e` (newer iPhone/iPad) and `arm64` (older iPhone/iPad) are Quick downloads; `x86_64` is not shown in Quick downloads.

The UI labels Intel-compatible 64-bit builds as `Intel/AMD 64`, 64-bit ARM builds
as `ARM 64`, Android 32-bit ARM as `ARM 32`, and Mac OS arm64 as `M Series`.
