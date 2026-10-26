<?php

namespace Database\Seeders;

use App\Models\House;
use Illuminate\Database\Seeder;

class HouseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = $this->getTemplates();

        foreach ($templates as $tmpl) {
            House::updateOrCreate(
                ['slug' => $tmpl['slug']],
                $tmpl
            );
        }
    }

    /**
     * Architectural multi-floor templates.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getTemplates(): array
    {
        return [
            // -------------------------------------------------------------
            // 1. MODERN LUXURY VILLA (3 Levels) - Default
            // -------------------------------------------------------------
            [
                'title' => 'Modern Luxury Villa',
                'slug' => 'modern-luxury-villa',
                'description' => 'A three-level architectural masterpiece featuring open-concept living, panoramic patio, master suite with spa bathroom, and an exclusive rooftop sky lounge with expansive vistas.',
                'thumbnail' => '/images/villa-modern.jpg',
                'status' => 'published',
                'is_default' => true,
                'plot_width' => 40.0,
                'plot_depth' => 30.0,
                'environment' => [
                    'sky' => 'sunset',
                    'sun_elevation' => 28,
                    'fog_density' => 0.003,
                    'ambient_sound' => 'wind_gentle',
                    'stairs' => [
                        [
                            'id' => 'stairs-foyer-l0-l1',
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
                        [
                            'id' => 'stairs-sky-l1-l2',
                            'name' => 'Penthouse Sky Stairs (Level 1 ➔ Level 2)',
                            'startX' => -7.2,
                            'startY' => 3.4,
                            'startZ' => -2.0,
                            'endX' => -7.2,
                            'endY' => 6.8,
                            'endZ' => 2.2,
                            'width' => 1.3,
                            'steps' => 18,
                            'style' => 'marble_modern',
                        ],
                    ],
                ],
                'floors_data' => [
                    // LEVEL 0
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
                                        ['id' => 'door-main-entrance', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'Main Entrance'],
                                        ['id' => 'door-patio-sliding', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 2.0, 'width' => 2.8, 'height' => 2.4, 'material' => 'glass', 'label' => 'Patio Glass Door'],
                                        ['id' => 'door-living-kitchen', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'Arch to Dining'],
                                        ['id' => 'door-living-foyer', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'Arch to Staircase Foyer'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-living-1', 'wall' => 'south', 'offset' => 3.8, 'width' => 2.4, 'height' => 1.8, 'sill_height' => 0.6],
                                        ['id' => 'win-living-2', 'wall' => 'south', 'offset' => -3.8, 'width' => 2.4, 'height' => 1.8, 'sill_height' => 0.6],
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
                                        ['id' => 'door-kitchen-entry', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'Arch from Living Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-kitchen-1', 'wall' => 'east', 'offset' => 0, 'width' => 2.8, 'height' => 1.8, 'sill_height' => 0.8],
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
                                        ['id' => 'door-foyer-living', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'Arch to Living Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-foyer-west', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
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

                    // LEVEL 1
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
                                        ['id' => 'door-bed-landing', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'Door to Gallery Landing'],
                                        ['id' => 'door-bed-bath', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'En-suite Luxury Bath'],
                                        ['id' => 'door-bed-balcony', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'glass', 'label' => 'Glass Door to Balcony'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-bedroom-south', 'wall' => 'south', 'offset' => 0, 'width' => 3.2, 'height' => 2.0, 'sill_height' => 0.5],
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
                                        ['id' => 'door-bath-bed', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'Door to Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-bath-east', 'wall' => 'east', 'offset' => 0, 'width' => 1.8, 'height' => 1.2, 'sill_height' => 1.2],
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
                                        ['id' => 'door-landing-bed', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'Door to Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-landing-west', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'landing-plant', 'type' => 'plant', 'x' => 1.8, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.1]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'room-balcony-l1',
                                'name' => 'Sunset Balcony Terrace',
                                'type' => 'balcony',
                                'color' => '#f59e0b',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 4.0, 'h' => 2.8],
                                    'position' => ['x' => 0, 'z' => -6.0],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#cbd5e1',
                                        'ceiling' => 'open_sky',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.3,
                                    ],
                                    'doors' => [],
                                    'windows' => [],
                                    'objects' => [
                                        ['id' => 'balcony-chair-1', 'type' => 'chair', 'x' => -2.0, 'z' => 0, 'rot' => 90, 'p' => ['color' => '#1e293b']],
                                        ['id' => 'balcony-chair-2', 'type' => 'chair', 'x' => 2.0, 'z' => 0, 'rot' => 270, 'p' => ['color' => '#1e293b']],
                                        ['id' => 'balcony-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 1.0, 'd' => 1.0, 'material' => 'wood']],
                                    ],
                                ],
                            ],
                        ],
                    ],

                    // LEVEL 2 - PENTHOUSE & SKY OBSERVATORY
                    [
                        'id' => 'floor-2',
                        'name' => 'Second Floor / Penthouse Sky Lounge',
                        'level' => 2,
                        'height' => 3.2,
                        'elevation' => 6.8,
                        'rooms' => [
                            [
                                'id' => 'room-sky-lounge',
                                'name' => 'Penthouse Sky Lounge & Bar',
                                'type' => 'living',
                                'color' => '#8b5cf6',
                                'layout' => [
                                    'size' => ['w' => 10.0, 'd' => 7.0, 'h' => 3.0],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#0f172a',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#1e293b',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-lounge-stairs', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'Sky Staircase Landing'],
                                        ['id' => 'door-lounge-deck', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.8, 'height' => 2.4, 'material' => 'glass', 'label' => 'Deck Access'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-sky-south', 'wall' => 'south', 'offset' => 0, 'width' => 3.6, 'height' => 2.0, 'sill_height' => 0.4],
                                    ],
                                    'objects' => [
                                        ['id' => 'sky-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -1.2, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#3b82f6']],
                                        ['id' => 'sky-table', 'type' => 'table', 'x' => 0, 'z' => 0.5, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'marble']],
                                        ['id' => 'sky-bar', 'type' => 'block', 'x' => 3.2, 'z' => 1.5, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 0.8, 'h' => 1.0, 'material' => 'wood', 'color' => '#1e293b', 'collide' => true]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'room-sky-landing',
                                'name' => 'Rooftop Stair Landing',
                                'type' => 'living',
                                'color' => '#a855f7',
                                'layout' => [
                                    'size' => ['w' => 5.0, 'd' => 7.0, 'h' => 3.0],
                                    'position' => ['x' => -7.5, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#1e293b',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#0f172a',
                                        'light' => 'warm',
                                        'brightness' => 1.1,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-stair-to-lounge', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Sky Lounge'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-sky-landing-w', 'wall' => 'west', 'offset' => 0, 'width' => 1.8, 'height' => 1.8, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [],
                                ],
                            ],
                            [
                                'id' => 'room-sky-deck',
                                'name' => 'Open Sky Rooftop Deck',
                                'type' => 'balcony',
                                'color' => '#ec4899',
                                'layout' => [
                                    'size' => ['w' => 10.0, 'd' => 5.0, 'h' => 2.6],
                                    'position' => ['x' => 0, 'z' => -6.0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#64748b',
                                        'ceiling' => 'open_sky',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.5,
                                    ],
                                    'doors' => [],
                                    'windows' => [],
                                    'objects' => [
                                        ['id' => 'deck-chair-1', 'type' => 'chair', 'x' => -2.2, 'z' => 0, 'rot' => 90, 'p' => ['color' => '#e2e8f0']],
                                        ['id' => 'deck-chair-2', 'type' => 'chair', 'x' => 2.2, 'z' => 0, 'rot' => 270, 'p' => ['color' => '#e2e8f0']],
                                        ['id' => 'deck-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 1.2, 'd' => 1.2, 'material' => 'wood']],
                                        ['id' => 'deck-plant-1', 'type' => 'plant', 'x' => -3.8, 'z' => -1.2, 'rot' => 0, 'p' => ['s' => 1.3]],
                                        ['id' => 'deck-plant-2', 'type' => 'plant', 'x' => 3.8, 'z' => -1.2, 'rot' => 0, 'p' => ['s' => 1.3]],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            // -------------------------------------------------------------
            // 2. NORDIC MINIMALIST RESIDENCE (2 Levels)
            // -------------------------------------------------------------
            [
                'title' => 'Nordic Minimalist Residence',
                'slug' => 'nordic-minimalist-residence',
                'description' => 'A warm, Scandinavian-inspired timber dwelling featuring floor-to-ceiling forest view glazing, natural ash-wood floors, and a bright reading mezzanine connected by an open-tread timber staircase.',
                'thumbnail' => '/images/nordic-residence.jpg',
                'status' => 'published',
                'is_default' => false,
                'plot_width' => 35.0,
                'plot_depth' => 26.0,
                'environment' => [
                    'sky' => 'noon',
                    'sun_elevation' => 45,
                    'fog_density' => 0.001,
                    'ambient_sound' => 'nature_birds',
                    'stairs' => [
                        [
                            'id' => 'stairs-nordic-l0-l1',
                            'name' => 'Scandinavian Oak Staircase (Level 0 ➔ Level 1)',
                            'startX' => -8.5,
                            'startY' => 0.0,
                            'startZ' => 2.0,
                            'endX' => -8.5,
                            'endY' => 3.4,
                            'endZ' => -2.0,
                            'width' => 1.3,
                            'steps' => 18,
                            'style' => 'floating_wood',
                        ],
                    ],
                ],
                'floors_data' => [
                    // LEVEL 0
                    [
                        'id' => 'floor-0',
                        'name' => 'Ground Floor',
                        'level' => 0,
                        'height' => 3.4,
                        'elevation' => 0.0,
                        'rooms' => [
                            [
                                'id' => 'nordic-living',
                                'name' => 'Timber Great Room',
                                'type' => 'living',
                                'color' => '#14b8a6',
                                'layout' => [
                                    'size' => ['w' => 11.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fafaf9',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.3,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-nordic-main', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'Main Front Entry'],
                                        ['id' => 'door-nordic-dining', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Scandi Kitchen'],
                                        ['id' => 'door-nordic-vestibule', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Stair Lobby'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-nordic-s1', 'wall' => 'south', 'offset' => 3.5, 'width' => 2.4, 'height' => 2.0, 'sill_height' => 0.4],
                                        ['id' => 'win-nordic-s2', 'wall' => 'south', 'offset' => -3.5, 'width' => 2.4, 'height' => 2.0, 'sill_height' => 0.4],
                                    ],
                                    'objects' => [
                                        ['id' => 'sofa-nordic', 'type' => 'sofa', 'x' => 0, 'z' => -1.4, 'rot' => 0, 'p' => ['w' => 3.0, 'color' => '#44403c']],
                                        ['id' => 'table-nordic', 'type' => 'table', 'x' => 0, 'z' => 0.4, 'rot' => 0, 'p' => ['w' => 1.5, 'd' => 0.8, 'material' => 'wood']],
                                        ['id' => 'plant-nordic-1', 'type' => 'plant', 'x' => -4.2, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.3]],
                                        ['id' => 'plant-nordic-2', 'type' => 'plant', 'x' => 4.2, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.3]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'nordic-kitchen',
                                'name' => 'Birch Kitchen & Dining',
                                'type' => 'kitchen',
                                'color' => '#059669',
                                'layout' => [
                                    'size' => ['w' => 7.5, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => 9.25, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#ffffff',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#fefefe',
                                        'light' => 'warm',
                                        'brightness' => 1.25,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-kitchen-nordic', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Great Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-kitchen-nordic', 'wall' => 'east', 'offset' => 0, 'width' => 2.6, 'height' => 1.8, 'sill_height' => 0.8],
                                    ],
                                    'objects' => [
                                        ['id' => 'nordic-din-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.0, 'd' => 1.0, 'material' => 'wood']],
                                        ['id' => 'nordic-chair-1', 'type' => 'chair', 'x' => -0.8, 'z' => -0.7, 'rot' => 0, 'p' => ['color' => '#292524']],
                                        ['id' => 'nordic-chair-2', 'type' => 'chair', 'x' => 0.8, 'z' => -0.7, 'rot' => 0, 'p' => ['color' => '#292524']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'nordic-vestibule',
                                'name' => 'Stair Hall & Vestibule',
                                'type' => 'living',
                                'color' => '#0284c7',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => -8.5, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#f5f5f4',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-vestibule-living', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Great Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-vestibule-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'vestibule-plant', 'type' => 'plant', 'x' => 1.8, 'z' => 2.8, 'rot' => 0, 'p' => ['s' => 1.2]],
                                    ],
                                ],
                            ],
                        ],
                    ],

                    // LEVEL 1
                    [
                        'id' => 'floor-1',
                        'name' => 'First Floor',
                        'level' => 1,
                        'height' => 3.4,
                        'elevation' => 3.4,
                        'rooms' => [
                            [
                                'id' => 'nordic-master',
                                'name' => 'Forest View Master Suite',
                                'type' => 'bedroom',
                                'color' => '#3b82f6',
                                'layout' => [
                                    'size' => ['w' => 11.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fafaf9',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-nordic-bed-mezz', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Reading Loft'],
                                        ['id' => 'door-nordic-bed-bath', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'To Washroom'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-nordic-bed-s', 'wall' => 'south', 'offset' => 0, 'width' => 3.4, 'height' => 2.2, 'sill_height' => 0.4],
                                    ],
                                    'objects' => [
                                        ['id' => 'nordic-bed', 'type' => 'table', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 2.2, 'material' => 'wood']],
                                        ['id' => 'nordic-rug', 'type' => 'rug', 'x' => 0, 'z' => -1.2, 'rot' => 0, 'p' => ['w' => 4.0, 'd' => 3.6, 'color' => '#57534e', 'material' => 'carpet']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'nordic-bath',
                                'name' => 'Scandinavian Washroom & Sauna',
                                'type' => 'bathroom',
                                'color' => '#0ea5e9',
                                'layout' => [
                                    'size' => ['w' => 7.5, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => 9.25, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'tile',
                                        'wall_color' => '#e7e5e4',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#f5f5f4',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-bath-nordic', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'To Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-bath-nordic', 'wall' => 'east', 'offset' => 0, 'width' => 1.6, 'height' => 1.2, 'sill_height' => 1.2],
                                    ],
                                    'objects' => [
                                        ['id' => 'tub-nordic', 'type' => 'block', 'x' => 0, 'z' => -1.4, 'rot' => 0, 'p' => ['w' => 1.8, 'd' => 1.0, 'h' => 0.65, 'material' => 'marble', 'color' => '#ffffff', 'collide' => true]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'nordic-loft',
                                'name' => 'Mezzanine Reading Loft',
                                'type' => 'living',
                                'color' => '#6366f1',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => -8.5, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fafaf9',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-loft-bed', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-loft-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'loft-chair', 'type' => 'chair', 'x' => 1.2, 'z' => -2.0, 'rot' => 45, 'p' => ['color' => '#292524']],
                                        ['id' => 'loft-plant', 'type' => 'plant', 'x' => 1.8, 'z' => 2.6, 'rot' => 0, 'p' => ['s' => 1.1]],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            // -------------------------------------------------------------
            // 3. MEDITERRANEAN COURTYARD ESTATE (2 Levels)
            // -------------------------------------------------------------
            [
                'title' => 'Mediterranean Courtyard Estate',
                'slug' => 'mediterranean-courtyard-estate',
                'description' => 'A classic coastal villa organized around a central sun-drenched courtyard, warm terracotta pavers, arched openings, and second-level private loggias capturing seaside breezes.',
                'thumbnail' => '/images/mediterranean-estate.jpg',
                'status' => 'published',
                'is_default' => false,
                'plot_width' => 38.0,
                'plot_depth' => 30.0,
                'environment' => [
                    'sky' => 'sunset',
                    'sun_elevation' => 35,
                    'fog_density' => 0.002,
                    'ambient_sound' => 'wind_gentle',
                    'stairs' => [
                        [
                            'id' => 'stairs-med-l0-l1',
                            'name' => 'Stone Courtyard Stairs (Level 0 ➔ Level 1)',
                            'startX' => -9.0,
                            'startY' => 0.0,
                            'startZ' => 5.8,
                            'endX' => -9.0,
                            'endY' => 3.4,
                            'endZ' => 1.2,
                            'width' => 1.4,
                            'steps' => 18,
                            'style' => 'marble_modern',
                        ],
                    ],
                ],
                'floors_data' => [
                    // LEVEL 0
                    [
                        'id' => 'floor-0',
                        'name' => 'Ground Floor',
                        'level' => 0,
                        'height' => 3.4,
                        'elevation' => 0.0,
                        'rooms' => [
                            [
                                'id' => 'med-great-hall',
                                'name' => 'Tuscan Great Hall',
                                'type' => 'living',
                                'color' => '#ea580c',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => 0, 'z' => 3.5],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fffbeb',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.3,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-med-main', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'Grand Entrance'],
                                        ['id' => 'door-med-patio', 'wall' => 'north', 'type' => 'arch', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'wood', 'label' => 'Courtyard Archway'],
                                        ['id' => 'door-med-dining', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Family Dining'],
                                        ['id' => 'door-med-stair', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Staircase Loggia'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-med-s1', 'wall' => 'south', 'offset' => 3.8, 'width' => 2.2, 'height' => 2.0, 'sill_height' => 0.5],
                                        ['id' => 'win-med-s2', 'wall' => 'south', 'offset' => -3.8, 'width' => 2.2, 'height' => 2.0, 'sill_height' => 0.5],
                                    ],
                                    'objects' => [
                                        ['id' => 'med-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -1.0, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#78350f']],
                                        ['id' => 'med-table', 'type' => 'table', 'x' => 0, 'z' => 0.6, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'wood']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'med-courtyard',
                                'name' => 'Central Sun Patio',
                                'type' => 'balcony',
                                'color' => '#d97706',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 6.0, 'h' => 3.0],
                                    'position' => ['x' => 0, 'z' => -3.5],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fef3c7',
                                        'ceiling' => 'open_sky',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.5,
                                    ],
                                    'doors' => [],
                                    'windows' => [],
                                    'objects' => [
                                        ['id' => 'patio-center-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 1.8, 'd' => 1.8, 'material' => 'marble']],
                                        ['id' => 'patio-p1', 'type' => 'plant', 'x' => -4.5, 'z' => 0, 'rot' => 0, 'p' => ['s' => 1.5]],
                                        ['id' => 'patio-p2', 'type' => 'plant', 'x' => 4.5, 'z' => 0, 'rot' => 0, 'p' => ['s' => 1.5]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'med-stair-hall',
                                'name' => 'Stair Loggia',
                                'type' => 'living',
                                'color' => '#b45309',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => -9.0, 'z' => 3.5],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fffbeb',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-stair-to-hall', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Great Hall'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-med-stair-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [],
                                ],
                            ],
                        ],
                    ],

                    // LEVEL 1
                    [
                        'id' => 'floor-1',
                        'name' => 'First Floor',
                        'level' => 1,
                        'height' => 3.4,
                        'elevation' => 3.4,
                        'rooms' => [
                            [
                                'id' => 'med-master-suite',
                                'name' => 'Terracotta Master Suite',
                                'type' => 'bedroom',
                                'color' => '#b91c1c',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => 0, 'z' => 3.5],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fffbeb',
                                        'ceiling' => 'coffered',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-med-bed-stair', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Upper Landing'],
                                        ['id' => 'door-med-bed-loggia', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'glass', 'label' => 'To Sunset Loggia'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-med-bed-s', 'wall' => 'south', 'offset' => 0, 'width' => 3.0, 'height' => 2.0, 'sill_height' => 0.5],
                                    ],
                                    'objects' => [
                                        ['id' => 'med-bed', 'type' => 'table', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 2.4, 'd' => 2.4, 'material' => 'wood']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'med-loggia',
                                'name' => 'Sunset Loggia Balcony',
                                'type' => 'balcony',
                                'color' => '#c2410c',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 5.0, 'h' => 2.8],
                                    'position' => ['x' => 0, 'z' => -3.0],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fef3c7',
                                        'ceiling' => 'open_sky',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.4,
                                    ],
                                    'doors' => [],
                                    'windows' => [],
                                    'objects' => [
                                        ['id' => 'loggia-chair-1', 'type' => 'chair', 'x' => -2.5, 'z' => 0, 'rot' => 90, 'p' => ['color' => '#78350f']],
                                        ['id' => 'loggia-chair-2', 'type' => 'chair', 'x' => 2.5, 'z' => 0, 'rot' => 270, 'p' => ['color' => '#78350f']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'med-upper-landing',
                                'name' => 'Upper Loggia Landing',
                                'type' => 'living',
                                'color' => '#92400e',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => -9.0, 'z' => 3.5],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#fffbeb',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-upper-to-bed', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-med-upper-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
