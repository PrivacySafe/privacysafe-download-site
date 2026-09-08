// SPDX-FileCopyrightText: 2026 Ivy Cyber LLC
// SPDX-License-Identifier: AGPL-3.0-or-later
(function () {
   'use strict';


   const CHANNELS = [ 'nightly', 'test', 'latest' ];
   const OSES = [ 'android', 'gnulinux', 'mac', 'windows', 'ios', 'web' ];
   const BUNDLE_INFO_FILE = 'versions-in-bundle.json';

   function currentPathParts() {
      return location.pathname.split('/').filter(Boolean);
   }

   function currentChannel() {
      return currentPathParts().find(part => CHANNELS.includes(part)) || '';
   }

   function currentOS() {
      return currentPathParts().find(part => OSES.includes(part)) || '';
   }

   function sizeToString(size) {
      const metrics = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
      let value = Number(size);
      let unit = 0;
      while (value >= 900 && unit < metrics.length - 1) {
         value /= 1024;
         unit += 1;
      }
      const shown = unit === 0 ? String(Math.round(value)) : String(Number(value.toFixed(2)));
      return `${shown} ${metrics[unit]}`;
   }


   function formatDisplayDate(datePart, timePart) {
      const parsed = new Date(`${datePart} ${timePart || '00:00'} UTC`);
      if (isNaN(parsed)) { return ''; }
      return parsed.toLocaleDateString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric',
         timeZone: 'UTC'
      });
   }

   function parseRawLine(line) {
      const holder = document.createElement('div');
      holder.innerHTML = line;
      const anchor = holder.querySelector('a');
      if (!anchor) { return null; }
      const txt = (anchor.textContent || '').trim();
      if (!txt || txt === '../') { return null; }

      const tail = line.substring(line.lastIndexOf('</a>') + 4).trim();
      const match = tail.match(/^(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}:\d{2})\s+(\d+|-)\s*$/);
      const rawSize = match && /^\d+$/.test(match[3]) ? Number(match[3]) : null;
      const modified = match ? new Date(`${match[1]} ${match[2]} UTC`) : null;

      return {
         txt,
         href: anchor.href,
         rawSize,
         size: rawSize === null ? '' : sizeToString(rawSize),
         date: match ? formatDisplayDate(match[1], match[2]) : '',
         modified: modified && !isNaN(modified) ? modified.getTime() : 0,
         synthetic: false
      };
   }

   function parseItemLines(nginxList) {
      return nginxList.innerHTML
         .split('\n')
         .map(parseRawLine)
         .filter(Boolean);
   }

   function numericVersionKey(filename) {
      const m = filename.match(/^PrivacySafe-(\d{2})\.(\d{2})-(?:win|andr|mac|gnu|ios)-([0-9.]+)-/i);
      if (!m) { return []; }
      return [ Number(m[1]), Number(m[2]), ...m[3].split('.').map(Number) ];
   }

   function compareBuilds(a, b) {
      const av = numericVersionKey(a.txt);
      const bv = numericVersionKey(b.txt);
      const count = Math.max(av.length, bv.length);
      for (let i = 0; i < count; i += 1) {
         const diff = (av[i] || 0) - (bv[i] || 0);
         if (diff !== 0) { return diff; }
      }
      return (a.modified || 0) - (b.modified || 0);
   }

   function newest(items) {
      return items.slice().sort(compareBuilds).pop() || null;
   }

   function archClass(rawArch) {
      const normalized = String(rawArch || '').toLowerCase();
      if ([ 'x86_64', 'x64', 'amd64' ].includes(normalized)) { return 'x86-64'; }
      if (normalized === 'arm64e') { return 'arm64e'; }
      if ([ 'aarch64', 'aarch64-v8', 'aarch64-v8a', 'arm64', 'arm64-v8', 'arm64-v8a' ].includes(normalized)) { return 'arm64'; }
      if (normalized === 'armeabi-v7a') { return 'arm32'; }
      return normalized;
   }

   function canonicalArch(os, family, rawArch) {
      const group = archClass(rawArch);
      if (group === 'x86-64') {
         if (os === 'windows') { return 'x64'; }
         if (os === 'android') { return 'x86_64'; }
         if (os === 'mac') { return 'x86_64'; }
         if (os === 'gnulinux' && family === 'appimage') { return 'x86_64'; }
         if (os === 'gnulinux' && family === 'deb') { return 'amd64'; }
         if (os === 'ios') { return 'x86_64'; }
      }
      if (group === 'arm64e' && os === 'ios') { return 'arm64e'; }
      if (group === 'arm64') {
         if (os === 'windows') { return 'arm64'; }
         if (os === 'android') { return 'arm64-v8a'; }
         if (os === 'mac') { return 'arm64'; }
         if (os === 'gnulinux' && family === 'appimage') { return 'aarch64'; }
         if (os === 'gnulinux' && family === 'deb') { return 'arm64'; }
         if (os === 'ios') { return 'arm64'; }
      }
      if (group === 'arm32' && os === 'android') { return 'armeabi-v7a'; }
      return String(rawArch || '').toLowerCase();
   }

   function shortcutLabel(os, arch, family) {
      const group = archClass(arch);
      if (os === 'ios' && group === 'arm64e') { return 'newer iPhone/iPad'; }
      if (os === 'ios' && group === 'arm64') { return 'older iPhone/iPad'; }
      if (os === 'mac' && group === 'arm64') { return 'newer M Series'; }
      if (os === 'mac' && group === 'x86-64') { return 'older Intel'; }
      if (os === 'gnulinux' && family === 'deb' && group === 'x86-64') { return 'Debian or Ubuntu Intel/AMD 64'; }
      if (os === 'gnulinux' && family === 'deb' && group === 'arm64') { return 'Debian or Ubuntu ARM 64'; }
      if (group === 'x86-64') { return 'Intel/AMD 64'; }
      if (group === 'arm64') { return 'ARM 64'; }
      if (group === 'arm32') { return 'ARM 32'; }
      return arch || 'Download';
   }

   function makeAliasItem(source, alias, os, arch, family) {
      return {
         ...source,
         txt: alias,
         download: alias,
         synthetic: true,
         shortcutLabel: shortcutLabel(os, arch, family),
         shortcutOmitFor: os === 'mac' || (os === 'gnulinux' && family === 'deb'),
         sourceName: source.txt
      };
   }

   const X86_64_SOURCE = '(?:x86_64|x64|amd64)';
   const ARM64_SOURCE = '(?:aarch64|aarch64-v8|aarch64-v8a|arm64|arm64-v8|arm64-v8a)';

   function versionedInstallerInfo(item, os) {
      let match;
      if (os === 'windows') {
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-win-[0-9.]+-(${X86_64_SOURCE}|${ARM64_SOURCE})\\.exe$`, 'i'));
         return match ? { family: 'exe', arch: canonicalArch(os, 'exe', match[1]) } : null;
      }
      if (os === 'android') {
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-andr-[0-9.]+-(${X86_64_SOURCE}|${ARM64_SOURCE}|armeabi-v7a)\\.apk$`, 'i'));
         return match ? { family: 'apk', arch: canonicalArch(os, 'apk', match[1]) } : null;
      }
      if (os === 'mac') {
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-mac-[0-9.]+-(${X86_64_SOURCE}|${ARM64_SOURCE})\\.dmg$`, 'i'));
         return match ? { family: 'dmg', arch: canonicalArch(os, 'dmg', match[1]) } : null;
      }
      if (os === 'gnulinux') {
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-gnu-[0-9.]+-(${X86_64_SOURCE}|${ARM64_SOURCE})\\.AppImage$`, 'i'));
         if (match) { return { family: 'appimage', arch: canonicalArch(os, 'appimage', match[1]) }; }
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-gnu-[0-9.]+-(${X86_64_SOURCE}|${ARM64_SOURCE})\\.deb$`, 'i'));
         return match ? { family: 'deb', arch: canonicalArch(os, 'deb', match[1]) } : null;
      }
      if (os === 'ios') {
         match = item.txt.match(new RegExp(`^PrivacySafe-\\d{2}\\.\\d{2}-ios-[0-9.]+-(arm64e|${X86_64_SOURCE}|${ARM64_SOURCE})\\.ipa$`, 'i'));
         return match ? { family: 'ipa', arch: canonicalArch(os, 'ipa', match[1]) } : null;
      }
      return null;
   }

   function aliasName(channel, os, family, arch, architectureCount) {
      if (os === 'windows' && family === 'exe') {
         return architectureCount === 1 ? `PrivacySafe-${channel}.exe` : `PrivacySafe-${channel}-${arch}.exe`;
      }
      if (os === 'android' && family === 'apk') {
         return architectureCount === 1 ? `PrivacySafe-${channel}.apk` : `PrivacySafe-${channel}-${arch}.apk`;
      }
      if (os === 'mac' && family === 'dmg') { return `PrivacySafe-${channel}-${arch}.dmg`; }
      if (os === 'gnulinux' && family === 'appimage') { return `PrivacySafe-${channel}-${arch}.AppImage`; }
      if (os === 'gnulinux' && family === 'deb') { return `PrivacySafe-${channel}-${arch}.deb`; }
      if (os === 'ios' && family === 'ipa') { return `PrivacySafe-${channel}-${arch}.ipa`; }
      return '';
   }

   function installerAliases(parsedItems, channel, os) {
      if (!channel || !os) { return []; }
      const candidates = parsedItems
         .map(item => ({ item, info: versionedInstallerInfo(item, os) }))
         .filter(entry => entry.info)
         .filter(entry => !(os === 'ios' && archClass(entry.info.arch) === 'x86-64'));
      if (!candidates.length) { return []; }

      const byFamily = new Map();
      candidates.forEach(entry => {
         if (!byFamily.has(entry.info.family)) { byFamily.set(entry.info.family, []); }
         byFamily.get(entry.info.family).push(entry);
      });

      const aliases = [];
      byFamily.forEach((entries, family) => {
         const arches = [ ...new Set(entries.map(entry => entry.info.arch)) ];
         arches.forEach(arch => {
            const archEntries = entries.filter(entry => entry.info.arch === arch).map(entry => entry.item);
            const source = newest(archEntries);
            const alias = aliasName(channel, os, family, arch, arches.length);
            if (source && alias) { aliases.push(makeAliasItem(source, alias, os, arch, family)); }
         });
      });

      const priority = {
         windows: [ 'exe:x64', 'exe:arm64' ],
         android: [ 'apk:arm64-v8a', 'apk:x86_64', 'apk:armeabi-v7a' ],
         mac: [ 'dmg:arm64', 'dmg:x86_64' ],
         gnulinux: [ 'appimage:x86_64', 'deb:amd64', 'appimage:aarch64', 'deb:arm64' ],
         ios: [ 'ipa:arm64e', 'ipa:arm64' ]
      };
      const order = priority[os] || [];
      aliases.sort((a, b) => {
         const aInfo = versionedInstallerInfo({ txt: a.sourceName }, os);
         const bInfo = versionedInstallerInfo({ txt: b.sourceName }, os);
         const aKey = aInfo ? `${aInfo.family}:${aInfo.arch}` : '';
         const bKey = bInfo ? `${bInfo.family}:${bInfo.arch}` : '';
         const ai = order.indexOf(aKey);
         const bi = order.indexOf(bKey);
         return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      });
      return aliases;
   }

   function isSyntheticAliasName(name, channel, os) {
      if (!channel || !os) { return false; }
      const escaped = channel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const x86 = '(?:x86_64|x64|amd64)';
      const arm64 = '(?:aarch64|aarch64-v8|aarch64-v8a|arm64|arm64-v8|arm64-v8a)';
      const patterns = {
         windows: new RegExp(`^PrivacySafe-${escaped}(?:-(?:${x86}|${arm64}))?\\.exe$`, 'i'),
         android: new RegExp(`^PrivacySafe-${escaped}(?:-(?:${x86}|${arm64}|armeabi-v7a))?\\.apk$`, 'i'),
         mac: new RegExp(`^PrivacySafe-${escaped}-(?:${x86}|${arm64})\\.dmg$`, 'i'),
         gnulinux: new RegExp(`^PrivacySafe-${escaped}-(?:${x86}|${arm64})\\.AppImage$|^PrivacySafe-${escaped}-(?:${x86}|${arm64})\\.deb$`, 'i'),
         ios: new RegExp(`^PrivacySafe-${escaped}-(?:arm64e|${arm64}|${x86})\\.ipa$`, 'i')
      };
      return patterns[os] ? patterns[os].test(name) : false;
   }

   function createBackItem() {
      const li = document.createElement('li');
      li.className = 'back';
      const a = document.createElement('a');
      a.href = location.pathname === '/' ? 'https://privacysafe.app/' : '../';
      a.setAttribute('aria-label', location.pathname === '/' ? 'Go to PrivacySafe home' : 'Go to parent directory');
      a.innerHTML = '<svg class="svg-icon" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26.676 26.676"><path d="M26.105 21.891a.568.568 0 0 1-.529-.346c-.066-.156-1.716-3.857-7.885-4.59-1.285-.156-2.824-.236-4.693-.25v4.613a.574.574 0 0 1-.304.508.577.577 0 0 1-.588-.033L.254 13.815a.573.573 0 0 1 0-.953l11.857-7.979a.563.563 0 0 1 .588-.029c.19.102.303.295.303.502v4.293c2.578.336 13.674 2.33 13.674 11.674a.574.574 0 0 1-.459.562c-.037.006-.076.006-.112.006z"/></svg>';
      const text = document.createElement('span');
      text.className = 'back-label';
      text.textContent = location.pathname === '/' ? 'PrivacySafe home' : 'Up one level';
      a.appendChild(text);
      li.appendChild(a);
      return li;
   }

   function normalizeSha256(value) {
      const match = String(value || '').match(/\b[a-f0-9]{64}\b/i);
      return match ? match[0].toLowerCase() : '';
   }

   function checksumFromRecord(record, filename) {
      if (!record || typeof record !== 'object') { return ''; }
      const recordName = record.filename || record.file || record.name || record.path || record.artifact || '';
      if (recordName && String(recordName).split('/').pop() !== filename) { return ''; }
      return normalizeSha256(record.sha256_in_hex || record.sha256 || record.sha256sum || record.checksum || record.hash || record.digest || '');
   }

   function findChecksum(data, filename, seen = new Set()) {
      if (data == null) { return ''; }

      if (typeof data === 'string') {
         const hash = normalizeSha256(data);
         if (!hash) { return ''; }

         // Traditional sha256sum-style lines and strings that include the filename.
         const basename = filename.split('/').pop();
         const lines = data.split(/\r?\n/);
         for (const line of lines) {
            if (line.includes(basename) && normalizeSha256(line)) {
               return normalizeSha256(line);
            }
         }
         return '';
      }

      if (typeof data !== 'object') { return ''; }
      if (seen.has(data)) { return ''; }
      seen.add(data);

      // Common record form: { filename|file|name|path, sha256|checksum|hash|digest }.
      const recordHash = checksumFromRecord(data, filename);
      if (recordHash) { return recordHash; }

      if (Array.isArray(data)) {
         for (const value of data) {
            const hash = findChecksum(value, filename, seen);
            if (hash) { return hash; }
         }
         return '';
      }

      // Common map form: { "filename.ext": "<sha256>" } or a nested object.
      for (const [key, value] of Object.entries(data)) {
         if (key.split('/').pop() === filename) {
            const hash = normalizeSha256(value) || findChecksum(value, filename, seen);
            if (hash) { return hash; }
         }
      }

      // Some checksum generators put the filename in one nested field and the
      // digest several levels deeper. If this object mentions the target file,
      // accept the first SHA-256 found anywhere beneath the same record.
      const mentionsTarget = Object.values(data).some(value =>
         typeof value === 'string' && value.split('/').pop() === filename
      );
      if (mentionsTarget) {
         const stack = Object.values(data);
         while (stack.length) {
            const value = stack.shift();
            if (typeof value === 'string') {
               const hash = normalizeSha256(value);
               if (hash) { return hash; }
            } else if (value && typeof value === 'object') {
               stack.push(...Object.values(value));
            }
         }
      }

      // Finally recurse through arbitrary wrapper objects so formats such as
      // { results: { checksums: [...] } } work without knowing the wrapper name.
      for (const value of Object.values(data)) {
         const hash = findChecksum(value, filename, seen);
         if (hash) { return hash; }
      }
      return '';
   }

   async function addQuickDownloadChecksums(shell, aliases) {
      if (!shell || !aliases.length) { return; }
      try {
         const response = await fetch(new URL('checksums.json', location.href), {
            credentials: 'same-origin',
            cache: 'no-cache'
         });
         if (!response.ok) { console.warn(`PrivacySafe: checksums.json returned HTTP ${response.status}`); return; }

         const text = await response.text();
         let data = text;
         try { data = JSON.parse(text); } catch (_) { /* tolerate sha256sum-style text */ }

         aliases.forEach(alias => {
            const hash = findChecksum(data, alias.sourceName);
            if (!hash) { console.warn(`PrivacySafe: no SHA256 found for ${alias.sourceName}`); return; }
            const row = shell.querySelector(`li.shortcut[data-source="${CSS.escape(alias.sourceName)}"]`);
            const target = row && row.querySelector('.quick-checksum');
            if (target) {
               target.textContent = `SHA256: ${hash}`;
               target.hidden = false;
            }
         });
      } catch (error) {
         // A missing or malformed checksum file must never block the download list.
         console.warn('PrivacySafe: unable to load checksums.json', error);
      }
   }

   const OS_ICON_CLASS = {
      android: 'android', windows: 'windows', mac: 'apple', gnulinux: 'linux', ios: 'apple'
   };

   function createOSIcon(os, extraClass = '') {
      const iconName = OS_ICON_CLASS[os];
      if (!iconName) { return null; }
      const icon = document.createElement('span');
      icon.className = `os-icon os-icon-${iconName}${extraClass ? ` ${extraClass}` : ''}`;
      icon.setAttribute('aria-hidden', 'true');
      return icon;
   }

   function createListItem(item, shortcutOrdinal = 0) {
      const li = document.createElement('li');
      if (item.synthetic) {
         li.classList.add('shortcut');
         if (shortcutOrdinal > 0 && shortcutOrdinal % 2 === 0) {
            li.classList.add('shortcut-even');
         }
         li.dataset.source = item.sourceName;
      }

      const a = document.createElement('a');
      a.href = item.href;
      if (item.synthetic && item.shortcutLabel) {
         a.append(document.createTextNode(item.txt));
         const label = document.createElement('span');
         label.className = 'shortcut-label';
         label.textContent = `\u00A0\u00A0\u00A0(${item.shortcutOmitFor ? '' : 'for '}${item.shortcutLabel})`;
         a.appendChild(label);
      } else {
         const osIcon = item.osIcon ? createOSIcon(item.osIcon) : null;
         if (osIcon) { a.appendChild(osIcon); }
         a.append(document.createTextNode(item.displayText || item.txt));
      }
      if (item.download) {
         a.setAttribute('download', item.download);
         a.setAttribute('aria-label', `Download ${item.txt}${item.shortcutLabel ? ` for ${item.shortcutLabel}` : ''}`);
      }

      const date = document.createElement('div');
      date.className = 'date';
      date.textContent = item.date || '';

      const size = document.createElement('div');
      size.className = 'size';
      size.textContent = item.size || '';

      li.append(date, a, size);
      if (item.synthetic) {
         const checksum = document.createElement('div');
         checksum.className = 'quick-checksum';
         checksum.hidden = true;
         checksum.setAttribute('aria-label', `SHA256 checksum for ${item.txt}`);
         li.appendChild(checksum);
      }
      return li;
   }

   function createHeading(text) {
      const li = document.createElement('li');
      li.className = 'list-heading';
      const h2 = document.createElement('h2');
      h2.textContent = text;
      li.appendChild(h2);
      return li;
   }

   function renderList(nginxList, sections) {
      const shell = document.createElement('div');
      shell.className = 'listing-shell';
      shell.setAttribute('aria-label', 'Download directory');

      const ul = document.createElement('ul');
      ul.className = 'nginx-list';
      ul.appendChild(createBackItem());
      sections.forEach(section => {
         if (section.heading) { ul.appendChild(createHeading(section.heading)); }
         let shortcutOrdinal = 0;
         section.items.forEach(item => {
            if (item.synthetic) { shortcutOrdinal += 1; }
            ul.appendChild(createListItem(item, item.synthetic ? shortcutOrdinal : 0));
         });
      });
      shell.appendChild(ul);
      nginxList.replaceWith(shell);
      return shell;
   }

   function insertHeader() {
      if (document.querySelector('.site-header')) { return; }
      const header = document.createElement('header');
      header.className = 'site-header';
      header.setAttribute('aria-label', 'PrivacySafe');

      const link = document.createElement('a');
      link.href = 'https://privacysafe.app/';
      link.className = 'brand-home-link';
      link.setAttribute('aria-label', 'PrivacySafe home');

      const img = document.createElement('img');
      img.src = '/privacysafe-index/privacysafe_logo.svg';
      img.alt = 'PrivacySafe';
      img.className = 'brand-logo';
      img.width = 245;
      img.height = 60;

      link.appendChild(img);
      header.appendChild(link);
      document.body.insertBefore(header, document.body.firstChild);
   }

   function ensurePageAssets() {
      if (!document.head.querySelector('link[data-privacysafe-autoindex-css]')) {
         const css = document.createElement('link');
         css.rel = 'stylesheet';
         css.href = '/privacysafe-index/autoindex.css';
         css.dataset.privacysafeAutoindexCss = 'true';
         document.head.appendChild(css);
      }
      if (!document.head.querySelector('script[data-domain="download.privacysafe.app"]')) {
         const metrics = document.createElement('script');
         metrics.defer = true;
         metrics.dataset.domain = 'download.privacysafe.app';
         metrics.src = 'https://privacysafe.click/js/script.js';
         document.head.appendChild(metrics);
      }
   }

   function upsertMeta(selector, attrs) {
      let el = document.head.querySelector(selector);
      if (!el) {
         el = document.createElement('meta');
         document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
   }

   function upsertLink(selector, attrs) {
      let el = document.head.querySelector(selector);
      if (!el) {
         el = document.createElement('link');
         document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
   }

   function addMetadata() {
      const channel = currentChannel();
      const os = currentOS();
      const label = [ channel, os ].filter(Boolean).join(' ');
      document.title = label ? `PrivacySafe Downloads - ${label}` : 'PrivacySafe Downloads';

      const description = 'Official PrivacySafe software downloads for Android, Windows, Mac OS, GNU/Linux, and Apple iOS. PrivacySafe provides encrypted chat, peer-to-peer calls, and encrypted storage. Free/Libre and Open Source Software published by Ivy Cyber LLC.';
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
      upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' });
      upsertMeta('meta[name="author"]', { name: 'author', content: 'Ivy Cyber LLC' });
      upsertMeta('meta[name="publisher"]', { name: 'publisher', content: 'Ivy Cyber LLC' });
      upsertMeta('meta[name="copyright"]', { name: 'copyright', content: 'Website and original site materials licensed AGPL-3.0-or-later.' });
      upsertMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#1A1916' });
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: document.title });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
      upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: location.href.split(/[?#]/)[0] });
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: 'https://download.privacysafe.app/privacysafe-index/social-preview.jpg' });
      upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1485' });
      upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '809' });
      upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'PrivacySafe private communication and storage application' });
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
      upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: document.title });
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: 'https://download.privacysafe.app/privacysafe-index/social-preview.jpg' });
      upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: 'PrivacySafe private communication and storage application' });
      upsertLink('link[rel="canonical"]', { rel: 'canonical', href: location.href.split(/[?#]/)[0] });
      upsertLink('link[rel="icon"][sizes="any"]', { rel: 'icon', sizes: 'any', href: '/privacysafe-index/favicon.ico' });
      upsertLink('link[rel="icon"][type="image/png"]', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/privacysafe-index/favicon.png' });
      upsertLink('link[rel="license"]', { rel: 'license', href: 'https://www.gnu.org/licenses/agpl-3.0.html' });
      upsertLink('link[rel="jslicense"]', { rel: 'jslicense', href: 'https://privacysafe.app/weblabels.html' });
      upsertLink('link[rel="alternate"][type="text/markdown"]', { rel: 'alternate', type: 'text/markdown', title: 'Plain-text PrivacySafe summary for language models', href: 'https://privacysafe.app/llms.txt' });

      if (!document.head.querySelector('script[data-privacysafe-structured-data]')) {
         const data = document.createElement('script');
         data.type = 'application/ld+json';
         data.dataset.privacysafeStructuredData = 'true';
         data.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'PrivacySafe',
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Android, Windows, Mac OS, GNU/Linux, Apple iOS',
            url: 'https://privacysafe.app',
            downloadUrl: location.href.split(/[?#]/)[0],
            isAccessibleForFree: true,
            publisher: { '@type': 'Organization', name: 'Ivy Cyber LLC', url: 'https://ivycyber.com' },
            sourceOrganization: { '@type': 'Organization', name: 'PrivacySafe Foundation, Inc.', url: 'https://privacysafe.foundation' },
            license: 'https://github.com/PrivacySafe',
            description
         });
         document.head.appendChild(data);
      }
   }

   function addBundleInfo(nginxList) {
      const target = document.createElement('section');
      target.className = 'bundle-info';
      target.setAttribute('aria-live', 'polite');
      fetch(new URL(BUNDLE_INFO_FILE, location.href))
         .then(resp => resp.ok ? resp.json() : Promise.reject(new Error('not found')))
         .then(versions => {
            const h2 = document.createElement('h2');
            h2.textContent = `About ${versions.type || ''} bundle ${versions.bundleId || ''}`.trim();
            target.appendChild(h2);
            const p = document.createElement('p');
            p.textContent = `This bundle is based on ${versions.type || ''} platform version ${versions.platform || ''}.`;
            target.appendChild(p);
         })
         .catch(() => target.remove());
      nginxList.insertAdjacentElement('afterend', target);
   }

   function insertFooter() {
      if (document.querySelector('.site-footer')) { return; }
      const footer = document.createElement('footer');
      footer.className = 'site-footer';
      footer.setAttribute('aria-label', 'Site footer');
      footer.innerHTML = `
        <nav aria-label="Footer links" class="site-footer-links">
          <a href="https://privacysafe.foundation/donate" rel="noopener noreferrer" target="_blank">Donate</a>
          <a href="https://ivycyber.com/security-policy/" rel="nofollow noopener noreferrer" target="_blank">Security &amp; Bug Bounty</a>
          <a href="https://ivycyber.com/privacy-policy/" rel="nofollow noopener noreferrer" target="_blank">Privacy Policy</a>
          <a href="https://ivycyber.com/terms/" rel="nofollow noopener noreferrer" target="_blank">Terms of Service</a>
          <a href="https://github.com/PrivacySafe" rel="noopener noreferrer" target="_blank">Source Code</a>
        </nav>
        <p class="site-footer-fine">&copy; 2026 <a href="https://ivycyber.com" rel="noopener noreferrer" target="_blank">Ivy Cyber LLC</a>. This project is dedicated to ethical <a href="https://fsf.org/" rel="noopener noreferrer" target="_blank">Free/Libre and Open Source Software (FLOSS)</a>. PrivacySafe&reg; and 3NWeb&reg; are registered trademarks. PrivacySafe Foundation&trade; and Ivy Cyber&trade; are pending trademarks. <a href="https://github.com/PrivacySafe/privacysafe-download-site" rel="noopener noreferrer" target="_blank">Website Source</a> is free software licensed <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener noreferrer" target="_blank">GNU AGPL version 3 or later</a>. <a href="https://privacysafe.app/weblabels.html" rel="jslicense nofollow noopener noreferrer" target="_blank">LibreJS JavaScript Information</a>.</p>`;
      document.body.appendChild(footer);
   }

   function categorizeCurrentLocation() {
      const path = location.pathname;
      if (path === '/') { return 'main'; }
      if (CHANNELS.some(c => path.endsWith(`/${c}/`))) { return 'channel'; }
      if (CHANNELS.some(c => path.includes(`/${c}/`)) && OSES.some(os => path.endsWith(`/${os}/`))) { return 'bundle'; }
      if (path.endsWith('/bundles/')) { return 'bundles-oss'; }
      if (OSES.some(os => path.endsWith(`/bundles/${os}/`))) { return 'bundle-os-versions'; }
      if (path.endsWith('/platform/')) { return 'platform-oss'; }
      if (OSES.some(os => path.endsWith(`/platform/${os}/`))) { return 'platform-os-versions'; }
      if (path.endsWith('/3nweb-apps/')) { return 'apps'; }
      return 'other';
   }

   function sourceNginxList() {
      const source = document.getElementById('nginx-autoindex-source');
      if (!source) { return null; }
      const raw = source.textContent || '';
      const parsed = new DOMParser().parseFromString(raw, 'text/html');
      return parsed.querySelector('body > pre') || parsed.querySelector('pre');
   }

   function renderIntoPlaceholder(nginxList, sections) {
      const placeholder = document.getElementById('directory-listing');
      if (!placeholder) { return null; }

      const shell = document.createElement('div');
      shell.className = 'listing-shell';
      shell.setAttribute('aria-label', 'Download directory');

      const ul = document.createElement('ul');
      ul.className = 'nginx-list';
      ul.appendChild(createBackItem());
      sections.forEach(section => {
         if (section.heading) { ul.appendChild(createHeading(section.heading)); }
         let shortcutOrdinal = 0;
         section.items.forEach(item => {
            if (item.synthetic) { shortcutOrdinal += 1; }
            ul.appendChild(createListItem(item, item.synthetic ? shortcutOrdinal : 0));
         });
      });
      shell.appendChild(ul);
      placeholder.replaceChildren(shell);
      return shell;
   }

   function normalizedPath() {
      let path = decodeURIComponent(location.pathname || '/');
      if (!path.startsWith('/')) { path = `/${path}`; }
      if (path !== '/' && !path.endsWith('/')) { path += '/'; }
      return path;
   }

   function directoryHeading(path) {
      const channelHeadings = { '/latest/': 'Latest Builds', '/test/': 'Test Builds', '/nightly/': 'Nightly Builds' };
      if (channelHeadings[path]) { return channelHeadings[path]; }
      const osMatch = path.match(/^\/(latest|test|nightly)\/(android|windows|mac|gnulinux|ios)\/$/);
      if (osMatch) {
         const channelLabels = { latest: 'Latest', test: 'Test', nightly: 'Nightly' };
         const osLabels = { android: 'Android', windows: 'Windows', mac: 'Mac OS', gnulinux: 'GNU/Linux', ios: 'Apple iOS' };
         return `${channelLabels[osMatch[1]]} ${osLabels[osMatch[2]]} Version`;
      }
      if (path === '/') { return 'PrivacySafe Downloads'; }
      return path.replace(/^\//, '').replace(/\/$/, '') || 'PrivacySafe Downloads';
   }

   function platformNote(path) {
      if (path === '/') {
         return [
            ['Download for '],
            ['Android', '/nightly/android/'], [', '],
            ['Windows', '/nightly/windows/'], [', '],
            ['Mac OS', '/nightly/mac/'], [', and '],
            ['GNU/Linux', '/nightly/gnulinux/'], ['.']
         ];
      }
      if (/^\/(latest|test|nightly)\/android\/$/.test(path)) {
         return [
            ['Coming soon to '],
            ['Google Play', 'https://play.google.com/store/apps/details?id=app.privacysafe'], [', '],
            ['F-Droid', 'https://f-droid.org/en/packages/app.privacysafe/'], [', '],
            ['Obtainium', 'https://obtainium.imranr.dev'], [', and '],
            ['Accrescent', 'https://accrescent.app'], ['.']
         ];
      }
      if (/^\/(latest|test|nightly)\/ios\/$/.test(path)) {
         return [
            ['Coming soon to '],
            ['iOS App Store', 'https://play.google.com/store/apps/details?id=app.privacysafe'], [' and '],
            ['App Fair', 'https://appfair.net/en/apps/PrivacySafe/'], ['.']
         ];
      }
      return null;
   }

   function renderPlatformNote(path) {
      const title = document.getElementById('directory-title');
      if (!title) { return; }
      const old = document.querySelector('.platform-note');
      if (old) { old.remove(); }
      const parts = platformNote(path);
      if (!parts) { return; }
      const p = document.createElement('p');
      p.className = 'platform-note';
      parts.forEach(([label, href]) => {
         if (!href) { p.append(document.createTextNode(label)); return; }
         const a = document.createElement('a');
         a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = label;
         p.appendChild(a);
      });
      title.insertAdjacentElement('afterend', p);
   }

   function setDirectoryTitle() {
      const title = document.getElementById('directory-title');
      const path = normalizedPath();
      const text = directoryHeading(path);
      if (title) {
         title.replaceChildren();
         const os = currentOS();
         const icon = createOSIcon(os, 'heading-os-icon');
         if (icon && /^\/(latest|test|nightly)\/(android|windows|mac|gnulinux|ios)\/$/.test(path)) { title.appendChild(icon); }
         title.append(document.createTextNode(text));
      }
      renderPlatformNote(path);
      document.title = text === 'PrivacySafe Downloads' ? text : `${text} | PrivacySafe Downloads`;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) { canonical.href = location.href.split(/[?#]/)[0]; }
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) { ogUrl.content = location.href.split(/[?#]/)[0]; }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) { ogTitle.content = document.title; }
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) { twitterTitle.content = document.title; }
   }

   const rawSourceElement = document.getElementById('nginx-autoindex-source');

   const nginxList = sourceNginxList();
   if (!nginxList) {
      const placeholder = document.getElementById('directory-listing');
      if (placeholder) {
         placeholder.innerHTML = '<p class="directory-error" role="alert">The directory listing could not be loaded.</p>';
      }
      return;
   }

   setDirectoryTitle();

   let parsedItems = parseItemLines(nginxList);

   // Packaged 3NWeb applications contain an internal app/ payload directory.
   // It is implementation detail rather than a useful browsing destination, so
   // suppress it anywhere beneath /3nweb-apps/. Direct URLs remain unaffected.
   if (location.pathname.includes('/3nweb-apps/')) {
      parsedItems = parsedItems.filter(item => item.txt !== 'app/');
   }

   const channel = currentChannel();
   const os = currentOS();
   const listType = categorizeCurrentLocation();

   if (listType === 'bundle') {
      const aliases = installerAliases(parsedItems, channel, os);
      const rawItems = parsedItems.filter(item => item.txt !== BUNDLE_INFO_FILE && !isSyntheticAliasName(item.txt, channel, os));
      const sections = [];
      if (aliases.length) {
         sections.push({ heading: 'Quick downloads', items: aliases });
      }
      sections.push({ heading: aliases.length ? 'All files' : '', items: rawItems });
      const renderedList = renderIntoPlaceholder(nginxList, sections);
      if (renderedList && aliases.length) { addQuickDownloadChecksums(renderedList, aliases); }
      if (renderedList && parsedItems.some(item => item.txt === BUNDLE_INFO_FILE)) { addBundleInfo(renderedList); }
      return;
   }

   if (listType === 'channel') {
      const channelOSLabels = {
         'android/': { label: 'Android', os: 'android', order: 1 },
         'windows/': { label: 'Windows', os: 'windows', order: 2 },
         'mac/': { label: 'Mac OS', os: 'mac', order: 3 },
         'gnulinux/': { label: 'GNU/Linux', os: 'gnulinux', order: 4 },
         'ios/': { label: 'Apple iOS', os: 'ios', order: 5 }
      };
      const items = parsedItems
         .filter(item => item.txt !== BUNDLE_INFO_FILE)
         .map((item, originalOrder) => Object.prototype.hasOwnProperty.call(channelOSLabels, item.txt)
            ? { ...item, displayText: channelOSLabels[item.txt].label, osIcon: channelOSLabels[item.txt].os, osOrder: channelOSLabels[item.txt].order, originalOrder }
            : { ...item, originalOrder })
         .sort((a, b) => {
            const ao = a.osOrder || 999, bo = b.osOrder || 999;
            return ao === bo ? a.originalOrder - b.originalOrder : ao - bo;
         });
      renderIntoPlaceholder(nginxList, [{ heading: 'Choose operating system', items }]);
      return;
   }

   if (listType === 'main') {
      const channelLabels = {
         'latest/': 'Latest Builds',
         'test/': 'Test Builds',
         'nightly/': 'Nightly Builds'
      };
      const channelItems = parsedItems
         .filter(item => CHANNELS.some(c => item.txt.startsWith(c)))
         .map(item => Object.prototype.hasOwnProperty.call(channelLabels, item.txt)
            ? { ...item, displayText: channelLabels[item.txt] }
            : item);
      const otherItems = parsedItems.filter(item => !CHANNELS.some(c => item.txt.startsWith(c)) && item.txt !== 'desktop-updates/');
      const sections = [];
      if (channelItems.length) { sections.push({ heading: 'Release channels', items: channelItems }); }
      if (otherItems.length) { sections.push({ heading: 'Other downloads', items: otherItems }); }
      renderIntoPlaceholder(nginxList, sections);
      return;
   }

   renderIntoPlaceholder(nginxList, [{ heading: '', items: parsedItems }]);
}());
