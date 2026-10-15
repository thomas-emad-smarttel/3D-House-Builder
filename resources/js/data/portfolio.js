// Reads the JSON that Laravel embeds in the page (see game.blade.php).
export function loadPortfolio() {
  const node = document.getElementById('portfolio-data');
  if (!node) throw new Error('Portfolio data block is missing from the page.');
  const data = JSON.parse(node.textContent);
  data.roomsById = Object.fromEntries(data.rooms.map((r) => [r.id, r]));
  return data;
}
