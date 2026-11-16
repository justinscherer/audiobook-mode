// Audio is shared with the audiobook-mode prototype rather than duplicated.
const mp3Urls = import.meta.glob('../audiobook-mode/audio/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

const vttTexts = import.meta.glob('../audiobook-mode/audio/*.vtt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const KEYS = [
  'Lead',
  'Etymology',
  'Composition_and_structure',
  'Hydrosphere',
  'Atmosphere_and_climate',
  'Biosphere',
  'Human_geography',
  'In_culture',
]

/** A spoken word and when it starts, from the VTT word cues. */
export interface Word {
  text: string
  start: number
}

export interface Chapter {
  url: string
  /** Approximate length in seconds, from the last VTT cue; replaced by the real one once loaded. */
  duration: number
  words: Word[]
}

const toSeconds = (h: string, m: string, s: string) =>
  Number(h) * 3600 + Number(m) * 60 + parseFloat(s)

function parseVtt(vtt: string): { words: Word[]; end: number } {
  const words: Word[] = []
  let end = 0
  for (const block of vtt.split(/\n\s*\n/)) {
    const [timing, ...lines] = block.trim().split('\n')
    const m = timing?.match(/(\d+):(\d+):([\d.]+)\s*-->\s*(\d+):(\d+):([\d.]+)/)
    if (!m) continue
    const start = toSeconds(m[1], m[2], m[3])
    end = toSeconds(m[4], m[5], m[6])
    for (const text of lines.join(' ').split(/\s+/).filter(Boolean)) words.push({ text, start })
  }
  return { words, end }
}

export const chapters: Chapter[] = KEYS.map((key) => {
  const { words, end } = parseVtt(vttTexts[`../audiobook-mode/audio/${key}.vtt`] ?? '')
  return { url: mp3Urls[`../audiobook-mode/audio/${key}.mp3`], duration: end, words }
})
