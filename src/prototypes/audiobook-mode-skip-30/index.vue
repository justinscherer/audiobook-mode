<script setup lang="ts">
definePage({
  meta: {
    platform: 'web',
  },
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CdxPopover, CdxToggleButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconVolumeUp } from '@wikimedia/codex-icons'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { useConfig } from '@/composables/useConfig'
import { useWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import {
  AUDIO_SEARCH_QUERY,
  DEFAULT_ARTICLE,
  SEARCH_ROUTE_SEGMENT,
  hasAudio,
} from '../audiobook-mode/audioArticles'
import TransportBar from './TransportBar.vue'
import { usePlayback } from './usePlayback'

// Readers try this logged out; Settings can still switch user for this visit.
useConfig().user.value = 'logged-out'

const route = useRoute()
const router = useRouter()
const { titleFromQuery } = useWikiPageTitleQuery()
/** In-article links set `?title=`; audio keeps playing while the reader browses. */
const article = computed(() => titleFromQuery.value ?? DEFAULT_ARTICLE)
const articleHasAudio = computed(() => hasAudio(article.value))

const playback = usePlayback()
const { status, active, rate, progress } = playback

const listenButton = ref<InstanceType<typeof CdxToggleButton> | null>(null)
const onboardingOpen = ref(false)
const requestAudioOpen = ref(false)
let onboardingShown = false

watch(article, () => {
  onboardingOpen.value = false
  requestAudioOpen.value = false
})

function onParserReady() {
  if (articleHasAudio.value && !active.value && !onboardingShown) {
    onboardingShown = true
    onboardingOpen.value = true
  }
}

function onListenToggle(on: boolean) {
  onboardingOpen.value = false
  if (!articleHasAudio.value) {
    requestAudioOpen.value = true
    return
  }
  if (on) playback.start()
  else playback.stop()
}

function onSearchAudioArticles() {
  void router.push({
    path: `${route.path.replace(/\/$/, '')}/${SEARCH_ROUTE_SEGMENT}`,
    query: { ...preservedQueryFromLocationQuery(route.query), search: AUDIO_SEARCH_QUERY },
  })
}

function onTryAudiobook() {
  onboardingOpen.value = false
  playback.start()
}
</script>

<template>
  <MobileWrapper>
    <div class="immersion">
      <ChromeWrapper skin="mobile">
        <ArticleLive :article="article" @parser-ready="onParserReady">
          <template #mobile-tools>
            <CdxToggleButton
              ref="listenButton"
              class="immersion__listen"
              :model-value="active && articleHasAudio"
              quiet
              aria-label="Listen to this article"
              @update:model-value="onListenToggle"
            >
              <CdxIcon :icon="cdxIconVolumeUp" />
            </CdxToggleButton>
          </template>
        </ArticleLive>
      </ChromeWrapper>

      <TransportBar
        v-if="active"
        :status="status"
        :rate="rate"
        :progress="progress"
        @toggle-play="playback.togglePlay"
        @previous="playback.previous"
        @next="playback.next"
        @close="playback.stop"
        @update:rate="playback.setRate"
      />

      <CdxPopover
        v-model:open="onboardingOpen"
        class="immersion__popover"
        :anchor="listenButton"
        placement="bottom-end"
        render-in-place
        title="🔊 Audiobook mode"
        use-close-button
        :primary-action="{ label: 'Try audiobook mode', actionType: 'progressive' }"
        @primary="onTryAudiobook"
      >
        Try our new audio reading experience. Listen to articles in the background so your curiosity
        can follow you anywhere.
      </CdxPopover>

      <CdxPopover
        v-model:open="requestAudioOpen"
        class="immersion__popover"
        :anchor="listenButton"
        placement="bottom-end"
        render-in-place
        title="Request audio"
        use-close-button
        :primary-action="{ label: 'Search for audio articles', actionType: 'progressive' }"
        @primary="onSearchAudioArticles"
      >
        The audio for this article isn’t available yet. Click below to find more Wikipedia articles
        with available audio.
      </CdxPopover>
    </div>
  </MobileWrapper>
</template>

<style>
/*
 * Unscoped: CdxPopover's panel doesn't carry the scope attribute.
 * `overflow-x: clip` makes the column the popover's clipping boundary (so
 * Codex's shift keeps it inside the column, not the viewport) without becoming
 * a scroll container, which would break the sticky transport bar.
 */
.immersion {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-x: clip;
}

.immersion__popover.cdx-popover {
  width: calc(100% - 2 * var(--spacing-100));
}

/* Codex sits the arrow's base on the popover border, leaving a seam; overlap it by 1px. */
.immersion__popover .cdx-popover__arrow {
  margin-top: var(--border-width-base);
}

/* Match the neighbouring Minerva toolbar icons; the pressed state stays Codex's. */
.immersion__listen.cdx-toggle-button--toggled-off .cdx-icon {
  color: var(--color-subtle);
}
</style>
