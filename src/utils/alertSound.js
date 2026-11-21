// Short two-tone beep (normal) or four-tone siren (escalation), Web Audio, no files needed.
export function playAlertSound(isEscalation = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const start = ctx.currentTime;
    const freqs = isEscalation ? [587.33, 880, 587.33, 987.77] : [523.25, 659.25];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isEscalation ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(f, start + i * 0.14);
      gain.gain.setValueAtTime(0.08, start + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, start + i * 0.14 + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + i * 0.14);
      osc.stop(start + i * 0.14 + 0.14);
    });
  } catch {
    /* audio blocked until the user interacts with the page */
  }
}
