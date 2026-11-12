<script setup lang="ts">
definePage({
  meta: {
    platform: 'web',
  },
})

import { ref } from 'vue'
import { CdxPopover, CdxToggleButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconVolumeUp } from '@wikimedia/codex-icons'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import MobileWrapper from '@/components/MobileWrapper.vue'
import { useConfig } from '@/composables/useConfig'
import TransportBar from './TransportBar.vue'
import { usePlayback } from './usePlayback'

// Readers try this logged out; Settings can still switch user for this visit.
useConfig().user.value = 'logged-out'

const playback = usePlayback()
const { status, active, rate, progress, sectionTitle } = playback

const listenButton = ref<InstanceType<typeof CdxToggleButton> | null>(null)
const onboardingOpen = ref(false)

function onParserReady() {
  if (!active.value) onboardingOpen.value = true
}

function onListenToggle(on: boolean) {
  onboardingOpen.value = false
  if (on) playback.start()
  else playback.stop()
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
        <ArticleLive article="Earth" @parser-ready="onParserReady">
          <template #mobile-tools>
            <CdxToggleButton
              ref="listenButton"
              class="immersion__listen"
              :model-value="active"
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
        :section-title="sectionTitle"
        @toggle-play="playback.togglePlay"
        @previous="playback.previous"
        @next="playback.next"
        @close="playback.stop"
        @update:rate="playback.setRate"
      />

      <CdxPopover
        v-model:open="onboardingOpen"
        class="immersion__onboarding"
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

.immersion__onboarding.cdx-popover {
  width: calc(100% - 2 * var(--spacing-100));
}

/* Codex sits the arrow's base on the popover border, leaving a seam; overlap it by 1px. */
.immersion__onboarding .cdx-popover__arrow {
  margin-top: var(--border-width-base);
}

/* Match the neighbouring Minerva toolbar icons; the pressed state stays Codex's. */
.immersion__listen.cdx-toggle-button--toggled-off .cdx-icon {
  color: var(--color-subtle);
}
</style>
