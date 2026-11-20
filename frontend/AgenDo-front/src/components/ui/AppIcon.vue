<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  strokeWidth: { type: [Number, String], default: 1.6 },
})

const ICONS = {
  'calendar-check':
    'M8 2v4M16 2v4M3 4h18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM2 10h20m-8 5 2 2 4-4',
  'panel-left-close': 'M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v18m8-5-3-3 3-3',
  'panel-left-open': 'M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v18m5-13 3 3-3 3',
  plus: 'M12 5v14M5 12h14',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-up': 'm18 15-6-6-6 6',
  'chevron-left': 'm15 18-6-6 6-6',
  'chevron-right': 'm9 18 6-6-6-6',
  'chevrons-up-down': 'm7 15 5 5 5-5M7 9l5-5 5 5',
  sparkles: 'M12 3.5 13.9 8 18.5 9.9 13.9 11.8 12 16.3l-1.9-4.5L5.5 9.9 10.1 8 12 3.5zM19 14l.8 1.7L21.5 16.5l-1.7.8L19 19l-.8-1.7-1.7-.8 1.7-.8L19 14z',
  'calendar-days':
    'M8 2v4M16 2v4M3 4h18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM2 10h20M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01',
  'square-check': 'M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 9 2 2 4-4',
  'notebook-pen':
    'M2 6h4M2 10h4M2 14h4M2 18h4M6 2h13a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8.4 13.6-2.9.6.6-2.9 7.3-7.3a1.6 1.6 0 0 1 2.3 0 1.6 1.6 0 0 1 0 2.3z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm10 18-4.3-4.3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a1.9 1.9 0 0 0 3.4 0',
  'circle-help': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-.1 15h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3',
  'alert-triangle': 'M12 3 2 21h20L12 3zm0 6v5m0 3h.01',
  sliders: 'M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4',
  x: 'M18 6 6 18M6 6l12 12',
  chart: 'M12 16v5M16 14v7M20 10v11M22 3l-8.6 8.6-4-4L3 14M3 21h20',
  check: 'M20 6 9 17l-5-5',
  'sticky-note': 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3zM15 3v6h6',
  'cloud-check': 'M12 20H6.5a4.5 4.5 0 1 1 1.5-8.7A5.5 5.5 0 0 1 18.8 12 4 4 0 1 1 18 20h-2m-7-5 2 2 4-4',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  bold: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 22h16',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  'list-checks': 'M11 6h11M11 12h11M11 18h11M3 6l2 2 3-3M3 13l2 2 3-3M3 20l2 2 3-3',
  link: 'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7',
  paperclip: 'm21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 1 1 5.6 5.7l-8.5 8.5a2 2 0 0 1-2.9-2.8l8.5-8.5',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6h4.5',
  repeat: 'M2 9l3-3 3 3M5 6h9a4 4 0 0 1 4 4M22 15l-3 3-3-3M19 18h-9a4 4 0 0 1-4-4',
  calendar: 'M8 2v4M16 2v4M3 4h18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM2 10h20',
  quote: 'M6 17h3l2-4V7H5v6h3l-2 4zM14 17h3l2-4V7h-6v6h3l-2 4z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3zM14.7 6.3 17 4l3 3-2.3 2.3',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  'arrow-up-right': 'M7 17 17 7M7 7h10v10',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm-3-10 2 2 4-4',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  square: 'M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11h-3',
  ellipsis: 'M5 12h.01M12 12h.01M19 12h.01',
  wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
  tags: 'M12.6 2.6a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.2 8.2a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8zM7 7h.01',
  mail: 'M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm20 3-10 5L2 7',
  lock: 'M3 11h18a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM7 11V7a5 5 0 0 1 10 0v4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  send: 'm22 2-7 20-4-9-9-4zM22 2 11 13',
  brain: 'M12 5a3 3 0 0 0-6 0v.5A3 3 0 0 0 4 8.3 3 3 0 0 0 4 14a3 3 0 0 0 2 5.7A3 3 0 0 0 12 19zm0 0a3 3 0 0 1 6 0v.5A3 3 0 0 1 20 8.3 3 3 0 0 1 20 14a3 3 0 0 1-2 5.7A3 3 0 0 1 12 19z',
  history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2',
  'file-up': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3-3 3 3',
  hourglass: 'M6 2h12M6 22h12M6 2v4a6 6 0 0 0 12 0V2M6 22v-4a6 6 0 0 1 12 0v4',
  folder: 'M3 7a1 1 0 0 1 1-1h5.6a1 1 0 0 1 .8.4L12 8h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  'folder-open': 'M3 7a1 1 0 0 1 1-1h5.6a1 1 0 0 1 .8.4L12 8h8a1 1 0 0 1 1 1v2H3zM3 11h19l-2.2 8.2a1 1 0 0 1-1 .8H4.2a1 1 0 0 1-1-.8z',
  'file-text': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  'calendar-plus':
    'M8 2v4M16 2v4M3 4h18a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM2 10h20M12 13v5M9.5 15.5h5',
  'square-plus': 'M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM12 8v8M8 12h8',
  import: 'M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3',
  'grip-vertical': 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  type: 'M4 7V5h16v2M12 5v14M9 19h6',
  heading: 'M6 4v16M18 4v16M6 12h12',
  minus: 'M5 12h14',
  'text-quote': 'M4 5h16M4 10h10M4 15h16M4 20h10',
  dot: 'M12 12h.01',
  'sort-down': 'm3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16',
  'refresh-cw': 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  share:
    'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  box: 'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10',
  smartphone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm4 16h2',
  'message-circle':
    'M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-3.3-.6L3 21l1.3-4.2A8.3 8.3 0 0 1 3 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4z',
}

const paths = computed(() => (ICONS[props.name] || '').split('M').filter(Boolean).map((part) => `M${part}`))
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>
