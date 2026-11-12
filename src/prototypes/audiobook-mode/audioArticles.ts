/** Articles with recorded audio. Everything else shows the "Request audio" popover. */
export const AUDIO_ARTICLES = ['Earth']

export const DEFAULT_ARTICLE = 'Earth'

/** Wizard-of-Oz search keyword shown on Special:Search; there is no real index behind it. */
export const AUDIO_SEARCH_QUERY = 'hasaudio:yes'

/** Child route (`<prototype>/special-search`) holding each prototype's Special:Search page. */
export const SEARCH_ROUTE_SEGMENT = 'special-search'

export function hasAudio(title: string): boolean {
  return AUDIO_ARTICLES.includes(title.replace(/_/g, ' ').trim())
}
