/* Syntax highlighting for the lesson code blocks.
 *
 * No dependency and no CDN, because the lessons are opened as local files and
 * have to work with no network. Handles the two languages these courses
 * actually use, Java and XML, and deliberately leaves everything else alone.
 *
 * Console output, ASCII diagrams and shell commands are NOT highlighted.
 * Colouring those would be noise, and colouring a tree diagram as if it were
 * code makes it harder to read, not easier.
 *
 * Tokens are emitted as <span class="tok-*">; the colours live in lesson.css
 * so they follow the light and dark themes with everything else.
 */
(function () {

  var JAVA_KEYWORDS = [
    'abstract','assert','boolean','break','byte','case','catch','char','class',
    'const','continue','default','do','double','else','enum','extends','final',
    'finally','float','for','goto','if','implements','import','instanceof','int',
    'interface','long','native','new','package','private','protected','public',
    'return','short','static','strictfp','super','switch','synchronized','this',
    'throw','throws','transient','try','void','volatile','while','var','record',
    'yield','sealed','permits','true','false','null'
  ];

  var KEYWORD_SET = {};
  JAVA_KEYWORDS.forEach(function (k) { KEYWORD_SET[k] = true; });

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + escapeHtml(text) + '</span>';
  }

  /* ---------------------------------------------------------------- detect */

  function detect(text) {
    var t = text.trim();
    if (t === '') return null;

    // XML / HTML: starts with a tag or a declaration.
    if (/^<[?!\/a-zA-Z]/.test(t)) return 'xml';

    // Shell commands. Left alone on purpose.
    if (/^(mvn|npm|git|cd|ls|java|javac|open)\b/.test(t)) return null;

    // Java: needs a real structural signal, not just a stray brace. This is
    // deliberately strict so console output and diagrams fall through.
    var javaish =
      /@[A-Z]\w*/.test(t) ||                       // an annotation
      /\b(public|private|protected|class|import|package|new)\b/.test(t) ||
      /\w+\s*\([^)]*\)\s*[;{]/.test(t) ||          // a call or a signature
      /\bBy\.\w+|\bdriver\.\w+|Assert\.\w+/.test(t);

    return javaish ? 'java' : null;
  }

  /* ------------------------------------------------------------------ java */

  function highlightJava(src) {
    var out = '';
    var i = 0;
    var n = src.length;

    while (i < n) {
      var c = src[i];
      var rest = src.slice(i);
      var m;

      // Line comment
      if (c === '/' && src[i + 1] === '/') {
        m = /^\/\/[^\n]*/.exec(rest);
        out += span('comment', m[0]);
        i += m[0].length;
        continue;
      }

      // Block comment
      if (c === '/' && src[i + 1] === '*') {
        m = /^\/\*[\s\S]*?(\*\/|$)/.exec(rest);
        out += span('comment', m[0]);
        i += m[0].length;
        continue;
      }

      // String, with escapes
      if (c === '"') {
        m = /^"(\\.|[^"\\])*"?/.exec(rest);
        out += span('string', m[0]);
        i += m[0].length;
        continue;
      }

      // Char literal
      if (c === "'") {
        m = /^'(\\.|[^'\\])*'?/.exec(rest);
        out += span('string', m[0]);
        i += m[0].length;
        continue;
      }

      // Annotation
      if (c === '@') {
        m = /^@\w+/.exec(rest);
        if (m) {
          out += span('annotation', m[0]);
          i += m[0].length;
          continue;
        }
      }

      // Number
      if (/[0-9]/.test(c) && !/[\w.]/.test(src[i - 1] || '')) {
        m = /^0[xX][0-9a-fA-F_]+[lLfFdD]?|^[0-9][0-9_]*\.?[0-9_]*([eE][-+]?[0-9]+)?[lLfFdD]?/.exec(rest);
        if (m) {
          out += span('number', m[0]);
          i += m[0].length;
          continue;
        }
      }

      // Word: keyword, type, method or plain identifier
      if (/[A-Za-z_$]/.test(c)) {
        m = /^[A-Za-z_$][\w$]*/.exec(rest);
        var word = m[0];
        var after = src.slice(i + word.length);

        if (KEYWORD_SET[word]) {
          out += span('keyword', word);
        } else if (/^\s*\(/.test(after)) {
          out += span('method', word);          // called like a method
        } else if (/^[A-Z]/.test(word)) {
          out += span('type', word);            // Java convention: a type
        } else {
          out += escapeHtml(word);
        }
        i += word.length;
        continue;
      }

      out += escapeHtml(c);
      i++;
    }

    return out;
  }

  /* ------------------------------------------------------------------- xml */

  function highlightXml(src) {
    var out = '';
    var i = 0;
    var n = src.length;

    while (i < n) {
      var rest = src.slice(i);
      var m;

      // Comment
      if (rest.indexOf('<!--') === 0) {
        m = /^<!--[\s\S]*?(-->|$)/.exec(rest);
        out += span('comment', m[0]);
        i += m[0].length;
        continue;
      }

      // A tag, from < to >
      if (src[i] === '<') {
        m = /^<[^>]*>?/.exec(rest);
        out += highlightTag(m[0]);
        i += m[0].length;
        continue;
      }

      // Text between tags
      m = /^[^<]+/.exec(rest);
      out += escapeHtml(m[0]);
      i += m[0].length;
    }

    return out;
  }

  function highlightTag(tag) {
    var out = '';
    var i = 0;

    while (i < tag.length) {
      var rest = tag.slice(i);
      var m;

      // Attribute value
      if ((m = /^"[^"]*"?|^'[^']*'?/.exec(rest))) {
        out += span('string', m[0]);
        i += m[0].length;
        continue;
      }

      // Tag name, right after < or </ or <? or <!
      if ((m = /^<[?!\/]?[\w:.-]+/.exec(rest))) {
        var lead = /^<[?!\/]?/.exec(m[0])[0];
        out += span('punct', lead) + span('tag', m[0].slice(lead.length));
        i += m[0].length;
        continue;
      }

      // Attribute name
      if ((m = /^[\w:.-]+(?=\s*=)/.exec(rest))) {
        out += span('attr', m[0]);
        i += m[0].length;
        continue;
      }

      out += escapeHtml(tag[i]);
      i++;
    }

    return out;
  }

  /* ------------------------------------------------------------------ wire */

  function run() {
    var blocks = document.querySelectorAll('pre > code, pre');

    Array.prototype.forEach.call(blocks, function (el) {
      // A <pre> that holds a <code> is handled through the <code>.
      if (el.tagName === 'PRE' && el.querySelector('code')) return;
      if (el.getAttribute('data-hl') === 'done') return;
      if (el.classList.contains('no-hl')) return;

      var text = el.textContent;
      var lang = detect(text);
      if (!lang) {
        el.setAttribute('data-hl', 'skipped');
        return;
      }

      el.innerHTML = lang === 'xml' ? highlightXml(text) : highlightJava(text);
      el.setAttribute('data-hl', 'done');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
