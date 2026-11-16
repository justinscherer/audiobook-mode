import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

import { alignArticle } from './alignWords'
import { chapters } from './chapters'

export const HIGHLIGHT_CLASS = 'audio-word--current'

/** How far back to look for a matched word before showing no highlight. */
const LOOKBACK = 2
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

/**
 * Highlights the article word being spoken and keeps it in view. Following
 * stops as soon as the reader scrolls by hand and resumes on `follow()`.
 */
export function useWordHighlight(opts: {
  chapter: Ref<number>
  time: Ref<number>
  active: Ref<boolean>
}) {
  const following = ref(true)
  let spans: (HTMLElement | null)[][] = []
  let current: HTMLElement | null = null

  function setCurrent(el: HTMLElement | null) {
    if (el === current) return
    current?.classList.remove(HIGHLIGHT_CLASS)
    current = el
    current?.classList.add(HIGHLIGHT_CLASS)
  }

  function spokenIndex(): number {
    const words = chapters[opts.chapter.value]?.words ?? []
    let lo = 0
    let hi = words.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (words[mid].start <= opts.time.value) {
        found = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return found
  }

  function keepInView(el: HTMLElement, force = false) {
    const collapsed = el.closest('.protowiki-mobile-section-body--collapsed')
    if (collapsed) (collapsed.previousElementSibling as HTMLElement | null)?.click()
    const rect = el.getBoundingClientRect()
    const dock = document.querySelector('.transport')?.getBoundingClientRect().height ?? 0
    const bottom = window.innerHeight - dock
    const margin = 48
    if (!force && rect.top >= margin && rect.bottom <= bottom - margin) return
    window.scrollTo({ top: window.scrollY + rect.top - bottom * 0.35, behavior: 'smooth' })
  }

  function update(force = false) {
    const forChapter = spans[opts.chapter.value]
    let el: HTMLElement | null = null
    if (opts.active.value && forChapter) {
      const idx = spokenIndex()
      for (let i = idx; i >= 0 && i >= idx - LOOKBACK; i--) {
        if (forChapter[i]) {
          el = forChapter[i]
          break
        }
      }
    }
    const moved = el !== current
    setCurrent(el)
    if (el && following.value && (moved || force)) keepInView(el, force)
  }

  /** Call with the parser root of an article that has this audio. */
  function attach(root: HTMLElement) {
    spans = alignArticle(root)
    current = null
    update(true)
  }

  function detach() {
    setCurrent(null)
    spans = []
  }

  function follow() {
    following.value = true
    update(true)
  }

  watch([opts.chapter, opts.time, opts.active], () => update())

  const stopFollowing = () => {
    if (opts.active.value) following.value = false
  }
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key) && !(e.target as HTMLElement)?.closest('input, textarea, button')) {
      stopFollowing()
    }
  }
  onMounted(() => {
    window.addEventListener('wheel', stopFollowing, { passive: true })
    window.addEventListener('touchmove', stopFollowing, { passive: true })
    window.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('wheel', stopFollowing)
    window.removeEventListener('touchmove', stopFollowing)
    window.removeEventListener('keydown', onKey)
    detach()
  })

  return { following, attach, detach, follow }
}
