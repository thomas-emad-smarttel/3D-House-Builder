<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\House;
use App\Support\CadHouseImporter;
use App\Support\LibraryStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HouseProjectController extends Controller
{
    public function __construct(
        private readonly LibraryStore $library
    ) {}

    /**
     * List all houses for the admin project manager.
     */
    public function index(): JsonResponse
    {
        $houses = House::query()
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (House $h) {
                $floors = $h->getFloors();
                $roomCount = 0;
                foreach ($floors as $fl) {
                    $roomCount += count($fl['rooms'] ?? []);
                }

                return [
                    'id' => $h->id,
                    'title' => $h->title,
                    'slug' => $h->slug,
                    'description' => $h->description,
                    'thumbnail' => $h->thumbnail,
                    'status' => $h->status,
                    'is_default' => (bool) $h->is_default,
                    'plot_width' => (float) $h->plot_width,
                    'plot_depth' => (float) $h->plot_depth,
                    'floors_count' => count($floors),
                    'rooms_count' => $roomCount,
                    'view_url' => route('house.show', ['slug' => $h->slug]),
                    'updated_at' => $h->updated_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'houses' => $houses,
            'library' => $this->library->all(),
        ]);
    }

    /**
     * Get a single house with all its floors, rooms, and finishes.
     */
    public function show(int $id): JsonResponse
    {
        $house = House::findOrFail($id);

        return response()->json([
            'house' => [
                'id' => $house->id,
                'title' => $house->title,
                'slug' => $house->slug,
                'description' => $house->description,
                'thumbnail' => $house->thumbnail,
                'status' => $house->status,
                'is_default' => (bool) $house->is_default,
                'plot_width' => (float) $house->plot_width,
                'plot_depth' => (float) $house->plot_depth,
                'environment' => $house->environment ?? [
                    'preset' => 'daylight',
                    'sun_intensity' => 1.0,
                    'sky_color' => '#dfe6f2',
                    'ground' => 'grass',
                ],
                'floors' => $house->getFloors(),
                'stairs' => $house->getStairs(),
                'elevators' => $house->getElevators(),
            ],
            'library' => $this->library->all(),
            'meta' => [
                'floor_materials' => ['parquet', 'marble', 'tile', 'hardwood', 'concrete', 'carpet', 'granite'],
                'ceiling_types' => ['gypsum_led', 'coffered', 'wood_beams', 'plaster', 'suspended', 'open_sky'],
                'wall_materials' => ['plaster', 'brick', 'stone', 'wood_panel', 'tile', 'accent'],
                'door_types' => [
                    ['type' => 'front_entrance', 'label' => 'Main Entrance Security Door', 'default_w' => 1.6, 'default_h' => 2.4],
                    ['type' => 'standard', 'label' => 'Interior Hinged Door', 'default_w' => 1.0, 'default_h' => 2.2],
                    ['type' => 'double_french', 'label' => 'Double French Glass Door', 'default_w' => 2.0, 'default_h' => 2.3],
                    ['type' => 'sliding_glass', 'label' => 'Patio Sliding Glass Door', 'default_w' => 2.8, 'default_h' => 2.4],
                    ['type' => 'barn_wood', 'label' => 'Rustic Sliding Barn Door', 'default_w' => 1.2, 'default_h' => 2.3],
                    ['type' => 'arch', 'label' => 'Open Architectural Arch', 'default_w' => 1.8, 'default_h' => 2.4],
                ],
                'window_types' => [
                    ['type' => 'standard', 'label' => 'Standard Window', 'default_w' => 1.6, 'default_h' => 1.4, 'default_sill' => 0.9],
                    ['type' => 'panoramic', 'label' => 'Floor-to-Ceiling Panoramic Glass', 'default_w' => 3.2, 'default_h' => 2.6, 'default_sill' => 0.1],
                    ['type' => 'bay', 'label' => 'Wide Picture Window', 'default_w' => 2.4, 'default_h' => 1.6, 'default_sill' => 0.7],
                    ['type' => 'transom', 'label' => 'High Clerestory / Transom Window', 'default_w' => 2.0, 'default_h' => 0.6, 'default_sill' => 2.2],
                ],
            ],
        ]);
    }

    /**
     * Create a new house project.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:120',
            'description' => 'nullable|string|max:1000',
            'template' => 'nullable|string|in:blank,villa,modern_2story',
            'plot_width' => 'nullable|numeric|min:10|max:100',
            'plot_depth' => 'nullable|numeric|min:10|max:100',
        ]);

        $floors = match ($validated['template'] ?? 'villa') {
            'blank' => [
                [
                    'id' => 'floor-0',
                    'name' => 'Ground Floor',
                    'level' => 0,
                    'height' => 3.2,
                    'elevation' => 0.0,
                    'rooms' => [
                        [
                            'id' => 'room-main',
                            'name' => 'Living Room',
                            'type' => 'living',
                            'color' => '#3b82f6',
                            'layout' => [
                                'size' => ['w' => 10.0, 'd' => 8.0, 'h' => 3.2],
                                'position' => ['x' => 0, 'z' => 0],
                                'theme' => [
                                    'floor' => 'parquet',
                                    'wall' => 'plaster',
                                    'wall_color' => '#f3f4f6',
                                    'ceiling' => 'gypsum_led',
                                    'ceiling_color' => '#ffffff',
                                    'light' => 'warm',
                                    'brightness' => 1.2,
                                ],
                                'doors' => [
                                    ['id' => 'door-1', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.4, 'height' => 2.4, 'material' => 'wood', 'label' => 'Front Door'],
                                ],
                                'windows' => [
                                    ['id' => 'win-1', 'wall' => 'north', 'offset' => 0, 'width' => 2.0, 'height' => 1.5, 'sill_height' => 0.8],
                                ],
                                'objects' => [],
                            ],
                        ],
                    ],
                ],
            ],
            default => House::defaultFloors(),
        };

        $slugBase = Str::slug($validated['title']) ?: 'house';
        $slug = $slugBase;
        $counter = 1;
        while (House::where('slug', $slug)->exists()) {
            $slug = "{$slugBase}-{$counter}";
            $counter++;
        }

        $house = House::create([
            'title' => $validated['title'],
            'slug' => $slug,
            'description' => $validated['description'] ?? '',
            'status' => 'published',
            'is_default' => House::count() === 0,
            'plot_width' => $validated['plot_width'] ?? 28,
            'plot_depth' => $validated['plot_depth'] ?? 24,
            'environment' => [
                'preset' => 'daylight',
                'sun_intensity' => 1.0,
                'sky_color' => '#dfe6f2',
                'ground' => 'grass',
            ],
            'floors_data' => $floors,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'House project created successfully!',
            'house' => $house,
        ], 201);
    }

    /**
     * Update house specs, floors, rooms, and finishes.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $house = House::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:120',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:draft,published',
            'is_default' => 'nullable|boolean',
            'plot_width' => 'nullable|numeric|min:10|max:100',
            'plot_depth' => 'nullable|numeric|min:10|max:100',
            'environment' => 'nullable|array',
            'floors' => 'nullable|array',
            'stairs' => 'nullable|array',
            'elevators' => 'nullable|array',
        ]);

        if (isset($validated['title']) && $validated['title'] !== $house->title) {
            $house->title = $validated['title'];
        }
        if (array_key_exists('description', $validated)) {
            $house->description = $validated['description'];
        }
        if (isset($validated['status'])) {
            $house->status = $validated['status'];
        }
        if (isset($validated['is_default']) && $validated['is_default']) {
            House::where('id', '!=', $house->id)->update(['is_default' => false]);
            $house->is_default = true;
        }
        if (isset($validated['plot_width'])) {
            $house->plot_width = $validated['plot_width'];
        }
        if (isset($validated['plot_depth'])) {
            $house->plot_depth = $validated['plot_depth'];
        }
        if (isset($validated['environment'])) {
            $house->environment = $validated['environment'];
        }
        if (array_key_exists('stairs', $validated)) {
            $env = $house->environment ?? [];
            $env['stairs'] = $validated['stairs'];
            $house->environment = $env;
        }
        if (array_key_exists('elevators', $validated)) {
            $env = $house->environment ?? [];
            $env['elevators'] = $validated['elevators'];
            $house->environment = $env;
        }
        if (! empty($validated['floors']) && is_array($validated['floors'])) {
            $house->floors_data = $validated['floors'];
        } elseif (! empty($request->input('floors_data')) && is_array($request->input('floors_data'))) {
            $house->floors_data = $request->input('floors_data');
        }

        $house->save();
        $house->refresh();

        return response()->json([
            'message' => 'House saved successfully!',
            'house' => [
                'id' => $house->id,
                'title' => $house->title,
                'slug' => $house->slug,
                'description' => $house->description,
                'status' => $house->status,
                'is_default' => (bool) $house->is_default,
                'plot_width' => (float) $house->plot_width,
                'plot_depth' => (float) $house->plot_depth,
                'environment' => $house->environment,
                'floors' => $house->getFloors(),
                'stairs' => $house->getStairs(),
                'elevators' => $house->getElevators(),
            ],
            'saved_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Clone a house project.
     */
    public function clone(int $id): JsonResponse
    {
        $original = House::findOrFail($id);
        $newTitle = "Copy of {$original->title}";
        $slug = Str::slug($newTitle) ?: 'house-copy-'.Str::random(4);
        $counter = 1;
        while (House::where('slug', $slug)->exists()) {
            $slug = Str::slug($newTitle)."-{$counter}";
            $counter++;
        }

        $clone = House::create([
            'title' => $newTitle,
            'slug' => $slug,
            'description' => $original->description,
            'thumbnail' => $original->thumbnail,
            'status' => 'published',
            'is_default' => false,
            'plot_width' => $original->plot_width,
            'plot_depth' => $original->plot_depth,
            'environment' => $original->environment,
            'floors_data' => $original->getFloors(),
            'created_by' => request()->user()?->id,
        ]);

        return response()->json([
            'message' => 'House duplicated successfully!',
            'house' => $clone,
        ]);
    }

    /**
     * Set a house as default showcase project.
     */
    public function setDefault(int $id): JsonResponse
    {
        $house = House::findOrFail($id);
        House::where('id', '!=', $house->id)->update(['is_default' => false]);
        $house->is_default = true;
        $house->save();

        return response()->json(['message' => "{$house->title} set as default showcase project!"]);
    }

    /**
     * Delete a house project.
     */
    public function destroy(int $id): JsonResponse
    {
        $house = House::findOrFail($id);

        if (House::count() <= 1) {
            return response()->json([
                'message' => 'You cannot delete the only remaining House project. Create another one first.',
            ], 422);
        }

        $wasDefault = $house->is_default;
        $house->delete();

        if ($wasDefault) {
            $newDefault = House::first();
            if ($newDefault) {
                $newDefault->is_default = true;
                $newDefault->save();
            }
        }

        return response()->json(['message' => 'House project deleted successfully!']);
    }

    /**
     * Import a 3D CAD design as a complete House project.
     */
    public function importCad(Request $request): JsonResponse
    {
        @ini_set('memory_limit', '1024M');
        @set_time_limit(300);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:204800'],
            'mtl_file' => ['nullable', 'file', 'max:204800'],
            'title' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'unit_scale' => ['nullable', 'string', 'in:auto,m,meters,cm,mm,inch,in'],
            'ground_preset' => ['nullable', 'string', 'in:grass,paved,concrete,water'],
            'sky_preset' => ['nullable', 'string', 'in:daylight,sunset,golden_hour,night,cyberpunk'],
            'plot_padding' => ['nullable', 'numeric', 'min:2', 'max:50'],
        ]);

        try {
            $result = CadHouseImporter::import([
                'file' => $request->file('file'),
                'mtl_file' => $request->file('mtl_file'),
                'title' => $validated['title'] ?? null,
                'description' => $validated['description'] ?? null,
                'unit_scale' => $validated['unit_scale'] ?? 'auto',
                'ground_preset' => $validated['ground_preset'] ?? 'grass',
                'sky_preset' => $validated['sky_preset'] ?? 'daylight',
                'plot_padding' => isset($validated['plot_padding']) ? (float) $validated['plot_padding'] : null,
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'message' => '3D CAD House project imported successfully!',
                'house' => $result['house'],
                'details' => $result['details'],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['file' => [$e->getMessage()]],
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to import 3D CAD model: '.$e->getMessage(),
            ], 500);
        }
    }
}
