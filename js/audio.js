// Sound effects (Web Audio, no audio files) and voice (browser text-to-speech).

const Sfx = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // A single note. freq can slide to `slide` over the duration.
  function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.25, at = 0, slide = null, attack = 0.01 }) {
    const c = ensure();
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Short burst of filtered noise – pops, splats, sneezes.
  function noise({ dur = 0.12, vol = 0.3, at = 0, freq = 1200, q = 1, type = 'bandpass' }) {
    const c = ensure();
    const t0 = c.currentTime + at;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    // iOS needs the first sound to happen inside a user tap.
    unlock() {
      const c = ensure();
      const b = c.createBuffer(1, 1, c.sampleRate);
      const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    },
    tap()     { tone({ freq: 600, slide: 900, dur: 0.08, type: 'triangle', vol: 0.15 }); },
    pop()     { noise({ dur: 0.08, vol: 0.35, freq: 1800, q: 0.7 }); tone({ freq: 700, slide: 200, dur: 0.12, type: 'sine', vol: 0.25 }); },
    bubble()  { tone({ freq: 300, slide: 700, dur: 0.15, type: 'sine', vol: 0.08 }); },
    correct() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.22, at: i * 0.08 })); },
    sparkle() { [1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'sine', vol: 0.10, at: i * 0.05 })); },
    // One rung of a rising sparkle per tap, so poking the silhouette on the
    // reveal screen sounds like it is getting somewhere.
    rise(step = 0) {
      const base = [392, 523, 659][Math.min(step, 2)];
      tone({ freq: base, slide: base * 1.5, dur: 0.2, type: 'triangle', vol: 0.18 });
      [2, 2.5, 3].forEach((m, i) => tone({ freq: base * m, dur: 0.1, type: 'sine', vol: 0.07, at: 0.05 + i * 0.05 }));
    },
    wrong()   { tone({ freq: 220, slide: 150, dur: 0.25, type: 'triangle', vol: 0.18 }); },
    whoosh()  { noise({ dur: 0.35, vol: 0.18, freq: 600, q: 0.5 }); },
    boing()   { tone({ freq: 160, slide: 480, dur: 0.3, type: 'sawtooth', vol: 0.10 }); },
    giggle()  { [0, 0.11, 0.22, 0.33].forEach((at, i) => tone({ freq: 700 + i * 90, slide: 500 + i * 90, dur: 0.1, type: 'triangle', vol: 0.15, at })); },
    drum()    { noise({ dur: 0.18, vol: 0.5, freq: 150, q: 1, type: 'lowpass' }); noise({ dur: 0.15, vol: 0.4, freq: 150, q: 1, type: 'lowpass', at: 0.22 }); noise({ dur: 0.2, vol: 0.5, freq: 2500, q: 0.5, at: 0.44 }); },
    sneeze()  { tone({ freq: 400, slide: 800, dur: 0.5, type: 'sine', vol: 0.12 }); noise({ dur: 0.35, vol: 0.5, freq: 900, q: 0.4, at: 0.55 }); },
    zip()     { tone({ freq: 300, slide: 2400, dur: 0.35, type: 'sawtooth', vol: 0.08 }); },
    snore()   { tone({ freq: 90, slide: 140, dur: 0.6, type: 'sawtooth', vol: 0.08 }); tone({ freq: 140, slide: 90, dur: 0.6, type: 'sawtooth', vol: 0.06, at: 0.7 }); },
    robot()   { [330, 262, 392, 330].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'square', vol: 0.07, at: i * 0.14 })); },
    knock()   { noise({ dur: 0.1, vol: 0.5, freq: 220, q: 1.5, type: 'lowpass' }); noise({ dur: 0.1, vol: 0.5, freq: 220, q: 1.5, type: 'lowpass', at: 0.18 }); },
    chime()   { [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'sine', vol: 0.12, at: i * 0.07 })); },
    rain()    { noise({ dur: 1.6, vol: 0.12, freq: 4000, q: 0.3, type: 'highpass' }); tone({ freq: 900, slide: 500, dur: 0.4, type: 'sine', vol: 0.05 }); },
    // town scenery
    owl()     { [0, 0.35].forEach(at => tone({ freq: 420, slide: 330, dur: 0.3, type: 'sine', vol: 0.14, at, attack: 0.05 })); },
    rooster() { [523, 659, 784, 659].forEach((f, i) => tone({ freq: f, slide: f * 1.05, dur: i === 3 ? 0.5 : 0.18, type: 'sawtooth', vol: 0.06, at: i * 0.2 })); },
    geyser()  { noise({ dur: 1.2, vol: 0.3, freq: 1200, q: 0.4 }); tone({ freq: 150, slide: 900, dur: 0.9, type: 'sine', vol: 0.12 }); },
    grow()    { tone({ freq: 220, slide: 880, dur: 1.6, type: 'triangle', vol: 0.10 }); [0.3, 0.7, 1.1].forEach(at => tone({ freq: 1200, slide: 1600, dur: 0.12, type: 'sine', vol: 0.06, at })); },
    ding()    { tone({ freq: 1568, dur: 0.5, type: 'sine', vol: 0.15 }); tone({ freq: 2093, dur: 0.35, type: 'sine', vol: 0.08, at: 0.02 }); },
    chirp()   { [0, 0.12, 0.3, 0.42].forEach((at, i) => tone({ freq: 2200 + (i % 2) * 400, slide: 3000, dur: 0.08, type: 'sine', vol: 0.08, at })); },
    carnival() { [523, 659, 784, 659, 523, 659, 784, 1047, 784, 659, 523, 659, 784, 659, 523].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'square', vol: 0.05, at: i * 0.19 })); [262, 330, 262, 330, 262, 330, 262, 330].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.06, at: i * 0.38 })); },
    shoot()   { tone({ freq: 2400, slide: 300, dur: 0.9, type: 'sine', vol: 0.10 }); noise({ dur: 0.6, vol: 0.06, freq: 5000, q: 0.5, type: 'highpass' }); },
    splash()  { noise({ dur: 0.4, vol: 0.3, freq: 3000, q: 0.3, type: 'highpass' }); tone({ freq: 500, slide: 900, dur: 0.2, type: 'sine', vol: 0.08 }); },
    clack()   { noise({ dur: 0.07, vol: 0.5, freq: 900, q: 1, type: 'lowpass' }); tone({ freq: 220, slide: 140, dur: 0.09, type: 'square', vol: 0.07 }); },
    click()   { noise({ dur: 0.04, vol: 0.35, freq: 2500, q: 0.8 }); tone({ freq: 1300, slide: 900, dur: 0.06, type: 'triangle', vol: 0.12 }); },
    whistle() { tone({ freq: 880, slide: 900, dur: 0.3, type: 'sine', vol: 0.14 }); tone({ freq: 1175, slide: 1200, dur: 0.55, type: 'sine', vol: 0.14, at: 0.32 }); tone({ freq: 1760, dur: 0.55, type: 'sine', vol: 0.04, at: 0.32 }); },
    crack()   { noise({ dur: 0.09, vol: 0.4, freq: 3200, q: 0.6, type: 'highpass' }); tone({ freq: 900, slide: 500, dur: 0.07, type: 'square', vol: 0.05 }); },
    shatter() { noise({ dur: 0.35, vol: 0.5, freq: 2600, q: 0.4, type: 'highpass' }); [2093, 2637, 3136, 3951].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'sine', vol: 0.08, at: 0.05 + i * 0.06 })); },
    chomp()   { noise({ dur: 0.09, vol: 0.45, freq: 500, q: 1, type: 'lowpass' }); noise({ dur: 0.09, vol: 0.4, freq: 400, q: 1, type: 'lowpass', at: 0.13 }); tone({ freq: 180, slide: 120, dur: 0.12, type: 'triangle', vol: 0.12 }); },
    spit()    { tone({ freq: 260, slide: 90, dur: 0.35, type: 'sawtooth', vol: 0.12 }); noise({ dur: 0.3, vol: 0.35, freq: 1400, q: 0.5, at: 0.05 }); },
    chug()    { for (let i = 0; i < 10; i++) noise({ dur: 0.1, vol: 0.22, freq: 260, q: 0.8, type: 'lowpass', at: i * (0.26 - i * 0.012) }); },
    // farm and park
    quack()   { [0, 0.22].forEach(at => { tone({ freq: 540, slide: 360, dur: 0.16, type: 'sawtooth', vol: 0.09, at }); noise({ dur: 0.1, vol: 0.12, freq: 1400, q: 2, at }); }); },
    ribbit()  { tone({ freq: 150, slide: 95, dur: 0.22, type: 'square', vol: 0.07 }); tone({ freq: 190, slide: 120, dur: 0.22, type: 'square', vol: 0.07, at: 0.28 }); },
    moo()     { tone({ freq: 175, slide: 125, dur: 1.1, type: 'sawtooth', vol: 0.11, attack: 0.18 }); tone({ freq: 350, slide: 250, dur: 1.1, type: 'triangle', vol: 0.05, attack: 0.18 }); },
    munch()   { [0, 0.15].forEach(at => { noise({ dur: 0.07, vol: 0.4, freq: 800, q: 1, type: 'lowpass', at }); tone({ freq: 240, slide: 160, dur: 0.07, type: 'triangle', vol: 0.08, at }); }); },
    caw()     { [0, 0.3].forEach(at => tone({ freq: 950, slide: 560, dur: 0.24, type: 'sawtooth', vol: 0.07, at, attack: 0.03 })); },
    bell()    { [0, 0.3].forEach(at => { tone({ freq: 1760, dur: 0.5, type: 'sine', vol: 0.14, at }); tone({ freq: 2637, dur: 0.3, type: 'sine', vol: 0.05, at }); }); },
    puff()    { noise({ dur: 0.14, vol: 0.18, freq: 320, q: 0.8, type: 'lowpass' }); },
    whee()    { tone({ freq: 420, slide: 1500, dur: 0.55, type: 'sine', vol: 0.12 }); tone({ freq: 1500, slide: 520, dur: 0.6, type: 'sine', vol: 0.12, at: 0.58 }); },
    beep()    { tone({ freq: 880, dur: 0.16, type: 'square', vol: 0.07 }); },
    blast()   { noise({ dur: 2.4, vol: 0.5, freq: 220, q: 0.6, type: 'lowpass' }); noise({ dur: 2.0, vol: 0.12, freq: 3000, q: 0.4, type: 'highpass', at: 0.1 }); tone({ freq: 55, slide: 420, dur: 2.4, type: 'sawtooth', vol: 0.1, attack: 0.2 }); },
    jingle()  { [784, 659, 784, 659, 880, 784, 659, 523, 587, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.09, at: i * 0.2 })); [392, 330, 262, 330].forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'sine', vol: 0.06, at: i * 0.55 })); },
    baa()     { for (let i = 0; i < 6; i++) tone({ freq: i % 2 ? 300 : 345, slide: i % 2 ? 320 : 330, dur: 0.11, type: 'sawtooth', vol: 0.07, at: i * 0.09, attack: 0.02 }); },
    cluck()   { [0, 0.16, 0.32, 0.62].forEach((at, i) => { tone({ freq: i === 3 ? 720 : 520, slide: i === 3 ? 400 : 640, dur: i === 3 ? 0.3 : 0.09, type: 'square', vol: 0.05, at }); noise({ dur: 0.06, vol: 0.12, freq: 1800, q: 1.5, at }); }); },
    honk()    { tone({ freq: 392, dur: 0.22, type: 'square', vol: 0.07 }); tone({ freq: 494, dur: 0.22, type: 'square', vol: 0.05 }); tone({ freq: 330, dur: 0.4, type: 'square', vol: 0.07, at: 0.26 }); tone({ freq: 415, dur: 0.4, type: 'square', vol: 0.05, at: 0.26 }); },
    oink()    { [0, 0.28].forEach(at => { tone({ freq: 260, slide: 170, dur: 0.16, type: 'sawtooth', vol: 0.1, at, attack: 0.02 }); noise({ dur: 0.12, vol: 0.18, freq: 700, q: 2, at: at + 0.02 }); }); },
    meow()    { tone({ freq: 620, slide: 980, dur: 0.22, type: 'triangle', vol: 0.09, attack: 0.03 }); tone({ freq: 980, slide: 500, dur: 0.4, type: 'triangle', vol: 0.09, at: 0.22 }); },
    fanfare() {
      [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: i === 7 ? 0.6 : 0.16, type: 'triangle', vol: 0.22, at: i * 0.13 }));
      [262, 330, 392, 523].forEach((f, i) => tone({ freq: f, dur: 0.7, type: 'sine', vol: 0.10, at: 0.9 + i * 0.02 }));
    },
  };
})();

const Voice = (() => {
  let voice = null;
  let ready = false;
  const synth = window.speechSynthesis;
  let clip = null; // shared <audio> element for recorded clips

  function pick() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    const score = v => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      let s = 0;
      if (l === 'en-au') s += 100; else if (l === 'en-gb') s += 50; else if (l.startsWith('en')) s += 20;
      if (/karen|catherine|natural|premium|enhanced/i.test(v.name)) s += 5;
      if (/google/i.test(v.name)) s += 2;
      return s;
    };
    voice = voices.slice().sort((a, b) => score(b) - score(a))[0];
    ready = true;
  }

  function speak(text, rate, pitch) {
    if (!synth) return;
    if (!ready) pick();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-AU';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    synth.speak(u);
  }

  return {
    init() {
      if (!clip) clip = new Audio();
      // Play (then immediately pause) inside the user gesture so later
      // clips are allowed to autoplay on iOS.
      clip.play().catch(() => {}); clip.pause();
      if (!synth) return;
      pick();
      synth.onvoiceschanged = pick;
      // Warm up inside the user gesture so later speech is allowed on iOS.
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    },
    // Speak a line, interrupting anything already being said. Plays the
    // recorded clip for `key` when one exists, else falls back to the
    // browser's text-to-speech for `text`.
    say(text, { rate = 0.9, pitch = 1.1, key = null } = {}) {
      const src = key && (window.VOICE_MANIFEST || {})[key];
      if (src) {
        if (synth) synth.cancel();
        if (!clip) clip = new Audio();
        clip.pause();
        // If the clip is missing or fails to load (404, bad file), fall back
        // to text-to-speech rather than saying nothing at all.
        clip.onerror = () => { if (clip.src.endsWith(src)) speak(text, rate, pitch); };
        clip.src = src;
        clip.currentTime = 0;
        clip.play().catch(() => {});
        return;
      }
      speak(text, rate, pitch);
    },
    stop() { if (synth) synth.cancel(); if (clip) clip.pause(); },
    voiceName() { return voice ? `${voice.name} (${voice.lang})` : 'no voice found'; },
  };
})();
