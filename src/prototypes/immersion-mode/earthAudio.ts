const mp3Urls = import.meta.glob('./audio/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

const vttTexts = import.meta.glob('./audio/*.vtt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Audio chapters in reading order; `heading` is null for the lead. */
const CHAPTERS: { key: string; heading: string | null }[] = [
  { key: 'Lead', heading: null },
  { key: 'Etymology', heading: 'Etymology' },
  { key: 'Composition_and_structure', heading: 'Composition and structure' },
  { key: 'Hydrosphere', heading: 'Hydrosphere' },
  { key: 'Atmosphere_and_climate', heading: 'Atmosphere and climate' },
  { key: 'Biosphere', heading: 'Biosphere' },
  { key: 'Human_geography', heading: 'Human geography' },
  { key: 'In_culture', heading: 'In culture' },
]

interface Cue {
  start: number
  end: number
  text: string
}

export interface Chapter {
  key: string
  url: string
  /** Approximate length in seconds (end of the last cue). */
  duration: number
}

/** A place playback can skip to: start of a paragraph within a chapter. */
export interface Stop {
  chapter: number
  time: number
  el: HTMLElement
}

function parseTime(s: string): number {
  const [h, m, sec] = s.split(':')
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(sec)
}

function parseVtt(text: string): Cue[] {
  const cues: Cue[] = []
  for (const block of text.trim().split(/\n\n+/)) {
    const lines = block.split('\n').filter((l) => l.trim() && !l.startsWith('WEBVTT'))
    const m = lines[0]?.match(/(\S+)\s*-->\s*(\S+)/)
    if (!m || lines.length < 2) continue
    cues.push({ start: parseTime(m[1]), end: parseTime(m[2]), text: lines.slice(1).join(' ') })
  }
  return cues
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const chapterCues = CHAPTERS.map(({ key }) => parseVtt(vttTexts[`./audio/${key}.vtt`] ?? ''))

export const chapters: Chapter[] = CHAPTERS.map(({ key }, i) => ({
  key,
  url: mp3Urls[`./audio/${key}.mp3`],
  duration: chapterCues[i].at(-1)?.end ?? 0,
}))

function findSection(root: HTMLElement, heading: string | null): HTMLElement | null {
  if (!heading) return root.querySelector<HTMLElement>("section[data-mw-section-id='0']")
  const want = norm(heading)
  for (const h2 of root.querySelectorAll<HTMLElement>('section > h2')) {
    if (norm(h2.textContent ?? '') === want) return h2.closest('section')
  }
  return null
}

const SKIP = 'table, figure, .infobox, .navbox, .hatnote, .shortdescription, .mw-empty-elt'

function paragraphWords(p: HTMLElement): string[] {
  const clone = p.cloneNode(true) as HTMLElement
  clone.querySelectorAll('sup, style, .mw-ref').forEach((el) => el.remove())
  return (clone.textContent ?? '').split(/\s+/).map(norm).filter(Boolean)
}

const HEAD_WORDS = 8
const WINDOW = 12
const MIN_HITS = 5

/**
 * Maps each readable paragraph to the time its opening words are spoken. The
 * audio was recorded from an older revision, so paragraphs are anchored by
 * fuzzy-matching their first words rather than walking the text word by word;
 * paragraphs the audio doesn't contain are left out. The first stop of each
 * chapter starts at 0 so skipping to it replays the section heading.
 */
export function buildStops(root: HTMLElement): Stop[] {
  const stops: Stop[] = []
  CHAPTERS.forEach(({ heading }, chapter) => {
    const section = findSection(root, heading)
    if (!section) return
    const paras = [...section.querySelectorAll<HTMLElement>('p')].filter(
      (p) => !p.closest(SKIP) && (p.textContent ?? '').trim().length > 20,
    )

    // The first cue is the spoken heading ("Earth.", "Etymology.").
    const spoken = chapterCues[chapter]
      .slice(1)
      .flatMap((cue) => cue.text.split(/\s+/).map((w) => ({ w: norm(w), time: cue.start })))
      .filter((s) => s.w)

    const chapterStops: Stop[] = []
    let cursor = 0
    for (const el of paras) {
      const head = paragraphWords(el).slice(0, HEAD_WORDS)
      const need = Math.min(MIN_HITS, head.length)
      for (let i = cursor; i < spoken.length; i++) {
        if (!head.slice(0, 3).includes(spoken[i].w)) continue
        const window = new Set(spoken.slice(i, i + WINDOW).map((s) => s.w))
        if (head.filter((w) => window.has(w)).length < need) continue
        chapterStops.push({ chapter, time: spoken[i].time, el })
        cursor = i + 1
        break
      }
    }

    if (chapterStops.length) {
      chapterStops[0].time = 0
      const h2 = heading ? section.querySelector<HTMLElement>(':scope > h2') : null
      if (h2) chapterStops[0].el = h2
    }
    stops.push(...chapterStops)
  })
  return stops
}
