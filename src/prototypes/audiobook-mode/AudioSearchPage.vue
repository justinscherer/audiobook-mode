<script setup lang="ts">
/**
 * Wizard-of-Oz Special:Search for articles with audio. The query is fixed and
 * the results are the prototype's audio articles, not a real search index.
 */
import { onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxSearchInput } from '@wikimedia/codex'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import TitleSearchResults from '@/components/search/TitleSearchResults.vue'
import { fetchTitleSearchResults, type TitleSearchResult } from '@/components/search/titleSearch'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { useConfig } from '@/composables/useConfig'
import { AUDIO_ARTICLES, AUDIO_SEARCH_QUERY } from './audioArticles'

const props = defineProps<{
  /** The prototype's article route that results open in. */
  articlePath: string
}>()

useConfig().user.value = 'logged-out'

const route = useRoute()
const router = useRouter()

const query = ref(AUDIO_SEARCH_QUERY)
const results = ref<TitleSearchResult[]>(
  AUDIO_ARTICLES.map((title) => ({ title, description: '' })),
)

const abort = new AbortController()
onBeforeUnmount(() => abort.abort())

// Fill in live descriptions and thumbnails for the canned results.
Promise.all(
  AUDIO_ARTICLES.map(async (title) => {
    const rows = await fetchTitleSearchResults(title, {
      limit: 5,
      signal: abort.signal,
      clientTag: 'audiobook-mode-search',
    })
    return rows.find((row) => row.title === title) ?? { title, description: '' }
  }),
)
  .then((rows) => (results.value = rows))
  .catch(() => {})

function articleLocation(title: string) {
  return {
    path: props.articlePath,
    query: { ...preservedQueryFromLocationQuery(route.query), title },
  }
}

const resolveHref = (title: string) => router.resolve(articleLocation(title)).href

function onSelect(title: string, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  event.preventDefault()
  void router.push(articleLocation(title))
}
</script>

<template>
  <MobileWrapper>
    <ChromeWrapper skin="mobile" :last-edited-notice="false">
      <SpecialPageWrapper title="Search">
        <form class="audio-search__form" role="search" @submit.prevent>
          <CdxSearchInput v-model="query" button-label="Search" aria-label="Search Wikipedia" />
        </form>
        <p class="audio-search__summary">
          Showing {{ results.length }} {{ results.length === 1 ? 'result' : 'results' }} with audio
        </p>
        <TitleSearchResults :results="results" :resolve-href="resolveHref" @select="onSelect" />
      </SpecialPageWrapper>
    </ChromeWrapper>
  </MobileWrapper>
</template>

<style scoped>
.audio-search__form {
  margin-bottom: var(--spacing-100);
}

.audio-search__summary {
  margin: 0 0 var(--spacing-50);
  color: var(--color-subtle);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}
</style>
