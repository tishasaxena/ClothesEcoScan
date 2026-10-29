// Small stroke icon set (24px grid), drawn to match the UI instead of relying on emoji.
const PATHS: Record<string, string[]> = {
  camera: [
    'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
    'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ],
  upload: ['M12 15V4', 'M7.5 8.5 12 4l4.5 4.5', 'M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4'],
  gift: [
    'M3.5 8.5h17v4h-17z',
    'M5 12.5V20h14v-7.5',
    'M12 8.5V20',
    'M12 8.5C10.5 5.5 7 5 7 7s3 1.5 5 1.5c2 0 5 .5 5-1.5s-3.5-1.5-5 1.5',
  ],
  hanger: ['M10 5.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9V9', 'M12 9 3.6 15.2a1 1 0 0 0 .6 1.8h15.6a1 1 0 0 0 .6-1.8z'],
  leaf: ['M5 20c0-9 5.5-15 15-15 0 10-6 15-14 15', 'M5 20c2.5-4 6-7.5 10-10'],
  spark: [
    'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z',
    'M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  ],
  car: [
    'M3.5 16.5v-3.2L5.6 8h12.8l2.1 5.3v3.2z',
    'M3.5 13.5h17',
    'M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  ],
  phone: ['M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M11 18h2'],
  tree: ['M12 21v-5', 'M12 3l5.5 7H15l3.5 6h-13L9 10H6.5z'],
  bulb: ['M9.5 18h5', 'M10.5 21h3', 'M12 3a6 6 0 0 0-3.6 10.8c.6.5.6 1.1.6 1.7v.5h6v-.5c0-.6 0-1.2.6-1.7A6 6 0 0 0 12 3z'],
  pencil: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  cycle: ['M4.5 12a7.5 7.5 0 0 1 13.2-4.9L19.5 9', 'M19.5 4v5h-5', 'M19.5 12a7.5 7.5 0 0 1-13.2 4.9L4.5 15', 'M4.5 20v-5h5'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  scan: [
    'M4 8V5a1 1 0 0 1 1-1h3',
    'M16 4h3a1 1 0 0 1 1 1v3',
    'M20 16v3a1 1 0 0 1-1 1h-3',
    'M8 20H5a1 1 0 0 1-1-1v-3',
    'M4 12h16',
  ],
  thread: ['M7 4h10', 'M7 20h10', 'M8 4v16M16 4v16', 'M8 8l8 3M8 12l8 3M8 16l8 2'],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
