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
import TransportBar from './TransportBar.vue'
import { usePlayback } from './usePlayback'

const playback = usePlayback()
const { status, active, rate, progress } = playback

const listenButton = ref<InstanceType<typeof CdxToggleButton> | null>(null)
const onboardingOpen = ref(false)

function onParserReady(root: HTMLElement) {
  playback.setRoot(root)
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
    <ChromeWrapper skin="mobile">
      <ArticleLive article="Earth" @parser-ready="onParserReady">
        <template #mobile-tools>
          <CdxToggleButton
            ref="listenButton"
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
      @toggle-play="playback.togglePlay"
      @previous="playback.previous"
      @next="playback.next"
      @close="playback.stop"
      @update:rate="playback.setRate"
    />

    <CdxPopover
      v-model:open="onboardingOpen"
      :anchor="listenButton"
      placement="bottom-end"
      title="🔊 Audiobook mode"
      use-close-button
      :primary-action="{ label: 'Try audiobook mode', actionType: 'progressive' }"
      @primary="onTryAudiobook"
    >
      Try our new audio reading experience. Listen to articles in the background so your curiosity
      can follow you anywhere.
    </CdxPopover>
  </MobileWrapper>
</template>
