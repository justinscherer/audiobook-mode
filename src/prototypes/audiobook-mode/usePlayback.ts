import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'

import { buildStops, chapters, type Stop } from './earthAudio'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused'

export const SPEEDS = [0.5, 1, 1.25, 1.5]

const totalDuration = chapters.reduce((sum, c) => sum + c.duration, 0)
const chapterOffsets = chapters.map((_, i) =>
  chapters.slice(0, i).reduce((sum, c) => sum + c.duration, 0),
)

export function usePlayback() {
  const status = ref<PlaybackStatus>('idle')
  const rate = ref(1)
  const chapter = ref(0)
  const time = ref(0)
  const stops = shallowRef<Stop[]>([])

  let audio: HTMLAudioElement | null = null
  let root: HTMLElement | null = null

  const active = computed(() => status.value !== 'idle')
  const progress = computed(() =>
    totalDuration ? Math.min(1, (chapterOffsets[chapter.value] + time.value) / totalDuration) : 0,
  )

  function ensureAudio(): HTMLAudioElement {
    if (audio) return audio
    const a = new Audio()
    a.preload = 'auto'
    a.addEventListener('timeupdate', () => {
      time.value = a.currentTime
    })
    a.addEventListener('waiting', () => {
      if (status.value === 'playing') status.value = 'loading'
    })
    a.addEventListener('playing', () => {
      status.value = 'playing'
    })
    a.addEventListener('ended', () => {
      if (chapter.value + 1 < chapters.length) playFrom(chapter.value + 1, 0)
      else stop()
    })
    audio = a
    return a
  }

  /** Must run inside the user's click so the browser allows `play()`. */
  function playFrom(chapterIdx: number, seconds: number) {
    const a = ensureAudio()
    status.value = 'loading'
    if (chapterIdx !== chapter.value || !a.src) {
      chapter.value = chapterIdx
      a.src = chapters[chapterIdx].url
      if (seconds > 0) {
        a.addEventListener('loadedmetadata', () => (a.currentTime = seconds), { once: true })
      }
    } else {
      a.currentTime = seconds
    }
    time.value = seconds
    a.defaultPlaybackRate = rate.value
    a.playbackRate = rate.value
    a.play().catch(() => {
      if (status.value === 'loading') status.value = 'paused'
    })
  }

  function setRoot(el: HTMLElement) {
    root = el
    stops.value = []
  }

  /** Built lazily so a fresh article render (e.g. returning to it mid-playback) is picked up. */
  function ensureStops() {
    if (root && !stops.value.length) stops.value = buildStops(root)
  }

  function start() {
    ensureStops()
    chapter.value = 0
    if (audio) audio.removeAttribute('src')
    playFrom(0, 0)
  }

  function pause() {
    audio?.pause()
    status.value = 'paused'
  }

  function resume() {
    if (!audio) return
    status.value = 'loading'
    audio.play().catch(() => (status.value = 'paused'))
  }

  function togglePlay() {
    if (status.value === 'paused') resume()
    else if (status.value !== 'idle') pause()
  }

  function stop() {
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    status.value = 'idle'
    chapter.value = 0
    time.value = 0
  }

  function currentStopIndex(): number {
    let idx = -1
    stops.value.forEach((s, i) => {
      if (
        s.chapter < chapter.value ||
        (s.chapter === chapter.value && s.time <= time.value + 0.25)
      ) {
        idx = i
      }
    })
    return idx
  }

  function revealStop(stop: Stop) {
    const body = stop.el.closest('.protowiki-mobile-section-body--collapsed')
    const heading = body?.previousElementSibling as HTMLElement | null
    heading?.click()
    stop.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function skipTo(index: number) {
    const target = stops.value[index]
    if (!target) return
    playFrom(target.chapter, target.time)
    revealStop(target)
  }

  function next() {
    ensureStops()
    const i = currentStopIndex()
    if (i + 1 < stops.value.length) skipTo(i + 1)
    else if (chapter.value + 1 < chapters.length) playFrom(chapter.value + 1, 0)
  }

  function previous() {
    ensureStops()
    skipTo(Math.max(0, currentStopIndex() - 1))
  }

  function setRate(value: number) {
    rate.value = value
    if (audio) {
      audio.defaultPlaybackRate = value
      audio.playbackRate = value
    }
  }

  onBeforeUnmount(stop)

  return {
    status,
    active,
    rate,
    progress,
    setRoot,
    start,
    stop,
    togglePlay,
    next,
    previous,
    setRate,
  }
}
