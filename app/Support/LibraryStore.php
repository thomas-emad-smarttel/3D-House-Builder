<?php

namespace App\Support;

use App\Models\LibraryObject;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class LibraryStore
{
    public const CACHE_KEY = 'room.library.objects.v1';

    public const ROOM = [
        'w' => ['min' => 10, 'max' => 40, 'default' => 20],
        'd' => ['min' => 10, 'max' => 40, 'default' => 16],
        'h' => ['min' => 3.5, 'max' => 10, 'default' => 5],
    ];

    public const THEMES = [
        'floor' => ['wood', 'marble', 'tile', 'graphite', 'ink', 'rubber', 'carpet'],
        'wall' => ['plaster', 'graphite', 'ink'],
        'ceiling' => ['plaster', 'graphite'],
        'light' => ['warm', 'neutral', 'cool', 'accent'],
        'floor_sound' => ['wood', 'marble', 'rubber', 'carpet', 'metal'],
    ];

    public const MATERIALS = [
        'solid', 'wood', 'marble', 'graphite', 'plaster', 'ink', 'rubber', 'carpet', 'tile', 'emissive', 'glass',
    ];

    public const GROUPS = [
        'Structure', 'Furniture', 'Displays', 'Interactive', 'Effects', 'Custom',
    ];

    public const LIMITS = [
        'objects' => 120,
        'lights' => 6,
    ];

    /**
     * The 20 built-in object definitions migrated from catalog.json.
     *
     * @var array<string, array>
     */
    public const BUILTIN_TYPES = [
        'block' => [
            'label' => 'Block or wall', 'group' => 'Structure', 'icon' => '▭', 'color' => '#6b7280', 'shape' => 'rect',
            'wall' => false, 'collide' => 'param', 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 'd'],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => 2],
                'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => 0.4],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => 1.2],
                'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0],
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#3b4452'],
                'material' => ['kind' => 'enum', 'label' => 'Material', 'options' => 'materials', 'default' => 'solid'],
                'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot be walked through)', 'default' => true],
            ],
        ],
        'cylinder' => [
            'label' => 'Pillar or round block', 'group' => 'Structure', 'icon' => '●', 'color' => '#6b7280', 'shape' => 'circle',
            'wall' => false, 'collide' => 'param', 'interactive' => false,
            'footprint' => ['w' => 'r', 'd' => 'r', 'mult' => 2],
            'params' => [
                'r' => ['kind' => 'number', 'label' => 'Radius (m)', 'min' => 0.1, 'max' => 5, 'step' => 0.05, 'default' => 0.4],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => 3],
                'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0],
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#3b4452'],
                'material' => ['kind' => 'enum', 'label' => 'Material', 'options' => 'materials', 'default' => 'graphite'],
                'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot be walked through)', 'default' => true],
            ],
        ],
        'rug' => [
            'label' => 'Floor mat or zone', 'group' => 'Structure', 'icon' => '▦', 'color' => '#475569', 'shape' => 'rect',
            'wall' => false, 'collide' => false, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 'd'],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.5, 'max' => 20, 'step' => 0.1, 'default' => 4],
                'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.5, 'max' => 20, 'step' => 0.1, 'default' => 3],
                'color' => ['kind' => 'color', 'label' => 'Colour (for solid / glowing)', 'default' => '#2c3340'],
                'material' => ['kind' => 'enum', 'label' => 'Material', 'options' => 'materials', 'default' => 'carpet'],
            ],
        ],
        'desk' => [
            'label' => 'Desk', 'group' => 'Furniture', 'icon' => '▬', 'color' => '#a07a52', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 'd'],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.8, 'max' => 6, 'step' => 0.1, 'default' => 1.8],
                'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.5, 'max' => 2, 'step' => 0.1, 'default' => 0.8],
                'material' => ['kind' => 'enum', 'label' => 'Top material', 'options' => 'materials', 'default' => 'wood'],
            ],
        ],
        'workstation' => [
            'label' => 'Developer workstation', 'group' => 'Furniture', 'icon' => '🖥', 'color' => '#7c8aa0', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 0.9],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Desk width (m)', 'min' => 1.4, 'max' => 4, 'step' => 0.1, 'default' => 2.2],
                'monitors' => ['kind' => 'int', 'label' => 'Monitors', 'min' => 1, 'max' => 3, 'default' => 2],
            ],
        ],
        'chair' => [
            'label' => 'Chair', 'group' => 'Furniture', 'icon' => '◫', 'color' => '#4b5563', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 0.5, 'd' => 0.5],
            'params' => [
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#2b3038'],
            ],
        ],
        'sofa' => [
            'label' => 'Sofa', 'group' => 'Furniture', 'icon' => '▰', 'color' => '#3b4452', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 0.9],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 1.2, 'max' => 4, 'step' => 0.1, 'default' => 2.2],
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#3b4452'],
            ],
        ],
        'table' => [
            'label' => 'Table', 'group' => 'Furniture', 'icon' => '▢', 'color' => '#cbd5e1', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 'd'],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.5, 'max' => 4, 'step' => 0.1, 'default' => 1.2],
                'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.5, 'max' => 3, 'step' => 0.1, 'default' => 0.7],
                'material' => ['kind' => 'enum', 'label' => 'Top material', 'options' => 'materials', 'default' => 'marble'],
            ],
        ],
        'bookshelf' => [
            'label' => 'Bookshelf', 'group' => 'Furniture', 'icon' => '▥', 'color' => '#7a5a3c', 'shape' => 'rect',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 0.4],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 1, 'max' => 4, 'step' => 0.1, 'default' => 2],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 1, 'max' => 3.5, 'step' => 0.1, 'default' => 2.2],
            ],
        ],
        'plant' => [
            'label' => 'Plant', 'group' => 'Furniture', 'icon' => '❀', 'color' => '#3d8a5d', 'shape' => 'circle',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 0.6, 'd' => 0.6, 'mult' => 's'],
            'params' => [
                's' => ['kind' => 'number', 'label' => 'Size', 'min' => 0.5, 'max' => 2.5, 'step' => 0.1, 'default' => 1],
            ],
        ],
        'lamp' => [
            'label' => 'Floor lamp', 'group' => 'Furniture', 'icon' => '✦', 'color' => '#ffd9a0', 'shape' => 'circle',
            'wall' => false, 'collide' => true, 'interactive' => false,
            'footprint' => ['w' => 0.3, 'd' => 0.3],
            'params' => [
                'color' => ['kind' => 'color', 'label' => 'Glow colour', 'default' => '#ffd9a0'],
            ],
        ],
        'module' => [
            'label' => 'Module display', 'group' => 'Displays', 'icon' => '▣', 'color' => '#38bdf8', 'shape' => 'rect',
            'wall' => true, 'collide' => false, 'interactive' => true, 'radius' => 4.4,
            'footprint' => ['w' => 'w', 'd' => 0.2],
            'params' => [
                'module' => ['kind' => 'module', 'label' => 'Which module'],
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 2, 'max' => 6, 'step' => 0.1, 'default' => 3.4],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 1.2, 'max' => 4, 'step' => 0.1, 'default' => 2.1],
                'y' => ['kind' => 'number', 'label' => 'Bottom edge above floor (m)', 'min' => 0, 'max' => 4, 'step' => 0.1, 'default' => 1],
            ],
        ],
        'sign' => [
            'label' => 'Wall sign', 'group' => 'Displays', 'icon' => '▤', 'color' => '#e2e8f0', 'shape' => 'rect',
            'wall' => true, 'collide' => false, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 0.2],
            'params' => [
                'title' => ['kind' => 'string', 'label' => 'Title', 'max' => 80, 'default' => 'Title'],
                'sub' => ['kind' => 'string', 'label' => 'Sub-line', 'max' => 160, 'default' => ''],
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 1, 'max' => 8, 'step' => 0.1, 'default' => 3.2],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.4, 'max' => 3, 'step' => 0.1, 'default' => 0.9],
                'y' => ['kind' => 'number', 'label' => 'Centre above floor (m)', 'min' => 0.5, 'max' => 9, 'step' => 0.1, 'default' => 2.4],
                'dark' => ['kind' => 'bool', 'label' => 'Dark background', 'default' => true],
            ],
        ],
        'board' => [
            'label' => 'Text board', 'group' => 'Displays', 'icon' => '☰', 'color' => '#a5b4fc', 'shape' => 'rect',
            'wall' => true, 'collide' => false, 'interactive' => true, 'radius' => 4.4,
            'footprint' => ['w' => 'w', 'd' => 0.2],
            'params' => [
                'title' => ['kind' => 'string', 'label' => 'Title', 'max' => 80, 'default' => 'Board title'],
                'body' => ['kind' => 'text', 'label' => 'Text', 'max' => 800, 'default' => ''],
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 1.5, 'max' => 6, 'step' => 0.1, 'default' => 3.6],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 1, 'max' => 4, 'step' => 0.1, 'default' => 2.2],
                'y' => ['kind' => 'number', 'label' => 'Bottom edge above floor (m)', 'min' => 0, 'max' => 4, 'step' => 0.1, 'default' => 1.1],
                'opens' => ['kind' => 'bool', 'label' => 'Open the full text in a panel when used', 'default' => true],
            ],
        ],
        'picture' => [
            'label' => 'Picture or video', 'group' => 'Displays', 'icon' => '🖼', 'color' => '#f0abfc', 'shape' => 'rect',
            'wall' => true, 'collide' => false, 'interactive' => true, 'radius' => 4.4,
            'footprint' => ['w' => 'w', 'd' => 0.2],
            'params' => [
                'media' => ['kind' => 'enum', 'label' => 'Type', 'options' => ['image', 'video'], 'default' => 'image'],
                'src' => ['kind' => 'src', 'label' => 'File (upload or link)'],
                'caption' => ['kind' => 'string', 'label' => 'Caption', 'max' => 120, 'default' => ''],
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 1, 'max' => 6, 'step' => 0.1, 'default' => 2.4],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.8, 'max' => 4, 'step' => 0.1, 'default' => 1.6],
                'y' => ['kind' => 'number', 'label' => 'Bottom edge above floor (m)', 'min' => 0.3, 'max' => 5, 'step' => 0.1, 'default' => 1.4],
                'opens' => ['kind' => 'bool', 'label' => 'Open large in a panel when used', 'default' => true],
            ],
        ],
        'dashboard' => [
            'label' => 'Animated dashboard', 'group' => 'Displays', 'icon' => '▂▅▇', 'color' => '#6fd3b5', 'shape' => 'rect',
            'wall' => true, 'collide' => false, 'interactive' => false,
            'footprint' => ['w' => 'w', 'd' => 0.2],
            'params' => [
                'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 2, 'max' => 8, 'step' => 0.1, 'default' => 5],
                'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 1.2, 'max' => 4, 'step' => 0.1, 'default' => 2.6],
                'y' => ['kind' => 'number', 'label' => 'Bottom edge above floor (m)', 'min' => 0.5, 'max' => 8, 'step' => 0.1, 'default' => 1.4],
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#6fd3b5'],
            ],
        ],
        'overview' => [
            'label' => 'Overview podium', 'group' => 'Interactive', 'icon' => '◉', 'color' => '#fbbf24', 'shape' => 'circle',
            'wall' => false, 'collide' => true, 'interactive' => true, 'radius' => 3.2,
            'footprint' => ['w' => 1, 'd' => 1],
            'params' => [
                'title' => ['kind' => 'string', 'label' => 'Sign on the podium', 'max' => 60, 'default' => 'Project overview'],
                'label' => ['kind' => 'string', 'label' => 'Prompt text', 'max' => 60, 'default' => 'Read the project overview'],
            ],
        ],
        'info' => [
            'label' => 'Info point', 'group' => 'Interactive', 'icon' => 'ⓘ', 'color' => '#fb923c', 'shape' => 'circle',
            'wall' => false, 'collide' => true, 'interactive' => true, 'radius' => 3.2,
            'footprint' => ['w' => 1, 'd' => 1],
            'params' => [
                'title' => ['kind' => 'string', 'label' => 'Title', 'max' => 60, 'default' => 'Info point'],
                'sub' => ['kind' => 'string', 'label' => 'Sign sub-line', 'max' => 80, 'default' => ''],
                'body' => ['kind' => 'text', 'label' => 'Text shown in the panel', 'max' => 1500, 'default' => ''],
                'link' => ['kind' => 'url', 'label' => 'Link (optional)'],
                'link_label' => ['kind' => 'string', 'label' => 'Link button text', 'max' => 40, 'default' => 'Open link'],
            ],
        ],
        'hologram' => [
            'label' => 'Hologram', 'group' => 'Effects', 'icon' => '⬡', 'color' => '#ffcf7a', 'shape' => 'circle',
            'wall' => false, 'collide' => false, 'interactive' => false,
            'footprint' => ['w' => 0.8, 'd' => 0.8],
            'params' => [
                'radius' => ['kind' => 'number', 'label' => 'Radius (m)', 'min' => 0.3, 'max' => 2, 'step' => 0.1, 'default' => 0.8],
                'y' => ['kind' => 'number', 'label' => 'Height above floor (m)', 'min' => 0.5, 'max' => 6, 'step' => 0.1, 'default' => 1.8],
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#ffcf7a'],
            ],
        ],
        'light' => [
            'label' => 'Light', 'group' => 'Effects', 'icon' => '☀', 'color' => '#fde68a', 'shape' => 'circle',
            'wall' => false, 'collide' => false, 'interactive' => false,
            'footprint' => ['w' => 0.4, 'd' => 0.4],
            'params' => [
                'color' => ['kind' => 'color', 'label' => 'Colour', 'default' => '#ffd9a0'],
                'intensity' => ['kind' => 'number', 'label' => 'Brightness', 'min' => 5, 'max' => 200, 'step' => 5, 'default' => 40],
                'y' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.5, 'max' => 9, 'step' => 0.1, 'default' => 3.5],
                'distance' => ['kind' => 'number', 'label' => 'Reach (m)', 'min' => 5, 'max' => 40, 'step' => 1, 'default' => 16],
            ],
        ],
    ];

    private ?array $memo = null;

    public function __construct(private readonly PortfolioStore $portfolioStore) {}

    /**
     * Get all library objects as a list of models or arrays.
     *
     * @return list<array{
     *     id: string,
     *     name: string,
     *     category: string,
     *     file_type: string,
     *     file_path: ?string,
     *     thumbnail_path: ?string,
     *     metadata: ?array,
     *     definition: array,
     *     created_at: ?string,
     *     updated_at: ?string
     * }>
     */
    public function all(): array
    {
        if ($this->memo !== null) {
            return $this->memo;
        }

        $this->seedDefaultsIfNeeded();

        try {
            $objects = LibraryObject::query()->orderBy('name')->get();
            if ($objects->isNotEmpty()) {
                $list = $objects->map(fn (LibraryObject $o) => $this->format($o))->all();

                return $this->memo = $list;
            }
        } catch (\Throwable) {
            // fallback if table is unavailable
        }

        return $this->memo = $this->builtinAsLibraryObjects();
    }

    /**
     * Complete catalogue array structure replacing catalog.json.
     */
    public function catalog(): array
    {
        $types = [];

        // 1. Builtins
        foreach (self::BUILTIN_TYPES as $k => $def) {
            $types[$k] = $def;
        }

        // 2. Custom library objects
        foreach ($this->all() as $item) {
            $types[$item['id']] = $item['definition'];
        }

        return [
            'version' => 2,
            'room' => self::ROOM,
            'themes' => self::THEMES,
            'materials' => self::MATERIALS,
            'groups' => self::GROUPS,
            'limits' => self::LIMITS,
            'types' => $types,
        ];
    }

    public function find(string $id): ?array
    {
        $all = $this->all();
        foreach ($all as $item) {
            if ($item['id'] === $id) {
                return $item;
            }
        }

        return null;
    }

    /**
     * Save a new library object.
     */
    public function create(array $data): array
    {
        $obj = LibraryObject::create([
            'id' => $data['id'],
            'name' => $data['name'],
            'category' => $data['category'] ?? 'Custom',
            'file_type' => $data['file_type'] ?? 'svg',
            'file_path' => $data['file_path'] ?? null,
            'thumbnail_path' => $data['thumbnail_path'] ?? null,
            'metadata' => $data['metadata'] ?? [],
            'definition' => $data['definition'],
        ]);

        $this->flush();

        return $this->format($obj);
    }

    /**
     * Permanent deletion with file cleanup.
     */
    public function delete(string $id): bool
    {
        $obj = LibraryObject::find($id);
        if ($obj === null) {
            return false;
        }

        // Delete associated files from storage if present
        if ($obj->file_path && str_starts_with($obj->file_path, 'storage/library/')) {
            $subPath = substr($obj->file_path, strlen('storage/'));
            Storage::disk('public')->delete($subPath);
        }

        $mtlPath = $obj->metadata['mtl_path'] ?? null;
        if (is_string($mtlPath) && str_starts_with($mtlPath, 'storage/library/')) {
            $subPath = substr($mtlPath, strlen('storage/'));
            Storage::disk('public')->delete($subPath);
        }

        $deleted = $obj->delete();
        $this->flush();

        return (bool) $deleted;
    }

    /**
     * Check which rooms reference this library object.
     *
     * @return list<array{id: string, name: string, count: int}>
     */
    public function getUsage(string $id): array
    {
        $content = $this->portfolioStore->content();
        $rooms = $content['rooms'] ?? [];
        $usage = [];

        foreach ($rooms as $room) {
            $count = 0;
            $objects = $room['layout']['objects'] ?? [];
            foreach ($objects as $obj) {
                if (($obj['type'] ?? '') === $id || ($obj['library_id'] ?? '') === $id) {
                    $count++;
                }
            }

            if ($count > 0) {
                $usage[] = [
                    'id' => $room['id'] ?? '',
                    'name' => $room['name'] ?? $room['id'] ?? 'Room',
                    'count' => $count,
                ];
            }
        }

        return $usage;
    }

    public function flush(): void
    {
        $this->memo = null;
        ContentSanitizer::flushCatalog();
        try {
            Cache::forget(self::CACHE_KEY);
        } catch (\Throwable) {
            // cache store unavailable
        }
    }

    /**
     * Ensure the 20 built-in types exist in the database so they have stable IDs and full lifecycle.
     */
    public function seedDefaultsIfNeeded(): void
    {
        try {
            if (! Schema::hasTable('library_objects')) {
                return;
            }

            if (LibraryObject::query()->exists()) {
                return;
            }

            foreach (self::BUILTIN_TYPES as $id => $def) {
                LibraryObject::create([
                    'id' => $id,
                    'name' => $def['label'],
                    'category' => $def['group'],
                    'file_type' => 'builtin',
                    'file_path' => null,
                    'thumbnail_path' => null,
                    'metadata' => [
                        'color' => $def['color'],
                        'icon' => $def['icon'],
                        'shape' => $def['shape'],
                    ],
                    'definition' => $def,
                ]);
            }
        } catch (\Throwable) {
            // in tests or pre-migration
        }
    }

    private function format(LibraryObject $o): array
    {
        return [
            'id' => $o->id,
            'name' => $o->name,
            'category' => $o->category,
            'file_type' => $o->file_type,
            'file_path' => $o->file_path,
            'thumbnail_path' => $o->thumbnail_path,
            'metadata' => $o->metadata ?? [],
            'definition' => $o->definition ?? [],
            'created_at' => $o->created_at?->toIso8601String(),
            'updated_at' => $o->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array{
     *     id: string,
     *     name: string,
     *     category: string,
     *     file_type: string,
     *     file_path: null,
     *     thumbnail_path: null,
     *     metadata: array,
     *     definition: array,
     *     created_at: null,
     *     updated_at: null
     * }>
     */
    private function builtinAsLibraryObjects(): array
    {
        $out = [];
        foreach (self::BUILTIN_TYPES as $id => $def) {
            $out[] = [
                'id' => $id,
                'name' => $def['label'],
                'category' => $def['group'],
                'file_type' => 'builtin',
                'file_path' => null,
                'thumbnail_path' => null,
                'metadata' => [
                    'color' => $def['color'],
                    'icon' => $def['icon'],
                    'shape' => $def['shape'],
                ],
                'definition' => $def,
                'created_at' => null,
                'updated_at' => null,
            ];
        }

        return $out;
    }
}
