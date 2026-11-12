<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { chapters } from './chapters'

const LINES = 3

const props = defineProps<{
  chapter: number
  /** Seconds into the current chapter. */
  time: number
}>()

const words = computed(() => chapters[props.chapter]?.words ?? [])

/** Last word that has started by `time`. */
const currentWord = computed(() => {
  const list = words.value
  let lo = 0
  let hi = list.length - 1
  let found = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].start <= props.time) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
})

const textEl = ref<HTMLElement | null>(null)
const lineHeight = ref(0)
/** Rendered line number of each word, measured from layout. */
const lineOfWord = ref<number[]>([])

function measure() {
  const el = textEl.value
  if (!el) return
  lineHeight.value = parseFloat(getComputedStyle(el).lineHeight)
  const spans = el.querySelectorAll<HTMLElement>('[data-word]')
  const top = spans[0]?.offsetTop ?? 0
  lineOfWord.value = [...spans].map((s) => Math.round((s.offsetTop - top) / lineHeight.value))
}

const page = computed(() => Math.floor((lineOfWord.value[currentWord.value] ?? 0) / LINES))

watch(words, async () => {
  await nextTick()
  measure()
})

let resize: ResizeObserver | null = null
onMounted(() => {
  measure()
  resize = new ResizeObserver(measure)
  if (textEl.value) resize.observe(textEl.value)
})
onBeforeUnmount(() => resize?.disconnect())
</script>

<template>
  <div class="lyrics" role="region" aria-label="Now reading">
    <div class="lyrics__viewport" :style="{ height: `${LINES * lineHeight}px` }">
      <p
        ref="textEl"
        class="lyrics__text"
        :style="{ transform: `translateY(${-page * LINES * lineHeight}px)` }"
      >
        <span class="lyrics__highlight"
          ><template v-for="(word, i) in words" :key="i"
            ><span data-word>{{ word.text }}</span
            >{{ ' ' }}</template
          ></span
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.lyrics {
  padding: var(--spacing-75);
  background-color: var(--background-color-interactive);
}

.lyrics__viewport {
  overflow: hidden;
}

.lyrics__text {
  margin: 0;
  color: var(--color-base);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

/* Per-line highlight bands, as in the design. */
.lyrics__highlight {
  background-color: var(--background-color-progressive-subtle--active);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
</style>
