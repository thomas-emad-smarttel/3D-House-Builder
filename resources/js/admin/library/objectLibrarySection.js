import { el } from '../../ui/dom.js';
import { api, uploadWithProgress } from '../api.js';
import { syncLibrary, registerLibraryObject, catalog } from '../../scenes/custom/library.js';

export function objectLibrarySection(ed) {
  const container = el('div', { class: 'object-library' });

  let objects = [];
  let canConvertMax = false;
  let currentFilterType = '';
  let currentFilterCategory = '';
  let currentQuery = '';

  const lead = el('p', {
    class: 'lead',
    text: 'Browse, import, and manage reusable 2D/3D room objects. Objects in the Library can be added to any custom room in the Room Designer.',
  });

  const searchInput = el('input', {
    type: 'search',
    class: 'library-search',
    placeholder: 'Search objects by name or ID…',
    oninput: (e) => {
      currentQuery = e.target.value;
      renderGrid();
    },
  });

  const typeSelect = el('select', {
    onchange: (e) => {
      currentFilterType = e.target.value;
      renderGrid();
    },
  },
    el('option', { value: '', text: 'All file types' }),
    el('option', { value: 'builtin', text: 'Built-in archetypes' }),
    el('option', { value: 'svg', text: 'SVG vector objects' }),
    el('option', { value: 'dxf', text: 'CAD drawings (DXF)' }),
    el('option', { value: 'obj', text: '3D Wavefront Models (OBJ)' }),
  );

  const categorySelect = el('select', {
    onchange: (e) => {
      currentFilterCategory = e.target.value;
      renderGrid();
    },
  },
    el('option', { value: '', text: 'All categories' }),
    ...catalog.groups.map((g) => el('option', { value: g, text: g })),
  );

  const importBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary',
    text: '＋ Import Object…',
    onclick: () => openImportModal(),
  });

  const controls = el('div', { class: 'library-controls' },
    searchInput,
    el('div', { class: 'library-filters' }, typeSelect, categorySelect, importBtn),
  );

  const grid = el('div', { class: 'library-grid' });

  async function loadObjects() {
    grid.replaceChildren(el('p', { class: 'loading', text: 'Loading library objects…' }));
    try {
      const data = await api('GET', '/admin/library');
      objects = data.objects || [];
      canConvertMax = !!data.can_convert_max;
      syncLibrary(objects);
      renderGrid();
    } catch (err) {
      grid.replaceChildren(el('p', { class: 'error', role: 'alert', text: err.message }));
    }
  }

  function getFiltered() {
    return objects.filter((o) => {
      if (currentFilterType && o.file_type !== currentFilterType) return false;
      if (currentFilterCategory && o.category !== currentFilterCategory) return false;
      if (currentQuery) {
        const q = currentQuery.toLowerCase();
        const matchName = (o.name || '').toLowerCase().includes(q);
        const matchId = (o.id || '').toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }

  function renderGrid() {
    const list = getFiltered();
    if (!list.length) {
      grid.replaceChildren(el('p', {
        class: 'empty',
        style: { gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center' },
        text: 'No library objects found matching your search and filter criteria.',
      }));
      return;
    }

    grid.replaceChildren(...list.map(renderCard));
  }

  function renderCard(item) {
    const def = item.definition || {};
    const p = def.params || {};
    const w = p.w?.default ?? 1;
    const d = p.d?.default ?? 1;

    // Thumbnail
    const thumbBox = el('div', { class: 'library-thumb' });
    if (item.file_type === 'svg' && item.thumbnail_path) {
      thumbBox.innerHTML = item.thumbnail_path;
    } else if (item.file_type === 'dxf' && item.thumbnail_path) {
      thumbBox.innerHTML = item.thumbnail_path;
    } else if (item.file_type === 'obj' && item.thumbnail_path) {
      thumbBox.innerHTML = item.thumbnail_path;
    } else if (item.file_path && item.file_type === 'svg') {
      thumbBox.append(el('img', { src: item.file_path, alt: item.name }));
    } else {
      thumbBox.style.background = def.color ? `${def.color}22` : '#1e293b';
      thumbBox.append(el('span', {
        class: 'builtin-icon',
        style: { color: def.color || '#94a3b8' },
        text: def.icon || '⬡',
      }));
    }

    const badgeType = item.file_type === 'svg' ? 'badge-svg' : item.file_type === 'dxf' ? 'badge-dxf' : item.file_type === 'obj' ? 'badge-obj' : 'badge-builtin';
    const labelType = item.file_type === 'svg' ? 'SVG' : item.file_type === 'dxf' ? 'CAD (DXF)' : item.file_type === 'obj' ? '3D (OBJ)' : 'Built-in';

    const card = el('div', { class: 'library-card' },
      thumbBox,
      el('div', { class: 'library-meta' },
        el('div', { class: 'library-badges' },
          el('span', { class: `badge ${badgeType}`, text: labelType }),
          el('span', { class: 'badge badge-cat', text: item.category || 'General' }),
        ),
        el('h4', { text: item.name }),
        el('span', { class: 'library-specs', text: `Footprint: ${w}m × ${d}m` }),
        el('div', { class: 'library-actions' },
          el('button', {
            type: 'button',
            class: 'btn btn-small',
            text: 'Details',
            onclick: () => openDetailsModal(item),
          }),
          el('button', {
            type: 'button',
            class: 'btn btn-small btn-primary',
            text: 'Add to Room…',
            onclick: () => promptAddToRoom(item),
          }),
          item.file_type !== 'builtin' ? el('button', {
            type: 'button',
            class: 'btn btn-small btn-danger',
            text: 'Delete',
            onclick: () => deleteObject(item),
          }) : null,
        ),
      ),
    );

    return card;
  }

  function promptAddToRoom(item) {
    const customRooms = (ed.state.rooms || []).filter((r) => r.scene === 'custom');
    if (!customRooms.length) {
      ed.toast('No custom rooms available. Create a custom room in Rooms and projects first.', 'bad');
      return;
    }

    const select = el('select', {},
      customRooms.map((r) => el('option', { value: r.id, text: r.name || r.id })),
    );

    const backdrop = el('div', { class: 'modal-backdrop' },
      el('div', { class: 'modal-box', style: { width: '420px' } },
        el('div', { class: 'modal-head' },
          el('h3', { text: `Add "${item.name}" to Room` }),
          el('button', { type: 'button', class: 'btn btn-small', text: '✕', onclick: () => backdrop.remove() }),
        ),
        el('p', { class: 'hint', text: 'Choose which room layout to place this object into:' }),
        el('div', { class: 'field' }, select),
        el('div', { class: 'btn-row' },
          el('button', {
            type: 'button',
            class: 'btn btn-primary',
            text: 'Add & Open Designer',
            onclick: () => {
              const roomId = select.value;
              const room = (ed.state.rooms || []).find((r) => r.id === roomId);
              if (!room) return;
              if (!room.layout) room.layout = { size: { w: 20, d: 16, h: 5 }, theme: {}, objects: [] };

              // Open designer
              backdrop.remove();
              ed.section = 'designer';
              ed.render();
              const designer = ed.designers.get(roomId);
              if (designer) {
                designer.addObject(item.id);
                ed.toast(`Added ${item.name} to ${room.name || room.id}`);
              }
            },
          }),
          el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => backdrop.remove() }),
        ),
      ),
    );

    document.body.append(backdrop);
  }

  async function openDetailsModal(item) {
    let usage = [];
    try {
      const res = await api('GET', `/admin/library/${encodeURIComponent(item.id)}`);
      usage = res.usage || [];
    } catch {
      usage = [];
    }

    const def = item.definition || {};
    const p = def.params || {};

    const backdrop = el('div', { class: 'modal-backdrop' },
      el('div', { class: 'modal-box' },
        el('div', { class: 'modal-head' },
          el('h3', { text: item.name }),
          el('button', { type: 'button', class: 'btn btn-small', text: '✕', onclick: () => backdrop.remove() }),
        ),
        el('div', { class: 'preview-box' },
          item.thumbnail_path ? (() => {
            const b = el('div', { style: { width: '100%', height: '100%' } });
            b.innerHTML = item.thumbnail_path;
            return b;
          })() : el('span', { class: 'builtin-icon', style: { color: def.color || '#38bdf8' }, text: def.icon || '⬡' }),
        ),
        el('table', { class: 'table-specs' },
          el('tbody', {},
            el('tr', {}, el('th', { text: 'Identifier' }), el('td', { text: item.id })),
            el('tr', {}, el('th', { text: 'Format Type' }), el('td', { text: item.file_type })),
            el('tr', {}, el('th', { text: 'Category' }), el('td', { text: item.category || 'General' })),
            el('tr', {}, el('th', { text: 'Dimensions' }), el('td', { text: `Width: ${p.w?.default ?? 2}m, Depth: ${p.d?.default ?? 1}m, Height: ${p.h?.default ?? 1}m` })),
            item.file_type === 'obj' ? el('tr', {}, el('th', { text: '3D Geometry' }), el('td', {
              text: `${item.metadata?.vertex_count ?? 0} vertices, ${item.metadata?.face_count ?? 0} faces` + (item.metadata?.mtl_url ? ' (🎨 .mtl material attached)' : ''),
            })) : null,
            el('tr', {}, el('th', { text: 'File Path' }), el('td', { text: item.file_path || '(Built-in memory object)' })),
            el('tr', {}, el('th', { text: 'Room Usage' }), el('td', {
              text: usage.length ? usage.map((u) => `${u.name} (${u.count} instance${u.count > 1 ? 's' : ''})`).join(', ') : 'Not placed in any rooms',
            })),
          ),
        ),
        el('div', { class: 'btn-row' },
          el('button', {
            type: 'button',
            class: 'btn btn-primary',
            text: 'Add to a Room…',
            onclick: () => {
              backdrop.remove();
              promptAddToRoom(item);
            },
          }),
          item.file_type !== 'builtin' ? el('button', {
            type: 'button',
            class: 'btn btn-danger',
            text: 'Delete Permanently',
            onclick: () => {
              backdrop.remove();
              deleteObject(item);
            },
          }) : null,
          el('button', { type: 'button', class: 'btn', text: 'Close', onclick: () => backdrop.remove() }),
        ),
      ),
    );

    document.body.append(backdrop);
  }

  function openImportModal() {
    let selectedObjFile = null;
    let selectedMtlFile = null;
    let selectedMaxFile = null;
    let selectedOtherFile = null;

    const nameInput = el('input', { type: 'text', placeholder: 'Object name' });
    const catSelect = el('select', {},
      catalog.groups.map((g) => el('option', { value: g, text: g, selected: g === 'Furniture' })),
    );

    const fileInput = el('input', { type: 'file', accept: '.svg,.dxf,.dwg,.obj,.mtl,.max,.zip,.rar', multiple: true, hidden: true });
    const mtlFileInput = el('input', { type: 'file', accept: '.mtl', hidden: true });

    const dropzone = el('div', { class: 'dropzone' },
      el('div', { class: 'dropzone-icon', text: '📁' }),
      el('strong', { text: 'Choose or drop 3D Models (.obj / .mtl, .zip, .rar), SVG, or CAD (.dxf) files' }),
      el('p', { class: 'hint', text: 'Supported: .obj (Wavefront 3D) with .mtl materials, 3D ZIP/RAR packages, .svg, and .dxf (up to 200MB).' }),
    );

    const fileInfoBox = el('div', { style: { display: 'none', margin: '10px 0', padding: '12px 14px', borderRadius: '10px', fontSize: '0.88rem' } });
    const livePreview = el('div', { class: 'preview-box', style: { display: 'none' } });
    const progressBar = el('div', { style: { display: 'none', margin: '10px 0 14px', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' } },
      el('div', { class: 'progress-fill', style: { width: '0%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #38bdf8)', transition: 'width 0.15s ease' } }),
    );
    const errBox = el('div', { class: 'error', role: 'alert', style: { display: 'none', marginBottom: '14px' } });
    const submitBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Import Object', disabled: true });

    function updatePreviewAndState() {
      errBox.style.display = 'none';
      progressBar.style.display = 'none';

      // Case 1: An OBJ file has been selected
      if (selectedObjFile) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Import Object';
        const base = selectedObjFile.name.replace(/\.[^/.]+$/, '');
        if (!nameInput.value) nameInput.value = base;

        fileInfoBox.style.display = 'block';
        fileInfoBox.style.background = 'rgba(139, 92, 246, 0.1)';
        fileInfoBox.style.border = '1px solid rgba(139, 92, 246, 0.3)';
        fileInfoBox.replaceChildren(
          el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } },
            el('div', {},
              el('strong', { text: `📦 3D Geometry: ${selectedObjFile.name}` }),
              el('div', { class: 'hint', text: selectedMtlFile ? `🎨 Companion Material: ${selectedMtlFile.name}` : 'No companion .mtl material attached (using default accent color)' }),
            ),
            !selectedMtlFile ? el('button', {
              type: 'button',
              class: 'btn btn-small',
              text: '＋ Add .mtl',
              onclick: (e) => { e.stopPropagation(); mtlFileInput.click(); },
            }) : el('button', {
              type: 'button',
              class: 'btn btn-small btn-danger',
              text: 'Remove .mtl',
              onclick: (e) => { e.stopPropagation(); selectedMtlFile = null; updatePreviewAndState(); },
            }),
          ),
        );

        livePreview.innerHTML = '<span style="color:#8b5cf6;font-size:3.5rem">🛋</span>';
        livePreview.style.display = 'flex';
        return;
      }

      // Case 2: Only an MTL file was selected without an OBJ
      if (selectedMtlFile && !selectedObjFile) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Select .obj geometry file';
        fileInfoBox.style.display = 'block';
        fileInfoBox.style.background = 'rgba(234, 179, 8, 0.1)';
        fileInfoBox.style.border = '1px solid rgba(234, 179, 8, 0.35)';
        fileInfoBox.replaceChildren(
          el('div', {},
            el('strong', { style: { color: '#eab308' }, text: `🎨 Material file: ${selectedMtlFile.name}` }),
            el('p', { class: 'hint', style: { margin: '6px 0 10px' }, text: `Wavefront .mtl files define materials/colors and must accompany a .obj 3D geometry file. Please choose or drop the matching .obj file (e.g. ${selectedMtlFile.name.replace(/\.mtl$/i, '.obj')}) to complete import.` }),
            el('button', {
              type: 'button',
              class: 'btn btn-small btn-primary',
              text: '📂 Select .obj file',
              onclick: (e) => { e.stopPropagation(); fileInput.click(); },
            }),
          ),
        );
        livePreview.style.display = 'none';
        return;
      }

      // Case 3: Autodesk 3ds Max (.max) file
      if (selectedMaxFile) {
        const base = selectedMaxFile.name.replace(/\.[^/.]+$/, '');
        if (!nameInput.value) nameInput.value = base;

        fileInfoBox.style.display = 'block';

        if (canConvertMax) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Import & Convert .max';
          fileInfoBox.style.background = 'rgba(139, 92, 246, 0.1)';
          fileInfoBox.style.border = '1px solid rgba(139, 92, 246, 0.3)';
          fileInfoBox.replaceChildren(
            el('div', {},
              el('strong', { text: `📦 Autodesk 3ds Max: ${selectedMaxFile.name}` }),
              el('p', { class: 'hint', style: { margin: '4px 0 0' }, text: 'Server converter is active. The .max scene will be converted to 3D geometry automatically upon import.' }),
            ),
          );
          livePreview.innerHTML = '<span style="color:#8b5cf6;font-size:3.5rem">📐</span>';
          livePreview.style.display = 'flex';
          return;
        }

        // Server cannot convert .max directly: inform user immediately without waiting for upload!
        submitBtn.disabled = true;
        submitBtn.textContent = 'Use .obj or .zip file instead';
        fileInfoBox.style.background = 'rgba(239, 68, 68, 0.1)';
        fileInfoBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        fileInfoBox.replaceChildren(
          el('div', {},
            el('strong', { style: { color: '#ef4444', fontSize: '0.95rem' }, text: `⚠️ .max files cannot be imported directly` }),
            el('p', { style: { margin: '6px 0 8px', lineHeight: '1.45', color: '#e2e8f0' }, text: `"${selectedMaxFile.name}" is an Autodesk 3ds Max proprietary scene project file. Web browsers and WebGL require exportable 3D meshes (Wavefront .obj + .mtl).` }),
            el('div', { style: { margin: '8px 0 10px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.82rem', lineHeight: '1.6' } },
              el('div', { style: { fontWeight: '600', color: '#cbd5e1' }, text: 'How to import your couch model:' }),
              el('div', { text: '1. Check if your download package includes a .obj or .zip file (you can drop the .zip directly).' }),
              el('div', { text: '2. Or in 3ds Max: File ➔ Export ➔ Wavefront Object (*.OBJ) with materials (.mtl) checked.' }),
            ),
            el('button', {
              type: 'button',
              class: 'btn btn-small btn-primary',
              text: '📂 Select .obj or .zip file instead',
              onclick: (e) => {
                e.stopPropagation();
                fileInput.click();
              },
            }),
          ),
        );

        livePreview.innerHTML = '<span style="color:#ef4444;font-size:3.5rem">⚠️</span>';
        livePreview.style.display = 'flex';
        return;
      }

      // Case 4: SVG, CAD DXF, ZIP, or other file
      if (selectedOtherFile) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Import Object';
        const base = selectedOtherFile.name.replace(/\.[^/.]+$/, '');
        if (!nameInput.value) nameInput.value = base;

        const ext = selectedOtherFile.name.split('.').pop().toLowerCase();
        if (ext === 'dwg') {
          errBox.textContent = 'DWG is an Autodesk proprietary binary format requiring an external CAD conversion service (e.g. ODA File Converter or LibreCAD CLI). Please convert your drawing to DXF (Drawing Exchange Format) before uploading.';
          errBox.style.display = 'block';
          submitBtn.disabled = true;
          livePreview.style.display = 'none';
          fileInfoBox.style.display = 'none';
          return;
        }

        if (ext === 'zip' || ext === 'rar') {
          fileInfoBox.style.display = 'block';
          fileInfoBox.style.background = 'rgba(16, 185, 129, 0.1)';
          fileInfoBox.style.border = '1px solid rgba(16, 185, 129, 0.35)';
          fileInfoBox.replaceChildren(
            el('div', {},
              el('strong', { style: { color: '#10b981' }, text: `📦 3D Model Archive: ${selectedOtherFile.name}` }),
              el('p', { class: 'hint', style: { margin: '4px 0 0' }, text: `The server will automatically inspect the ${ext.toUpperCase()} archive, extract the .obj model and companion .mtl materials, and import them into the Library.` }),
            ),
          );
          livePreview.innerHTML = '<span style="color:#10b981;font-size:3.5rem">🗜️</span>';
          livePreview.style.display = 'flex';
          return;
        }

        fileInfoBox.style.display = 'none';
        if (ext === 'svg') {
          const reader = new FileReader();
          reader.onload = (e) => {
            livePreview.innerHTML = e.target.result;
            livePreview.style.display = 'flex';
          };
          reader.readAsText(selectedOtherFile);
        } else {
          livePreview.innerHTML = '<span style="color:#38bdf8;font-size:3rem">📐</span>';
          livePreview.style.display = 'flex';
        }
      }
    }

    function processFileList(fileList) {
      if (!fileList || !fileList.length) return;
      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'obj') {
          selectedObjFile = file;
          selectedMaxFile = null;
          selectedOtherFile = null;
        } else if (ext === 'mtl') {
          selectedMtlFile = file;
        } else if (ext === 'max') {
          selectedMaxFile = file;
          selectedObjFile = null;
          selectedOtherFile = null;
        } else {
          selectedOtherFile = file;
          selectedObjFile = null;
          selectedMaxFile = null;
        }
      }
      updatePreviewAndState();
    }

    fileInput.addEventListener('change', () => {
      processFileList(fileInput.files);
    });

    mtlFileInput.addEventListener('change', () => {
      if (mtlFileInput.files.length) {
        selectedMtlFile = mtlFileInput.files[0];
        updatePreviewAndState();
      }
    });

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      processFileList(e.dataTransfer.files);
    });

    const backdrop = el('div', { class: 'modal-backdrop' },
      el('div', { class: 'modal-box' },
        el('div', { class: 'modal-head' },
          el('h3', { text: 'Import Room Object' }),
          el('button', { type: 'button', class: 'btn btn-small', text: '✕', onclick: () => backdrop.remove() }),
        ),
        fileInput,
        mtlFileInput,
        dropzone,
        fileInfoBox,
        livePreview,
        progressBar,
        errBox,
        el('div', { class: 'field' },
          el('label', { text: 'Object name' }),
          nameInput,
        ),
        el('div', { class: 'field' },
          el('label', { text: 'Category' }),
          catSelect,
        ),
        el('div', { class: 'btn-row' },
          submitBtn,
          el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => backdrop.remove() }),
        ),
      ),
    );

    submitBtn.addEventListener('click', async () => {
      if (!selectedObjFile && !selectedMaxFile && !selectedOtherFile) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Preparing upload…';
      errBox.style.display = 'none';
      progressBar.style.display = 'block';

      const progressFill = progressBar.querySelector('.progress-fill');
      if (progressFill) progressFill.style.width = '0%';

      const fd = new FormData();
      if (selectedObjFile) {
        fd.append('file', selectedObjFile);
        if (selectedMtlFile) {
          fd.append('mtl_file', selectedMtlFile);
        }
      } else if (selectedMaxFile) {
        fd.append('file', selectedMaxFile);
      } else {
        fd.append('file', selectedOtherFile);
      }
      fd.append('name', nameInput.value.trim());
      fd.append('category', catSelect.value);

      try {
        const res = await uploadWithProgress('/admin/library/import', fd, (pct, loaded, total) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
          const mbTotal = (total / (1024 * 1024)).toFixed(1);
          if (pct < 100) {
            submitBtn.textContent = `Uploading: ${pct}% (${mbLoaded} / ${mbTotal} MB)…`;
          } else {
            submitBtn.textContent = 'Processing & Parsing 3D model…';
          }
        });
        ed.toast(`Imported "${res.object.name}" into Library!`);
        registerLibraryObject(res.object);
        backdrop.remove();
        loadObjects();
      } catch (err) {
        progressBar.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Import Object';
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
    });

    document.body.append(backdrop);
  }

  async function deleteObject(item) {
    if (item.file_type === 'builtin') {
      ed.toast('Built-in objects are system archetypes and cannot be deleted.', 'bad');
      return;
    }

    if (!confirm(`Permanently delete "${item.name}" from the library?`)) {
      return;
    }

    try {
      await api('DELETE', `/admin/library/${encodeURIComponent(item.id)}`);
      ed.toast(`Permanently deleted "${item.name}"`);
      loadObjects();
    } catch (err) {
      if (err.status === 409 || err.message.includes('in use')) {
        alert(`Cannot delete "${item.name}":\n\n${err.message}`);
      } else {
        ed.toast(err.message, 'bad');
      }
    }
  }

  loadObjects();

  return [
    lead,
    controls,
    grid,
  ];
}
