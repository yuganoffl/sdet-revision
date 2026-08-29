/* Reusable quiz widget for TestNG lessons.
 *
 * Markup contract:
 *
 *   <div class="quiz" data-answer="2"
 *        data-ok="Shown when they pick correctly."
 *        data-no="Shown when they pick wrong. Explain WHY, don't just say no.">
 *     <p class="q">Question text. May contain a <pre> block.</p>
 *     <button class="opt">First option</button>
 *     <button class="opt">Second option</button>
 *     <button class="opt">Third option</button>
 *   </div>
 *
 * data-answer is 1-based so it reads the way you'd say it out loud.
 * Every quiz is one-shot: the first click locks the answer. That is
 * deliberate. Retrying until green is recognition, not retrieval, and
 * recognition does not build storage strength.
 *
 * If a .quiz-score element exists, it tallies results as they come in.
 */
(function () {
  var total = 0;
  var correct = 0;
  var answered = 0;

  function paintScore() {
    var el = document.querySelector('.quiz-score');
    if (!el) return;
    if (answered === 0) {
      el.textContent = total + ' question' + (total === 1 ? '' : 's') + ' below. Answer from memory before scrolling back.';
      return;
    }
    el.textContent = correct + ' of ' + answered + ' answered correctly' +
      (answered < total ? ' (' + (total - answered) + ' to go).' : '.');
  }

  function wire(quiz) {
    var answer = parseInt(quiz.getAttribute('data-answer'), 10);
    var opts = Array.prototype.slice.call(quiz.querySelectorAll('button.opt'));
    var verdict = document.createElement('div');
    verdict.className = 'verdict';
    quiz.appendChild(verdict);
    total++;

    opts.forEach(function (opt, i) {
      opt.type = 'button';
      opt.addEventListener('click', function () {
        var picked = i + 1;
        var right = picked === answer;

        opts.forEach(function (o, j) {
          o.disabled = true;
          if (j + 1 === answer) o.classList.add('right');
          else if (j === i) o.classList.add('wrong');
        });

        verdict.className = 'verdict show ' + (right ? 'ok' : 'no');
        verdict.innerHTML = '<b>' + (right ? 'Correct.' : 'Not quite.') + '</b>' +
          (right ? quiz.getAttribute('data-ok') : quiz.getAttribute('data-no'));

        answered++;
        if (right) correct++;
        paintScore();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.quiz'), wire);
    paintScore();
  });
})();
