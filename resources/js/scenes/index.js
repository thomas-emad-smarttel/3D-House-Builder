/*
 * Room registry. Each room is its own chunk: Vite only downloads the code for a
 * room when the visitor first walks through its door.
 * `scene` in config/portfolio.php picks the loader; unknown values use 'generic'.
 */
const loaders = {
  erp: () => import('./rooms/ErpRoom.js'),
  shipping: () => import('./rooms/ShippingRoom.js'),
  gym: () => import('./rooms/GymRoom.js'),
  installments: () => import('./rooms/InstallmentsRoom.js'),
  profile: () => import('./rooms/ProfileRoom.js'),
  skills: () => import('./rooms/SkillsRoom.js'),
  timeline: () => import('./rooms/TimelineRoom.js'),
  contact: () => import('./rooms/ContactRoom.js'),
  generic: () => import('./rooms/GenericRoom.js'),
};

/** Starts downloading a room's code; resolves to its build(ctx, room) function. */
export function loadRoomBuilder(room) {
  const load = loaders[room.scene] ?? loaders.generic;
  return load().then((m) => m.default);
}
