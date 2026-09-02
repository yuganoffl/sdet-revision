/* Back to top. A Java page with a few programs open runs to several screens,
   and the only way home was a long thumb drag.

   The button stays out of the way until you are a screen or so down, and it
   gets out of the way completely while the search overlay is up. */
(function () {
  var SHOW_AFTER = 700;                  // px, about one phone screen

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'totop';
  btn.hidden = true;
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';

  var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  btn.addEventListener('click', function () {
    try {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);             // older Safari: no options object
    }
    btn.blur();
  });

  var ticking = false;
  function check() {
    ticking = false;
    btn.hidden = (window.pageYOffset || document.documentElement.scrollTop) < SHOW_AFTER;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(check);
  }, { passive: true });

  document.body.appendChild(btn);
  check();
})();
