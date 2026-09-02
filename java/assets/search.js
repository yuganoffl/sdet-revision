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

  function score(entry, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var hit = 0;
      if (entry.t.toLowerCase().indexOf(t) > -1) hit += 12;
      if (entry.s.toLowerCase().indexOf(t) > -1) hit += 5;
      var n = entry.x.split(t).length - 1;
      if (n) hit += Math.min(n, 8);
      if (!hit) return 0;              // every word must appear somewhere
      total += hit;
    }
    return total;
  }

  function snippet(entry, term) {
    var at = entry.x.indexOf(term);
    if (at < 0) return esc(entry.s);
    var from = Math.max(0, at - 60);
    var text = entry.x.slice(from, at + 100).trim();
    var out = esc((from ? '…' : '') + text + '…');
    return out.replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'),
                       '<mark>$1</mark>');
  }

  function lookup(q) {
    var terms = q.split(/\s+/);
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], terms);
      if (s) hits.push([s, index[i]]);
    }
    hits.sort(function (a, b) { return b[0] - a[0]; });
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
             '<span class="hit-course">' + esc(e.c) + '</span>' +
             '<span class="hit-title">' + esc(e.t) + '</span>' +
             '<span class="hit-snip">' + snippet(e, r.terms[0]) + '</span></a>';
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
