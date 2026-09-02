/* Site-wide search. One overlay, shared by the home page and every lesson.
   The page tells us where the site root is with data-root on the script tag;
   the index is fetched once, on the first open. */
(function () {
  var root = (document.currentScript && document.currentScript.dataset.root) || '';
  var index = null;
  var loading = null;
  var box, input, list, status;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

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
    input.addEventListener('input', run);
  }

  function load() {
    if (loading) return loading;
    loading = fetch(root + 'assets/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { index = d; return d; })
      .catch(function () { status.textContent = 'Search index could not be loaded.'; });
    return loading;
  }

  function open() {
    if (!box) build();
    box.hidden = false;
    document.body.classList.add('searching');
    load().then(run);
    input.focus();
    input.select();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('searching');
  }

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
    if (at < 0) return entry.s;
    var from = Math.max(0, at - 60);
    var text = entry.x.slice(from, at + 100).trim();
    var out = esc((from ? '…' : '') + text + '…');
    return out.replace(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'),
                       '<mark>$1</mark>');
  }

  function run() {
    if (!index) return;
    var q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      list.innerHTML = '';
      status.textContent = 'Type two letters or more.';
      return;
    }
    var terms = q.split(/\s+/);
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], terms);
      if (s) hits.push([s, index[i]]);
    }
    hits.sort(function (a, b) { return b[0] - a[0]; });
    hits = hits.slice(0, 25);
    status.textContent = hits.length
      ? hits.length + (hits.length === 25 ? '+ matches' : ' match' + (hits.length > 1 ? 'es' : ''))
      : 'Nothing found for “' + q + '”.';
    list.innerHTML = hits.map(function (h) {
      var e = h[1];
      return '<a class="hit" href="' + root + e.h + '">' +
             '<span class="hit-course">' + esc(e.c) + '</span>' +
             '<span class="hit-title">' + esc(e.t) + '</span>' +
             '<span class="hit-snip">' + snippet(e, terms[0]) + '</span></a>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search]')) { e.preventDefault(); open(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box && !box.hidden) close();
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      open();
    }
  });
})();
