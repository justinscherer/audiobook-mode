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

/** Audio file key → section title shown in the transport bar. */
const SECTIONS: [key: string, title: string][] = [
  ['Lead', 'Introduction'],
  ['Etymology', 'Etymology'],
  ['Composition_and_structure', 'Composition and structure'],
  ['Hydrosphere', 'Hydrosphere'],
  ['Atmosphere_and_climate', 'Atmosphere and climate'],
  ['Biosphere', 'Biosphere'],
  ['Human_geography', 'Human geography'],
  ['In_culture', 'In culture'],
]

export interface Chapter {
  title: string
  url: string
  /** Approximate length in seconds, from the last VTT cue; replaced by the real one once loaded. */
  duration: number
}

function lastCueEnd(vtt: string): number {
  const times = [...vtt.matchAll(/-->\s*(\d+):(\d+):([\d.]+)/g)]
  const last = times.at(-1)
  return last ? Number(last[1]) * 3600 + Number(last[2]) * 60 + parseFloat(last[3]) : 0
}

export const chapters: Chapter[] = SECTIONS.map(([key, title]) => ({
  title,
  url: mp3Urls[`../audiobook-mode/audio/${key}.mp3`],
  duration: lastCueEnd(vttTexts[`../audiobook-mode/audio/${key}.vtt`] ?? ''),
}))
