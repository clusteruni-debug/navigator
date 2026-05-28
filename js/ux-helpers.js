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

  // emojiLabelButton helper removed (P3 review): dead code — 12 button fix 들은
  // inline HTML 로 처리됨 (aria-label + span aria-hidden=true). 후속 phase 에서
  // 필요해지면 git history 참조.

  window.destructiveConfirm = destructiveConfirm;
})();
