import { computed, onBeforeUnmount, reactive, ref } from 'vue'

import { chapters } from './chapters'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused'

export const SPEEDS = [0.5, 1, 1.25, 1.5]
export const SKIP_SECONDS = 30

/**
 * Plays the chapter files back to back as one continuous timeline. Nothing
 * here touches the page: skipping moves the audio only.
 */
export function usePlayback() {
  const status = ref<PlaybackStatus>('idle')
  const rate = ref(1)
  const chapter = ref(0)
  const time = ref(0)
  const durations = reactive(chapters.map((c) => c.duration))

  let audio: HTMLAudioElement | null = null

  const active = computed(() => status.value !== 'idle')
  const total = computed(() => durations.reduce((sum, d) => sum + d, 0))
  const offsetOf = (idx: number) => durations.slice(0, idx).reduce((sum, d) => sum + d, 0)
  const position = computed(() => offsetOf(chapter.value) + time.value)
  const progress = computed(() => (total.value ? Math.min(1, position.value / total.value) : 0))
  const sectionTitle = computed(() => chapters[chapter.value].title)

  function ensureAudio(): HTMLAudioElement {
    if (audio) return audio
    const a = new Audio()
    a.preload = 'auto'
    a.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(a.duration)) durations[chapter.value] = a.duration
    })
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
      if (chapter.value + 1 < chapters.length) playAt(chapter.value + 1, 0)
      else stop()
    })
    audio = a
    return a
  }

  /** Must run inside the user's click so the browser allows `play()`. */
  function playAt(chapterIdx: number, seconds: number, autoplay = true) {
    const a = ensureAudio()
    status.value = autoplay ? 'loading' : 'paused'
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
    if (!autoplay) return
    a.play().catch(() => {
      if (status.value === 'loading') status.value = 'paused'
    })
  }

  /**
   * Jumps to a point on the whole-article timeline, crossing chapter files as
   * needed. Keeps playing or stays paused, whichever it was doing.
   */
  function seekTo(seconds: number) {
    if (seconds >= total.value) {
      stop()
      return
    }
    let remaining = Math.max(0, seconds)
    let idx = 0
    while (idx < chapters.length - 1 && remaining >= durations[idx]) {
      remaining -= durations[idx]
      idx++
    }
    playAt(idx, remaining, status.value !== 'paused')
  }

  function start() {
    if (audio) audio.removeAttribute('src')
    chapter.value = 0
    playAt(0, 0)
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

  const next = () => seekTo(position.value + SKIP_SECONDS)
  const previous = () => seekTo(position.value - SKIP_SECONDS)

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
    sectionTitle,
    start,
    stop,
    togglePlay,
    next,
    previous,
    setRate,
  }
}
