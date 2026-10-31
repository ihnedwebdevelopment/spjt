/** Jednotná sada liniových ikon (24×24, tah 1.6). Nahrazuje emoji. */
const P: Record<string, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  phone: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  compare: 'M12 3v18M4 6h5v12H4zM15 6h5v12h-5z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  rotate: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.9.7 1.5 1.6 1.5 2.6V17h4v-.5c0-1 .6-1.9 1.5-2.6A6 6 0 0 0 12 3z',
  check: 'M5 12.5l4.5 4.5L19 7',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  quote: 'M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6',
  upload: 'M12 16V5M7 10l5-5 5 5M5 20h14',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  // funkce vizualizátoru
  walls: 'M3 20V8l9-5 9 5v12M3 20h18M9 20v-7h6v7',
  texture: 'M4 4h16v16H4zM4 9c3 1 5-1 8 0s5 2 8 0M4 15c3 1 5-1 8 0s5 2 8 0',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  // nábytek
  sofa: 'M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2',
  armchair: 'M6 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M4 12a2 2 0 0 1 4 0v2h8v-2a2 2 0 0 1 4 0v5H4zM6 17v3M18 17v3',
  bed: 'M3 19V6M3 14h18v5M21 14v-2a3 3 0 0 0-3-3h-8v5M6 11.5a1.5 1.5 0 1 0 0-.01',
  table: 'M3 9h18M5 9v11M19 9v11M3 9l2-3h14l2 3',
  desk: 'M3 11h18M5 11v9M19 11v9M14 11v9h5M8 4h8v5H8zM12 9v2',
  shelf: 'M5 3h14v18H5zM5 9h14M5 15h14M8 5v3M10 5v3M14 11v3M9 17v3M11 17v3',
  wardrobe: 'M5 3h14v18H5zM12 3v18M10 11v2M14 11v2M7 21v1M17 21v1',
  tv: 'M3 5h18v11H3zM8 20h8M12 16v4',
  plant: 'M8 14h8l-1 7H9zM12 14V8M12 8c0-3-2-5-5-5 0 3 2 5 5 5zM12 10c0-3 2-5 5-5 0 3-2 5-5 5z',
  lamp: 'M8 3h8l3 7H5zM12 10v10M8 21h8',
  rug: 'M4 6h16v12H4zM7 9h10v6H7zM4 6l-1-1M20 6l1-1M4 18l-1 1M20 18l1 1',
}

export default function Icon({ name, size = 20, stroke = 1.6, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={'icon' + (className ? ' ' + className : '')} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? ''} />
    </svg>
  )
}
