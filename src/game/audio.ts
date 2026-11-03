/* 极简音效：用 Web Audio 合成，不依赖任何音频文件。
   心跳、进球、被扑、哨声都在这里。 */

let ctx: AudioContext | null = null
let muted = false

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMuted(value: boolean) {
  muted = value
}

export function isMuted() {
  return muted
}

/** 浏览器要求首次交互后才能出声 */
export function unlockAudio() {
  audio()
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.14,
  delay = 0,
  endFreq?: number,
) {
  const ac = audio()
  if (!ac || muted) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function noise(duration: number, gain = 0.1, delay = 0) {
  const ac = audio()
  if (!ac || muted) return
  const t0 = ac.currentTime + delay
  const frames = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, frames, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const g = ac.createGain()
  g.gain.value = gain
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  src.connect(filter).connect(g).connect(ac.destination)
  src.start(t0)
}

/** 关键瞬间触发：心跳 + 屏息 */
export function playTension() {
  tone(58, 0.28, 'sine', 0.22, 0)
  tone(52, 0.3, 'sine', 0.18, 0.34)
  noise(0.5, 0.045, 0.02)
}

export function playGoal() {
  tone(392, 0.16, 'triangle', 0.16, 0)
  tone(523, 0.16, 'triangle', 0.16, 0.14)
  tone(659, 0.34, 'triangle', 0.17, 0.28)
  noise(1.1, 0.16, 0.3)
}

export function playWorldie() {
  tone(330, 0.14, 'sawtooth', 0.12, 0)
  tone(494, 0.14, 'sawtooth', 0.12, 0.12)
  tone(659, 0.14, 'sawtooth', 0.13, 0.24)
  tone(988, 0.5, 'triangle', 0.16, 0.36)
  noise(1.4, 0.2, 0.4)
}

export function playMiss() {
  tone(220, 0.18, 'sine', 0.12, 0, 150)
  tone(150, 0.34, 'sine', 0.1, 0.14, 90)
}

export function playConceded() {
  tone(196, 0.22, 'square', 0.09, 0, 140)
  tone(130, 0.42, 'square', 0.08, 0.2, 80)
  noise(0.6, 0.07, 0.1)
}

export function playWhistle() {
  tone(1750, 0.12, 'square', 0.05, 0)
  tone(1850, 0.1, 'square', 0.045, 0.14)
}

export function playTrait() {
  tone(880, 0.1, 'triangle', 0.09, 0)
  tone(1320, 0.16, 'triangle', 0.08, 0.08)
}

export function playClick() {
  tone(620, 0.05, 'square', 0.04)
}

export function playFanfare() {
  const notes = [523, 659, 784, 1046]
  notes.forEach((f, i) => tone(f, 0.28, 'triangle', 0.14, i * 0.16))
  noise(1.2, 0.14, 0.5)
}
