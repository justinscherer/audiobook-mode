<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxButton, CdxIcon, CdxMenu, CdxPopover, CdxProgressIndicator } from '@wikimedia/codex'
import {
  cdxIconClose,
  cdxIconDoubleChevronEnd,
  cdxIconDoubleChevronStart,
  cdxIconPlay,
  cdxIconVolumeUp,
} from '@wikimedia/codex-icons'

import { pauseIcon } from '../audiobook-mode/icons'
import { SPEEDS, type PlaybackStatus } from './usePlayback'

const props = defineProps<{
  status: PlaybackStatus
  rate: number
  progress: number
  /** Fraction of the whole article loaded ahead of the playhead. */
  buffered: number
  sectionTitle: string
}>()

const emit = defineEmits<{
  togglePlay: []
  previous: []
  next: []
  close: []
  /** The section title was tapped: bring the word being read into view. */
  showReadingPosition: []
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
    <div class="transport__section">
      <CdxIcon class="transport__section-icon" :icon="cdxIconVolumeUp" size="small" />
      <button
        type="button"
        class="transport__section-link"
        :aria-label="`${props.sectionTitle}: show the word being read`"
        @click="emit('showReadingPosition')"
      >
        {{ props.sectionTitle }}
      </button>
      <div
        class="transport__progress transport__progress--buffered"
        aria-hidden="true"
        :style="{ width: `${Math.max(props.buffered, props.progress) * 100}%` }"
      />
      <div
        class="transport__progress"
        role="progressbar"
        aria-label="Listening progress"
        :aria-valuenow="Math.round(props.progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :style="{ width: `${props.progress * 100}%` }"
      />
    </div>

    <div class="transport__controls">
      <CdxButton
        ref="speedAnchor"
        class="transport__speed transport__neutral"
        :class="{ 'transport__speed--open': speedOpen }"
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
          class="transport__neutral transport__skip"
          weight="quiet"
          size="large"
          aria-label="Back 30 seconds"
          @click="emit('previous')"
        >
          <CdxIcon :icon="cdxIconDoubleChevronStart" />
          <span aria-hidden="true">30</span>
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
          class="transport__neutral transport__skip"
          weight="quiet"
          size="large"
          aria-label="Forward 30 seconds"
          @click="emit('next')"
        >
          <span aria-hidden="true">30</span>
          <CdxIcon :icon="cdxIconDoubleChevronEnd" />
        </CdxButton>
      </div>

      <CdxButton
        class="transport__neutral"
        weight="quiet"
        size="large"
        aria-label="Close audio"
        @click="emit('close')"
      >
        <CdxIcon :icon="cdxIconClose" />
      </CdxButton>
    </div>

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
  flex-direction: column;
  gap: var(--spacing-50);
  padding-block: var(--spacing-35);
  background-color: var(--background-color-interactive);
  border-top: var(--border-width-base) solid var(--border-color-muted);
}

.transport__section {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-35);
  padding: 0 var(--spacing-75) var(--spacing-25);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
}

.transport__section-icon {
  flex-shrink: 0;
  color: var(--color-neutral);
}

/* A button (it scrolls, it doesn't navigate) with Codex's link mixin styles. */
.transport__section-link {
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-base);
  background: none;
  color: var(--color-link);
  font: inherit;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  text-align: start;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.transport__section-link:hover {
  color: var(--color-link--hover);
  text-decoration: var(--text-decoration-underline);
}

.transport__section-link:active {
  color: var(--color-link--active);
  text-decoration: var(--text-decoration-underline);
}

.transport__section-link:focus-visible {
  outline: var(--border-style-base) var(--border-width-thick)
    var(--outline-color-progressive--focus);
}

.transport__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Sits centred on the section row's divider. */
.transport__progress {
  position: absolute;
  bottom: calc(-2 * var(--border-width-base));
  left: 0;
  height: 3px;
  background-color: var(--background-color-progressive);
  transition: width 250ms linear;
}

/* Loaded-but-unplayed audio, ahead of the played portion. */
.transport__progress--buffered {
  background-color: var(--border-color-interactive);
}

.transport__neutral.cdx-button {
  color: var(--color-neutral);
}

/* Icon + "30", tighter than Codex's icon/label gap, per the design. */
.transport__skip.cdx-button {
  gap: 0;
  padding-inline: var(--spacing-100) var(--spacing-75);
  font-size: var(--font-size-small);
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
