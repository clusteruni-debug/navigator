// projects/navigator/js/ux-helpers.js
// P3 UX helpers — destructive confirm (with cooldown) + emoji-label button decorator.
// Sequential script load — exposes globals: destructiveConfirm, emojiLabelButton.

(function() {
  'use strict';

  const DESTRUCTIVE_COOLDOWN_MS = 5000;
  const _confirmCooldown = new Map();

  /**
   * Wrap a destructive action with confirm() and a per-key cooldown.
   *
   * @param {string} message - confirm dialog message
   * @param {string} [cooldownKey] - optional cooldown key (e.g. "task-123").
   *   When set, subsequent confirms with the same key within 5s return true
   *   without re-prompting (per-row rapid-action UX).
   * @returns {boolean} true if user confirmed (or within cooldown), false if cancelled.
   */
  function destructiveConfirm(message, cooldownKey) {
    const now = Date.now();
    if (cooldownKey) {
      const expires = _confirmCooldown.get(cooldownKey) || 0;
      if (expires > now) return true;
    }
    const ok = window.confirm(message);
    if (ok && cooldownKey) {
      _confirmCooldown.set(cooldownKey, now + DESTRUCTIVE_COOLDOWN_MS);
      setTimeout(() => _confirmCooldown.delete(cooldownKey), DESTRUCTIVE_COOLDOWN_MS + 100);
    }
    return ok;
  }

  /**
   * Build an emoji-with-label button. Falls back to aria-label only when showLabel=false.
   *
   * @param {string} emoji - emoji or icon glyph
   * @param {string} label - accessible label
   * @param {string} onclick - inline onclick handler string
   * @param {Object} [opts]
   * @param {string} [opts.ariaLabel] - override aria-label (defaults to label)
   * @param {string} [opts.className] - button class (defaults to "work-task-action with-label")
   * @param {string} [opts.title] - tooltip (defaults to label)
   * @param {boolean} [opts.showLabel=true] - false → hide visible text, keep aria-label
   * @returns {string} HTML string
   */
  function emojiLabelButton(emoji, label, onclick, opts) {
    opts = opts || {};
    const ariaLabel = opts.ariaLabel || label || emoji;
    const className = opts.className || 'work-task-action with-label';
    const title = opts.title || label || '';
    const showLabel = opts.showLabel !== false;
    const safeAria = (typeof escapeAttr === 'function') ? escapeAttr(ariaLabel) : ariaLabel;
    const safeTitle = (typeof escapeAttr === 'function') ? escapeAttr(title) : title;
    const safeLabel = (typeof escapeHtml === 'function') ? escapeHtml(label) : label;
    return '<button class="' + className + '" type="button" onclick="' + onclick + '" ' +
      'title="' + safeTitle + '" aria-label="' + safeAria + '">' +
      '<span class="btn-emoji" aria-hidden="true">' + emoji + '</span>' +
      (showLabel ? '<span class="btn-label">' + safeLabel + '</span>' : '') +
    '</button>';
  }

  window.destructiveConfirm = destructiveConfirm;
  window.emojiLabelButton = emojiLabelButton;
})();
