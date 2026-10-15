// Tunable game settings. Content lives in config/portfolio.php, not here.
export const SETTINGS = {
  player: {
    eye: 1.65,
    radius: 0.34,
    walk: 3.4,
    sprint: 5.8,
    accel: 12,
    turnSpeed: 1.9,        // radians / second for the arrow keys
    mouseSensitivity: 0.0022,
    touchSensitivity: 0.0042,
    fov: 72,
  },
  interact: {
    facing: 0.35,          // cosine of the max angle between view and target
  },
  render: {
    maxPixelRatio: 1.75,
    shadows: true,
  },
  hub: {
    width: 20,
    height: 5.8,
    doorSpacing: 7,
    firstDoorZ: -2,
    entryZ: 6,
  },
  audio: {
    masterVolume: 0.55,
  },
  storageKey: 'portfolio-experience-v1',
};

export const STATUS = {
  completed:      { label: 'Completed',      color: '#4ade80' },
  in_development: { label: 'In development', color: '#fbbf24' },
  planned:        { label: 'Planned',        color: '#9aa3ad' },
};

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
