/* Site-wide search.

   Two front ends, one engine. The home page has a real input in the page and
   filters in place: tapping a search bar should put the cursor in that bar.
   Lesson pages have no room for a permanent bar, so their top-bar button opens
   an overlay that carries its own input.

   The page tells us where the site root is with data-root on the script tag.
   The index is fetched once, the first time anyone actually searches. */
(function () {
  var me = document.currentScript;
  var root = (me && me.dataset.root) || '';
  var ver = (me && me.src.split('v=')[1]) || '';   // same cache key as the css
  var index = null;
  var loading = null;

  /* "reverse the number" means reverse + number. Scoring or highlighting "the"
     rewards long pages for saying nothing and paints the snippet orange. */
  var STOP = {};
  ('the a an of in on to and or for is it as at by with be been are was were ' +
   'this that these those from but not into its has have had there then than ' +
   'how do does did i you your we my me what why when where which who can ' +
   'could should would will they them so if').split(' ')
    .forEach(function (w) { STOP[w] = 1; });

  function meaningful(terms) {
    var kept = terms.filter(function (t) { return !STOP[t]; });
    return kept.length ? kept : terms;      // a search for "the" still works
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function load() {
    if (loading) return loading;
    loading = fetch(root + 'assets/search-index.json?v=' + ver)
      .then(function (r) { return r.json(); })
      .then(function (d) { index = d; return d; })
      .catch(function () { index = []; });
    return loading;
  }

  // ---- engine ----

  function score(entry, q, terms) {
    var title = entry.t.toLowerCase();
    // A whole-phrase hit beats three scattered words.
    var total = title === q ? 200 : title.indexOf(q) > -1 ? 90
              : entry.x.indexOf(q) > -1 ? 25 : 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var hit = 0;
      if (title.indexOf(t) > -1) hit += 14;
      // The lesson a section sits in says a lot: "Taking one" under
      // "Lesson 8 - Screenshots" is about screenshots.
      if (entry.p && entry.p.toLowerCase().indexOf(t) > -1) hit += 7;
      if (entry.s.toLowerCase().indexOf(t) > -1) hit += 5;
      var n = entry.x.split(t).length - 1;
      if (n) hit += Math.min(n, 4);       // a long page saying it often is not a better answer
      if (!hit) return 0;              // every word must appear somewhere
      total += hit;
    }
    return total;
  }

  function rx(term) {
    return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
  }

  /* Show the passage where the match actually is, and mark every word of the
     query in it, not just the first one. */
  function snippet(entry, q, terms) {
    var at = entry.x.indexOf(q);          // the whole phrase, if it is there
    if (at < 0) {
      at = -1;
      for (var i = 0; i < terms.length; i++) {   // else the longest word that is
        var sorted = terms.slice().sort(function (a, b) { return b.length - a.length; });
        var found = entry.x.indexOf(sorted[i]);
        if (found > -1) { at = found; break; }
      }
    }
    if (at < 0) return esc(entry.s);
    var from = Math.max(0, at - 60);
    var out = esc((from ? '…' : '') + entry.x.slice(from, at + 120).trim() + '…');
    terms.forEach(function (term) {
      out = out.replace(rx(term), '<mark>$&</mark>');
    });
    return out;
  }

  function lookup(q) {
    var terms = meaningful(q.split(/\s+/));
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], q, terms);
      if (s) hits.push([s, index[i]]);
    }
    hits.sort(function (a, b) { return b[0] - a[0]; });
    var deep = {};
    hits.forEach(function (h) { if (h[1].p) deep[h[1].h.split('#')[0]] = true; });
    hits = hits.filter(function (h) { return h[1].p || !deep[h[1].h]; });
    return { terms: terms, hits: hits.slice(0, 25) };
  }

  function paint(q, statusEl, listEl) {
    if (!index) return;
    var r = lookup(q);
    statusEl.textContent = r.hits.length
      ? r.hits.length + (r.hits.length === 25 ? '+ matches' : ' match' + (r.hits.length > 1 ? 'es' : ''))
      : 'Nothing found for “' + q + '”';
    listEl.innerHTML = r.hits.map(function (h) {
      var e = h[1];
      return '<a class="hit" href="' + root + e.h + '">' +
             '<span class="hit-course">' + esc(e.c) +
             (e.p ? ' <span class="hit-parent">' + esc(e.p) + '</span>' : '') + '</span>' +
             '<span class="hit-title">' + esc(e.t) + '</span>' +
             '<span class="hit-snip">' + snippet(e, q, r.terms) + '</span></a>';
    }).join('');
  }

  // ---- home page: filter in place ----

  var field = document.querySelector('[data-search-inline]');

  if (field) {
    var homeStatus = document.querySelector('.searchstatus');
    var homeList = document.querySelector('.searchresults');
    var clear = document.querySelector('.searchclear');
    var rest = document.querySelector('.tabs');
    var panels = document.querySelector('main');

    var showResults = function (on) {
      rest.hidden = on;
      panels.hidden = on;
      homeStatus.hidden = !on;
      homeList.hidden = !on;
      clear.hidden = !field.value;
    };

    var onType = function () {
      var q = field.value.trim().toLowerCase();
      if (q.length < 2) { showResults(false); homeList.innerHTML = ''; return; }
      showResults(true);
      homeStatus.textContent = 'Searching…';
      load().then(function () { paint(q, homeStatus, homeList); });
    };

    field.addEventListener('focus', load, { once: true });
    field.addEventListener('input', onType);
    clear.addEventListener('click', function () {
      field.value = '';
      onType();
      field.focus();
    });
    field.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && field.value) { field.value = ''; onType(); }
    });
    showResults(false);
  }

  // ---- lesson pages: overlay ----

  var box, input, list, status;

  function build() {
    box = document.createElement('div');
    box.className = 'searchwrap';
    box.hidden = true;
    box.innerHTML =
      '<div class="searchsheet" role="dialog" aria-label="Search lessons">' +
      '<div class="searchtop">' +
      '<input type="search" class="searchinput" placeholder="Search all lessons"' +
      ' autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button type="button" class="searchclose">Close</button>' +
      '</div>' +
      '<p class="searchstatus"></p>' +
      '<div class="searchresults"></div>' +
      '</div>';
    document.body.appendChild(box);
    input = box.querySelector('.searchinput');
    list = box.querySelector('.searchresults');
    status = box.querySelector('.searchstatus');
    box.querySelector('.searchclose').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        list.innerHTML = '';
        status.textContent = 'Type two letters or more';
        return;
      }
      load().then(function () { paint(q, status, list); });
    });
  }

  function open() {
    if (!box) build();
    box.hidden = false;
    document.body.classList.add('searching');
    load();
    input.focus();
    input.select();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('searching');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search]')) { e.preventDefault(); open(); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box && !box.hidden) close();
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      if (field) { field.focus(); field.select(); } else { open(); }
    }
  });
})();
