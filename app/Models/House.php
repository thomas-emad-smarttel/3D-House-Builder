<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class House extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'description',
        'thumbnail',
        'status',
        'is_default',
        'plot_width',
        'plot_depth',
        'environment',
        'floors_data',
        'created_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'plot_width' => 'float',
        'plot_depth' => 'float',
        'environment' => 'array',
        'floors_data' => 'array',
    ];

    protected $appends = [
        'floors',
        'stairs',
        'elevators',
    ];

    public function getFloorsAttribute(): array
    {
        return $this->getFloors();
    }

    public function getStairsAttribute(): array
    {
        return $this->getStairs();
    }

    public function getElevatorsAttribute(): array
    {
        return $this->getElevators();
    }

    protected static function booted(): void
    {
        static::creating(function (House $house) {
            if (empty($house->slug)) {
                $house->slug = Str::slug($house->title) ?: 'house-'.Str::random(6);
            }
        });
    }

    /**
     * Get or initialize structured floors data.
     */
    public function getFloors(): array
    {
        if (is_array($this->floors_data) && ! empty($this->floors_data)) {
            return $this->floors_data;
        }

        if (is_string($this->floors_data) && ! empty($this->floors_data)) {
            $decoded = json_decode($this->floors_data, true);
            if (is_array($decoded) && ! empty($decoded)) {
                return $decoded;
            }
        }

        return static::defaultFloors();
    }

    /**
     * Get or initialize stairs connecting floors.
     */
    public function getStairs(): array
    {
        $env = $this->environment;
        if (is_string($env) && ! empty($env)) {
            $env = json_decode($env, true);
        }

        if (is_array($env) && isset($env['stairs']) && is_array($env['stairs'])) {
            return $env['stairs'];
        }

        if (is_array($env) && ! empty($env['cad_model'])) {
            return [];
        }

        return static::defaultStairs();
    }

    /**
     * Get elevators configured for the building.
     */
    public function getElevators(): array
    {
        $env = $this->environment;
        if (is_string($env) && ! empty($env)) {
            $env = json_decode($env, true);
        }

        if (is_array($env) && isset($env['elevators']) && is_array($env['elevators'])) {
            return $env['elevators'];
        }

        return [];
    }

    /**
     * Default stairs connecting ground floor to first floor.
     */
    public static function defaultStairs(): array
    {
        return [
            [
                'id' => 'stairs-foyer',
                'name' => 'Grand Foyer Stairs (Level 0 ➔ Level 1)',
                'startX' => -9.0,
                'startY' => 0.0,
                'startZ' => 2.2,
                'endX' => -9.0,
                'endY' => 3.4,
                'endZ' => -2.2,
                'width' => 1.4,
                'steps' => 18,
                'style' => 'floating_wood',
            ],
        ];
    }

    /**
     * Default template layout for a multi-floor architectural luxury villa.
     */
    public static function defaultFloors(): array
    {
        return [
            [
                'id' => 'floor-0',
                'name' => 'Ground Floor',
                'level' => 0,
                'height' => 3.4,
                'elevation' => 0.0,
                'rooms' => [
                    [
                        'id' => 'room-living',
                        'name' => 'Main Living Room',
                        'type' => 'living',
                        'color' => '#3b82f6',
                        'layout' => [
                            'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.4],
                            'position' => ['x' => 0, 'z' => 0],
                            'theme' => [
                                'floor' => 'marble',
                                'floor_sound' => 'marble',
                                'wall' => 'plaster',
                                'wall_color' => '#f3f4f6',
                                'ceiling' => 'gypsum_led',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.2,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-main-entrance',
                                    'wall' => 'south',
                                    'type' => 'front_entrance',
                                    'offset' => 0,
                                    'width' => 1.6,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Main Entrance',
                                ],
                                [
                                    'id' => 'door-patio-sliding',
                                    'wall' => 'north',
                                    'type' => 'sliding_glass',
                                    'offset' => 2.0,
                                    'width' => 2.8,
                                    'height' => 2.4,
                                    'material' => 'glass',
                                    'label' => 'Patio Glass Door',
                                ],
                                [
                                    'id' => 'door-living-kitchen',
                                    'wall' => 'east',
                                    'type' => 'arch',
                                    'offset' => 0,
                                    'width' => 1.8,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Arch to Dining',
                                ],
                                [
                                    'id' => 'door-living-foyer',
                                    'wall' => 'west',
                                    'type' => 'arch',
                                    'offset' => 0,
                                    'width' => 1.8,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Arch to Staircase Foyer',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-living-1',
                                    'wall' => 'south',
                                    'offset' => 3.8,
                                    'width' => 2.4,
                                    'height' => 1.8,
                                    'sill_height' => 0.6,
                                ],
                                [
                                    'id' => 'win-living-2',
                                    'wall' => 'south',
                                    'offset' => -3.8,
                                    'width' => 2.4,
                                    'height' => 1.8,
                                    'sill_height' => 0.6,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'sofa-1', 'type' => 'sofa', 'x' => 0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#1e293b']],
                                ['id' => 'table-1', 'type' => 'table', 'x' => 0, 'z' => 0.2, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'marble']],
                                ['id' => 'chair-1', 'type' => 'chair', 'x' => -1.6, 'z' => 0.2, 'rot' => 90, 'p' => ['color' => '#334155']],
                                ['id' => 'chair-2', 'type' => 'chair', 'x' => 1.6, 'z' => 0.2, 'rot' => 270, 'p' => ['color' => '#334155']],
                                ['id' => 'plant-1', 'type' => 'plant', 'x' => -4.8, 'z' => -3.0, 'rot' => 0, 'p' => ['s' => 1.2]],
                                ['id' => 'plant-2', 'type' => 'plant', 'x' => 4.8, 'z' => -3.0, 'rot' => 0, 'p' => ['s' => 1.2]],
                                ['id' => 'lamp-1', 'type' => 'lamp', 'x' => -4.8, 'z' => 3.0, 'rot' => 0, 'p' => ['color' => '#ffd9a0']],
                                ['id' => 'rug-1', 'type' => 'rug', 'x' => 0, 'z' => -0.5, 'rot' => 0, 'p' => ['w' => 5.0, 'd' => 4.0, 'color' => '#334155', 'material' => 'carpet']],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-kitchen',
                        'name' => 'Open Kitchen & Dining',
                        'type' => 'kitchen',
                        'color' => '#10b981',
                        'layout' => [
                            'size' => ['w' => 8.0, 'd' => 8.0, 'h' => 3.4],
                            'position' => ['x' => 10.0, 'z' => 0],
                            'theme' => [
                                'floor' => 'tile',
                                'floor_sound' => 'marble',
                                'wall' => 'plaster',
                                'wall_color' => '#f8fafc',
                                'ceiling' => 'wood_beams',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.3,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-kitchen-entry',
                                    'wall' => 'west',
                                    'type' => 'arch',
                                    'offset' => 0,
                                    'width' => 1.8,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Arch from Living Room',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-kitchen-1',
                                    'wall' => 'east',
                                    'offset' => 0,
                                    'width' => 2.8,
                                    'height' => 1.8,
                                    'sill_height' => 0.8,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'din-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 1.1, 'material' => 'wood']],
                                ['id' => 'din-c1', 'type' => 'chair', 'x' => -0.8, 'z' => -0.8, 'rot' => 0, 'p' => ['color' => '#1e293b']],
                                ['id' => 'din-c2', 'type' => 'chair', 'x' => 0.8, 'z' => -0.8, 'rot' => 0, 'p' => ['color' => '#1e293b']],
                                ['id' => 'din-c3', 'type' => 'chair', 'x' => -0.8, 'z' => 0.8, 'rot' => 180, 'p' => ['color' => '#1e293b']],
                                ['id' => 'din-c4', 'type' => 'chair', 'x' => 0.8, 'z' => 0.8, 'rot' => 180, 'p' => ['color' => '#1e293b']],
                                ['id' => 'island-1', 'type' => 'block', 'x' => 0, 'z' => -2.6, 'rot' => 0, 'p' => ['w' => 3.2, 'd' => 0.9, 'h' => 0.9, 'material' => 'marble', 'color' => '#f1f5f9', 'collide' => true]],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-foyer',
                        'name' => 'Grand Staircase Foyer',
                        'type' => 'living',
                        'color' => '#8b5cf6',
                        'layout' => [
                            'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.4],
                            'position' => ['x' => -9.0, 'z' => 0],
                            'theme' => [
                                'floor' => 'marble',
                                'floor_sound' => 'marble',
                                'wall' => 'plaster',
                                'wall_color' => '#f8fafc',
                                'ceiling' => 'gypsum_led',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.3,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-foyer-living',
                                    'wall' => 'east',
                                    'type' => 'arch',
                                    'offset' => 0,
                                    'width' => 1.8,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Arch to Living Room',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-foyer-west',
                                    'wall' => 'west',
                                    'offset' => 0,
                                    'width' => 2.2,
                                    'height' => 2.2,
                                    'sill_height' => 0.6,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'foyer-plant', 'type' => 'plant', 'x' => 1.8, 'z' => 2.8, 'rot' => 0, 'p' => ['s' => 1.3]],
                                ['id' => 'foyer-lamp', 'type' => 'lamp', 'x' => 1.8, 'z' => -2.8, 'rot' => 0, 'p' => ['color' => '#ffd9a0']],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-patio',
                        'name' => 'Garden Terrace & Patio',
                        'type' => 'balcony',
                        'color' => '#f59e0b',
                        'layout' => [
                            'size' => ['w' => 12.0, 'd' => 5.0, 'h' => 3.0],
                            'position' => ['x' => 0, 'z' => -6.5],
                            'theme' => [
                                'floor' => 'tile',
                                'floor_sound' => 'marble',
                                'wall' => 'plaster',
                                'wall_color' => '#cbd5e1',
                                'ceiling' => 'open_sky',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.4,
                            ],
                            'doors' => [],
                            'windows' => [],
                            'objects' => [
                                ['id' => 'patio-sofa', 'type' => 'sofa', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#475569']],
                                ['id' => 'patio-table', 'type' => 'table', 'x' => 0, 'z' => 1.2, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'wood']],
                                ['id' => 'patio-plant-1', 'type' => 'plant', 'x' => -4.5, 'z' => -1.2, 'rot' => 0, 'p' => ['s' => 1.4]],
                                ['id' => 'patio-plant-2', 'type' => 'plant', 'x' => 4.5, 'z' => -1.2, 'rot' => 0, 'p' => ['s' => 1.4]],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'floor-1',
                'name' => 'First Floor',
                'level' => 1,
                'height' => 3.4,
                'elevation' => 3.4,
                'rooms' => [
                    [
                        'id' => 'room-bedroom',
                        'name' => 'Master Bedroom Suite',
                        'type' => 'bedroom',
                        'color' => '#6366f1',
                        'layout' => [
                            'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.2],
                            'position' => ['x' => 0, 'z' => 0],
                            'theme' => [
                                'floor' => 'parquet',
                                'floor_sound' => 'wood',
                                'wall' => 'plaster',
                                'wall_color' => '#f1f5f9',
                                'ceiling' => 'coffered',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.1,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-bed-landing',
                                    'wall' => 'west',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 1.2,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Door to Gallery Landing',
                                ],
                                [
                                    'id' => 'door-bed-bath',
                                    'wall' => 'east',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 1.1,
                                    'height' => 2.2,
                                    'material' => 'wood',
                                    'label' => 'En-suite Luxury Bath',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-bedroom-south',
                                    'wall' => 'south',
                                    'offset' => 0,
                                    'width' => 3.2,
                                    'height' => 2.0,
                                    'sill_height' => 0.5,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'bed-master', 'type' => 'table', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 2.4, 'd' => 2.4, 'material' => 'wood']],
                                ['id' => 'rug-bed-1', 'type' => 'rug', 'x' => 0, 'z' => -1.4, 'rot' => 0, 'p' => ['w' => 4.5, 'd' => 4.0, 'color' => '#334155', 'material' => 'carpet']],
                                ['id' => 'plant-bed-1', 'type' => 'plant', 'x' => -4.5, 'z' => 2.5, 'rot' => 0, 'p' => ['s' => 1.2]],
                                ['id' => 'plant-bed-2', 'type' => 'plant', 'x' => 4.5, 'z' => 2.5, 'rot' => 0, 'p' => ['s' => 1.2]],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-bathroom',
                        'name' => 'Luxury Spa Bathroom',
                        'type' => 'bathroom',
                        'color' => '#06b6d4',
                        'layout' => [
                            'size' => ['w' => 8.0, 'd' => 8.0, 'h' => 3.2],
                            'position' => ['x' => 10.0, 'z' => 0],
                            'theme' => [
                                'floor' => 'marble',
                                'floor_sound' => 'marble',
                                'wall' => 'tile',
                                'wall_color' => '#e2e8f0',
                                'ceiling' => 'gypsum_led',
                                'ceiling_color' => '#ffffff',
                                'light' => 'cool',
                                'brightness' => 1.3,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-bath-bed',
                                    'wall' => 'west',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 1.1,
                                    'height' => 2.2,
                                    'material' => 'wood',
                                    'label' => 'Door to Master Suite',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-bath-east',
                                    'wall' => 'east',
                                    'offset' => 0,
                                    'width' => 1.8,
                                    'height' => 1.2,
                                    'sill_height' => 1.2,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'tub-spa', 'type' => 'block', 'x' => 0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 2.0, 'd' => 1.1, 'h' => 0.65, 'material' => 'marble', 'color' => '#ffffff', 'collide' => true]],
                                ['id' => 'vanity-spa', 'type' => 'block', 'x' => 0, 'z' => 1.8, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 0.6, 'h' => 0.85, 'material' => 'wood', 'color' => '#1e293b', 'collide' => true]],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-landing',
                        'name' => 'Upstairs Gallery & Landing',
                        'type' => 'living',
                        'color' => '#ec4899',
                        'layout' => [
                            'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.2],
                            'position' => ['x' => -9.0, 'z' => 0],
                            'theme' => [
                                'floor' => 'parquet',
                                'floor_sound' => 'wood',
                                'wall' => 'plaster',
                                'wall_color' => '#f8fafc',
                                'ceiling' => 'gypsum_led',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.2,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-landing-bed',
                                    'wall' => 'east',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 1.2,
                                    'height' => 2.4,
                                    'material' => 'wood',
                                    'label' => 'Door to Master Suite',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-landing-west',
                                    'wall' => 'west',
                                    'offset' => 0,
                                    'width' => 2.2,
                                    'height' => 2.2,
                                    'sill_height' => 0.6,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'landing-plant', 'type' => 'plant', 'x' => 1.8, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.1]],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
