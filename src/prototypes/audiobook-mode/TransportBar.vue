<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxButton, CdxIcon, CdxMenu, CdxPopover, CdxProgressIndicator } from '@wikimedia/codex'
import {
  cdxIconClose,
  cdxIconDoubleChevronEnd,
  cdxIconDoubleChevronStart,
  cdxIconPlay,
} from '@wikimedia/codex-icons'

import { pauseIcon } from './icons'
import { SPEEDS, type PlaybackStatus } from './usePlayback'

const props = defineProps<{
  status: PlaybackStatus
  rate: number
  progress: number
}>()

const emit = defineEmits<{
  togglePlay: []
  previous: []
  next: []
  close: []
  'update:rate': [rate: number]
}>()

const speedOpen = ref(false)
const speedAnchor = ref<InstanceType<typeof CdxButton> | null>(null)

const formatRate = (r: number) => `${r}x`
const speedItems = SPEEDS.map((r) => ({ value: String(r), label: formatRate(r) }))
const selectedSpeed = computed({
  get: () => String(props.rate),
  set: (value: string | null) => {
    if (value) emit('update:rate', Number(value))
    speedOpen.value = false
  },
})
</script>

<template>
  <div class="transport" :class="{ 'transport--loading': props.status === 'loading' }">
    <div
      class="transport__progress"
      role="progressbar"
      aria-label="Listening progress"
      :aria-valuenow="Math.round(props.progress * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
      :style="{ width: `${props.progress * 100}%` }"
    />

    <CdxButton
      ref="speedAnchor"
      class="transport__speed"
      :class="{ 'transport__speed--open': speedOpen }"
      action="progressive"
      weight="quiet"
      size="large"
      aria-label="Playback speed"
      :aria-expanded="speedOpen"
      @click="speedOpen = !speedOpen"
    >
      {{ formatRate(props.rate) }}
    </CdxButton>

    <div class="transport__buttons">
      <CdxButton
        action="progressive"
        weight="quiet"
        size="large"
        aria-label="Previous paragraph"
        @click="emit('previous')"
      >
        <CdxIcon :icon="cdxIconDoubleChevronStart" />
      </CdxButton>
      <CdxProgressIndicator v-if="props.status === 'loading'" class="transport__spinner">
        Loading audio
      </CdxProgressIndicator>
      <CdxButton
        v-else
        action="progressive"
        weight="quiet"
        size="large"
        :aria-label="props.status === 'paused' ? 'Play' : 'Pause'"
        @click="emit('togglePlay')"
      >
        <CdxIcon :icon="props.status === 'paused' ? cdxIconPlay : pauseIcon" />
      </CdxButton>
      <CdxButton
        action="progressive"
        weight="quiet"
        size="large"
        aria-label="Next paragraph"
        @click="emit('next')"
      >
        <CdxIcon :icon="cdxIconDoubleChevronEnd" />
      </CdxButton>
    </div>

    <CdxButton weight="quiet" size="large" aria-label="Close audio" @click="emit('close')">
      <CdxIcon :icon="cdxIconClose" />
    </CdxButton>

    <CdxPopover
      v-model:open="speedOpen"
      :anchor="speedAnchor"
      placement="top-start"
      use-close-button
      class="transport__speed-popover"
    >
      <CdxMenu
        v-model:selected="selectedSpeed"
        class="transport__speed-menu"
        :menu-items="speedItems"
        :expanded="true"
        render-in-place
      />
    </CdxPopover>
  </div>
</template>

<style scoped>
.transport {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: var(--spacing-35);
  background-color: var(--background-color-interactive);
  border-top: var(--border-width-base) solid var(--border-color-muted);
}

.transport__progress {
  position: absolute;
  top: calc(-1 * var(--border-width-base));
  left: 0;
  height: 3px;
  background-color: var(--background-color-progressive);
  transition: width 250ms linear;
}

.transport--loading .transport__progress {
  background-color: var(--border-color-interactive);
}

.transport__buttons {
  display: flex;
  align-items: center;
  gap: 22px;
}

/* Spinner sits in the play/pause slot without shifting its neighbours. */
.transport__spinner {
  display: flex;
  justify-content: center;
  min-width: var(--min-size-interactive-pointer, 44px);
}

.transport__speed--open.cdx-button {
  background-color: var(--background-color-progressive-subtle--active);
  color: var(--color-progressive--active);
}
</style>

<style>
/* Unscoped: CdxMenu's root doesn't carry the scope attribute. The menu lives
   inside the popover rather than floating under a trigger. */
.transport__speed-menu.cdx-menu {
  position: static;
  border: 0;
  box-shadow: none;
}

/* Popover opens upward, so the arrow hangs off the bottom edge; overlap the
   border by 1px so it reads as part of the panel. */
.transport__speed-popover .cdx-popover__arrow {
  margin-bottom: var(--border-width-base);
}
</style>
