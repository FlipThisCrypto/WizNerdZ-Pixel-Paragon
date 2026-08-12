/**
 * Reveal state machine.
 *
 * Explicit states + legal transitions, so the sequence is inspectable and
 * testable rather than a nest of setTimeout callbacks. Every phase awaits the
 * previous one; any throw routes to `error`, which still shows results if we
 * have verified NFT data.
 *
 * HARD RULE: this machine describes ANIMATION only. It never decides what the
 * buyer received. It consumes an already-verified result.
 */
(function () {
  const STATES = [
    "idle",
    "transaction",
    "spell_build",
    "consume_ui",
    "portal_open",
    "video_transition_in",
    "video_playing",
    "video_transition_out",
    "summoning",
    "legendary_interrupt",
    "portal_collapse",
    "results",
    "error",
  ];

  const LEGAL = {
    idle: ["transaction", "error"],
    transaction: ["spell_build", "error", "idle"],
    spell_build: ["consume_ui", "error"],
    consume_ui: ["portal_open", "error"],
    portal_open: ["video_transition_in", "summoning", "error"],
    video_transition_in: ["video_playing", "summoning", "error"],
    video_playing: ["video_transition_out", "summoning", "error"],
    video_transition_out: ["summoning", "error"],
    summoning: ["legendary_interrupt", "portal_collapse", "error"],
    legendary_interrupt: ["summoning", "portal_collapse", "error"],
    portal_collapse: ["results", "error"],
    results: ["idle"],
    error: ["results", "idle"],
  };

  class RevealStateMachine {
    constructor({ onChange } = {}) {
      this.state = "idle";
      this.history = [];
      this.onChange = onChange || function () {};
      this.aborted = false;
    }

    can(next) {
      return (LEGAL[this.state] || []).includes(next);
    }

    /** Transition. Illegal transitions throw — they are programming errors. */
    go(next, detail) {
      if (!STATES.includes(next)) throw new Error(`unknown state: ${next}`);
      if (!this.can(next)) {
        throw new Error(`illegal transition ${this.state} -> ${next}`);
      }
      const prev = this.state;
      this.state = next;
      this.history.push({ from: prev, to: next, at: Date.now(), detail });
      this.onChange(next, prev, detail);
      return this;
    }

    /** Force to error/idle from anywhere — used by abort paths. */
    forceTo(next, detail) {
      const prev = this.state;
      this.state = next;
      this.history.push({ from: prev, to: next, at: Date.now(), forced: true, detail });
      this.onChange(next, prev, detail);
      return this;
    }

    abort() {
      this.aborted = true;
    }

    get trace() {
      return this.history.map((h) => `${h.from}->${h.to}${h.forced ? "*" : ""}`).join(" ");
    }
  }

  window.WizNerdzRevealStateMachine = RevealStateMachine;
  window.WIZNERDZ_REVEAL_STATES = STATES;
})();
