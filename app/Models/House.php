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

        return static::defaultFloors();
    }

    /**
     * Default template floors for newly created houses.
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
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-living-1',
                                    'wall' => 'west',
                                    'offset' => -1.8,
                                    'width' => 2.4,
                                    'height' => 1.8,
                                    'sill_height' => 0.6,
                                ],
                                [
                                    'id' => 'win-living-2',
                                    'wall' => 'west',
                                    'offset' => 1.8,
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
                                'ceiling' => 'coffered',
                                'ceiling_color' => '#ffffff',
                                'light' => 'neutral',
                                'brightness' => 1.25,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-kitchen-back',
                                    'wall' => 'north',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 1.0,
                                    'height' => 2.2,
                                    'material' => 'wood',
                                    'label' => 'Back Yard Exit',
                                ],
                                [
                                    'id' => 'door-kitchen-living',
                                    'wall' => 'west',
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
                                    'id' => 'win-kitchen-1',
                                    'wall' => 'east',
                                    'offset' => 0,
                                    'width' => 2.2,
                                    'height' => 1.4,
                                    'sill_height' => 1.0,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'dining-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.4, 'd' => 1.1, 'material' => 'wood']],
                                ['id' => 'dining-chair-1', 'type' => 'chair', 'x' => -0.8, 'z' => -1.0, 'rot' => 0, 'p' => ['color' => '#1e293b']],
                                ['id' => 'dining-chair-2', 'type' => 'chair', 'x' => 0.8, 'z' => -1.0, 'rot' => 0, 'p' => ['color' => '#1e293b']],
                                ['id' => 'dining-chair-3', 'type' => 'chair', 'x' => -0.8, 'z' => 1.0, 'rot' => 180, 'p' => ['color' => '#1e293b']],
                                ['id' => 'dining-chair-4', 'type' => 'chair', 'x' => 0.8, 'z' => 1.0, 'rot' => 180, 'p' => ['color' => '#1e293b']],
                                ['id' => 'kitchen-island', 'type' => 'block', 'x' => 0, 'z' => -2.6, 'rot' => 0, 'p' => ['w' => 3.4, 'd' => 1.0, 'h' => 0.95, 'material' => 'marble', 'color' => '#e2e8f0', 'collide' => true]],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'floor-1',
                'name' => 'First Floor',
                'level' => 1,
                'height' => 3.2,
                'elevation' => 3.4,
                'rooms' => [
                    [
                        'id' => 'room-master-suite',
                        'name' => 'Master Bedroom Suite',
                        'type' => 'bedroom',
                        'color' => '#8b5cf6',
                        'layout' => [
                            'size' => ['w' => 10.0, 'd' => 8.0, 'h' => 3.2],
                            'position' => ['x' => 0, 'z' => 0],
                            'theme' => [
                                'floor' => 'parquet',
                                'floor_sound' => 'wood',
                                'wall' => 'plaster',
                                'wall_color' => '#f1f5f9',
                                'ceiling' => 'wood_beams',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.1,
                            ],
                            'doors' => [
                                [
                                    'id' => 'door-bedroom-balcony',
                                    'wall' => 'south',
                                    'type' => 'double_french',
                                    'offset' => 0,
                                    'width' => 2.0,
                                    'height' => 2.3,
                                    'material' => 'glass',
                                    'label' => 'Balcony French Doors',
                                ],
                                [
                                    'id' => 'door-bedroom-bath',
                                    'wall' => 'east',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 0.95,
                                    'height' => 2.2,
                                    'material' => 'wood',
                                    'label' => 'En-suite Bathroom',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-bedroom-1',
                                    'wall' => 'west',
                                    'offset' => 0,
                                    'width' => 2.4,
                                    'height' => 1.6,
                                    'sill_height' => 0.7,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'bed-1', 'type' => 'table', 'x' => 0, 'z' => -2.2, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 2.2, 'material' => 'wood']],
                                ['id' => 'plant-bed', 'type' => 'plant', 'x' => -3.8, 'z' => 2.8, 'rot' => 0, 'p' => ['s' => 1.0]],
                                ['id' => 'rug-bed', 'type' => 'rug', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 3.8, 'd' => 3.6, 'color' => '#475569', 'material' => 'carpet']],
                            ],
                        ],
                    ],
                    [
                        'id' => 'room-bathroom',
                        'name' => 'Luxury Bathroom',
                        'type' => 'bathroom',
                        'color' => '#06b6d4',
                        'layout' => [
                            'size' => ['w' => 6.0, 'd' => 5.0, 'h' => 3.2],
                            'position' => ['x' => 8.0, 'z' => 0],
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
                                    'id' => 'door-bath-entry',
                                    'wall' => 'west',
                                    'type' => 'standard',
                                    'offset' => 0,
                                    'width' => 0.95,
                                    'height' => 2.2,
                                    'material' => 'wood',
                                    'label' => 'Bathroom Entry',
                                ],
                            ],
                            'windows' => [
                                [
                                    'id' => 'win-bath-1',
                                    'wall' => 'east',
                                    'offset' => 0,
                                    'width' => 1.4,
                                    'height' => 1.0,
                                    'sill_height' => 1.4,
                                ],
                            ],
                            'objects' => [
                                ['id' => 'tub-1', 'type' => 'block', 'x' => 0, 'z' => -1.4, 'rot' => 0, 'p' => ['w' => 1.9, 'd' => 1.0, 'h' => 0.65, 'material' => 'marble', 'color' => '#ffffff', 'collide' => true]],
                                ['id' => 'vanity-1', 'type' => 'block', 'x' => 0, 'z' => 1.4, 'rot' => 0, 'p' => ['w' => 1.8, 'd' => 0.6, 'h' => 0.85, 'material' => 'wood', 'color' => '#334155', 'collide' => true]],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'id' => 'floor-roof',
                'name' => 'Rooftop Terrace',
                'level' => 2,
                'height' => 1.4,
                'elevation' => 6.6,
                'rooms' => [
                    [
                        'id' => 'room-rooftop',
                        'name' => 'Open Sky Rooftop Lounge',
                        'type' => 'balcony',
                        'color' => '#f59e0b',
                        'layout' => [
                            'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 1.2],
                            'position' => ['x' => 0, 'z' => 0],
                            'theme' => [
                                'floor' => 'parquet',
                                'floor_sound' => 'wood',
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
                                ['id' => 'roof-sofa', 'type' => 'sofa', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#475569']],
                                ['id' => 'roof-table', 'type' => 'table', 'x' => 0, 'z' => 1.5, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'wood']],
                                ['id' => 'roof-plant-1', 'type' => 'plant', 'x' => -4.5, 'z' => -2.5, 'rot' => 0, 'p' => ['s' => 1.4]],
                                ['id' => 'roof-plant-2', 'type' => 'plant', 'x' => 4.5, 'z' => -2.5, 'rot' => 0, 'p' => ['s' => 1.4]],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
