/**
 * Plausible Metrics Script
 * 
 * Copyright (c) 2018-present Plausible Insights OÜ
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the “Software”), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * SPDX-License-Identifier: MIT
 */

(function () {
  "use strict";

  var a = window.location,
    r = window.document,
    o = r.currentScript,
    l = o.getAttribute("data-api") || new URL(o.src).origin + "/api/event";

  function s(t, e) {
    if (t) console.warn("Ignoring Event: " + t);
    if (e && e.callback) e.callback();
  }

  function t(t, e) {
    // Ignore local or file protocols
    if (
      /^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(a.hostname) ||
      a.protocol === "file:"
    )
      return s("localhost", e);

    // Ignore headless or automation environments
    if (
      (window._phantom ||
        window.__nightmare ||
        window.navigator.webdriver ||
        window.Cypress) &&
      !window.__plausible
    )
      return s(null, e);

    // Ignore if localStorage flag is set
    try {
      if (window.localStorage.plausible_ignore === "true")
        return s("localStorage flag", e);
    } catch (t) {}

    // Build the payload
    var i = {};
    i.n = t;
    i.u = a.href;
    i.d = o.getAttribute("data-domain");
    i.r = r.referrer || null;

    if (e && e.meta) i.m = JSON.stringify(e.meta);
    if (e && e.props) i.p = e.props;

    var n = new XMLHttpRequest();
    n.open("POST", l, true);
    n.setRequestHeader("Content-Type", "text/plain");
    n.send(JSON.stringify(i));

    n.onreadystatechange = function () {
      if (n.readyState === 4 && e && e.callback) {
        e.callback({ status: n.status });
      }
    };
  }

  // Process any queued plausible events
  var e = (window.plausible && window.plausible.q) || [];
  window.plausible = t;

  for (var i, n = 0; n < e.length; n++) {
    t.apply(this, e[n]);
  }

  // Handle pageviews on navigation
  function p() {
    if (i !== a.pathname) {
      i = a.pathname;
      t("pageview");
    }
  }

  var c,
    u = window.history;

  if (u.pushState) {
    c = u.pushState;
    u.pushState = function () {
      c.apply(this, arguments);
      p();
    };

    window.addEventListener("popstate", p);
  }

  if (r.visibilityState === "prerender") {
    r.addEventListener("visibilitychange", function () {
      if (!i && r.visibilityState === "visible") p();
    });
  } else {
    p();
  }
})();

