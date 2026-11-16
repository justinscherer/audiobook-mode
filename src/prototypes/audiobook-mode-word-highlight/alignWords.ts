import { chapters } from './chapters'

/** Section heading each audio chapter reads; `null` is the lead. Same order as `chapters`. */
const SECTION_HEADINGS: (string | null)[] = [
  null,
  'Etymology',
  'Composition and structure',
  'Hydrosphere',
  'Atmosphere and climate',
  'Biosphere',
  'Human geography',
  'In culture',
]

const SKIP_BLOCKS = 'table, figure, .infobox, .navbox, .hatnote, .shortdescription, .mw-empty-elt'
const SKIP_INLINE = 'sup, style, .mw-ref, .reference'
export const WORD_CLASS = 'audio-word'

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function findSection(root: HTMLElement, heading: string | null): HTMLElement | null {
  if (!heading) return root.querySelector<HTMLElement>("section[data-mw-section-id='0']")
  const want = norm(heading)
  for (const h2 of root.querySelectorAll<HTMLElement>('section > h2')) {
    if (norm(h2.textContent ?? '') === want) return h2.closest('section')
  }
  return null
}

/** Wraps each word of a paragraph in a span (once) and returns the spans in reading order. */
function wrapWords(p: HTMLElement): HTMLElement[] {
  if (p.dataset.audioWrapped) return [...p.querySelectorAll<HTMLElement>(`.${WORD_CLASS}`)]
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIP_INLINE)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

  for (const node of textNodes) {
    const parts = (node.nodeValue ?? '').split(/(\s+)/)
    if (parts.every((part) => !part.trim())) continue
    const frag = document.createDocumentFragment()
    for (const part of parts) {
      if (!part) continue
      if (!part.trim()) {
        frag.append(part)
        continue
      }
      const span = document.createElement('span')
      span.className = WORD_CLASS
      span.textContent = part
      frag.append(span)
    }
    node.replaceWith(frag)
  }
  p.dataset.audioWrapped = 'true'
  return [...p.querySelectorAll<HTMLElement>(`.${WORD_CLASS}`)]
}

/** A kept match needs a neighbouring match within this many words, spoken and written. */
const NEIGHBOUR_GAP = 3

/**
 * Pairs spoken words with article words. The audio was recorded from an older
 * revision (and spells out numbers), so this takes the longest in-order common
 * subsequence of the two word lists, then drops isolated matches (a lone "the"
 * paired across a reworded passage) so the highlight never jumps away.
 * Unmatched spoken words map to `null`.
 */
function align(spoken: string[], written: string[]): (number | null)[] {
  const n = spoken.length
  const m = written.length
  const cols = m + 1
  const lcs = new Uint16Array((n + 1) * cols)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * cols + j] =
        spoken[i] && spoken[i] === written[j]
          ? lcs[(i + 1) * cols + j + 1] + 1
          : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1])
    }
  }

  const pairs: [number, number][] = []
  for (let i = 0, j = 0; i < n && j < m;) {
    if (spoken[i] && spoken[i] === written[j]) pairs.push([i++, j++])
    else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) i++
    else j++
  }

  const close = (a: [number, number] | undefined, b: [number, number]) =>
    !!a && Math.abs(a[0] - b[0]) <= NEIGHBOUR_GAP && Math.abs(a[1] - b[1]) <= NEIGHBOUR_GAP

  const map: (number | null)[] = spoken.map(() => null)
  pairs.forEach((pair, k) => {
    if (close(pairs[k - 1], pair) || close(pairs[k + 1], pair)) map[pair[0]] = pair[1]
  })
  return map
}

/**
 * Wraps the Earth article's words and returns, per audio chapter, the span for
 * each spoken word (`null` where the recording doesn't match the page).
 */
export function alignArticle(root: HTMLElement): (HTMLElement | null)[][] {
  return chapters.map((chapter, idx) => {
    const section = findSection(root, SECTION_HEADINGS[idx])
    if (!section) return chapter.words.map(() => null)
    const spans = [...section.querySelectorAll<HTMLElement>('p')]
      .filter((p) => !p.closest(SKIP_BLOCKS) && (p.textContent ?? '').trim().length > 20)
      .flatMap(wrapWords)
    const map = align(
      chapter.words.map((w) => norm(w.text)),
      spans.map((s) => norm(s.textContent ?? '')),
    )
    return map.map((i) => (i === null ? null : spans[i]))
  })
}
