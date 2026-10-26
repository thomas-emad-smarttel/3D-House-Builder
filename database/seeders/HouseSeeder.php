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
                            'startX' => -9.5,
                            'startY' => 0.0,
                            'startZ' => 2.2,
                            'endX' => -9.5,
                            'endY' => 3.4,
                            'endZ' => -2.2,
                            'width' => 1.3,
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
                                        ['id' => 'door-bed-landing', 'wall' => 'west', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'Door to Gallery Landing'],
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
                                        ['id' => 'door-landing-bed', 'wall' => 'east', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'Door to Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-landing-west', 'wall' => 'west', 'offset' => 0, 'width' => 2.2, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'landing-plant', 'type' => 'plant', 'x' => -1.8, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.1]],
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

            // -------------------------------------------------------------
            // 4. CONTEMPORARY FAMILY RESIDENCE (2 Levels)
            // -------------------------------------------------------------
            [
                'title' => 'Contemporary Family Residence',
                'slug' => 'contemporary-family-residence',
                'description' => 'A spacious multi-level modern home designed for family living with an open-concept great room, island chef kitchen, upper-floor master suite, and panoramic sun terrace.',
                'thumbnail' => '/images/contemporary-family.jpg',
                'status' => 'published',
                'is_default' => false,
                'plot_width' => 32.0,
                'plot_depth' => 26.0,
                'environment' => [
                    'sky' => 'noon',
                    'sun_elevation' => 52,
                    'fog_density' => 0.001,
                    'ambient_sound' => 'nature_birds',
                    'stairs' => [
                        [
                            'id' => 'stairs-family-l0-l1',
                            'name' => 'Oak Floating Staircase (Level 0 ➔ Level 1)',
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
                                'id' => 'family-living',
                                'name' => 'Open Great Room',
                                'type' => 'living',
                                'color' => '#3b82f6',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'parquet',
                                        'floor_sound' => 'wood',
                                        'wall' => 'plaster',
                                        'wall_color' => '#f8fafc',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'warm',
                                        'brightness' => 1.25,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-family-entry', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'Main Front Entry'],
                                        ['id' => 'door-family-kitchen', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 2.0, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Chef Kitchen'],
                                        ['id' => 'door-family-foyer', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Foyer & Stairs'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-fam-s1', 'wall' => 'south', 'offset' => 3.8, 'width' => 2.2, 'height' => 2.0, 'sill_height' => 0.6],
                                        ['id' => 'win-fam-s2', 'wall' => 'south', 'offset' => -3.8, 'width' => 2.2, 'height' => 2.0, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'fam-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -1.2, 'rot' => 0, 'p' => ['w' => 3.0, 'color' => '#334155']],
                                        ['id' => 'fam-table', 'type' => 'table', 'x' => 0, 'z' => 0.5, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'wood']],
                                        ['id' => 'fam-plant-1', 'type' => 'plant', 'x' => 4.5, 'z' => -2.6, 'rot' => 0, 'p' => ['s' => 1.2]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'family-kitchen',
                                'name' => 'Chef Island Kitchen & Dining',
                                'type' => 'kitchen',
                                'color' => '#10b981',
                                'layout' => [
                                    'size' => ['w' => 8.0, 'd' => 8.0, 'h' => 3.4],
                                    'position' => ['x' => 10.0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'tile',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#ffffff',
                                        'ceiling' => 'wood_beams',
                                        'ceiling_color' => '#f1f5f9',
                                        'light' => 'warm',
                                        'brightness' => 1.3,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-kitchen-entry', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 2.0, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Great Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-kitchen-east', 'wall' => 'east', 'offset' => 0, 'width' => 2.8, 'height' => 1.8, 'sill_height' => 0.8],
                                    ],
                                    'objects' => [
                                        ['id' => 'fam-din-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 1.1, 'material' => 'wood']],
                                        ['id' => 'fam-island', 'type' => 'block', 'x' => 0, 'z' => -2.6, 'rot' => 0, 'p' => ['w' => 3.0, 'd' => 0.9, 'h' => 0.9, 'material' => 'marble', 'color' => '#f8fafc', 'collide' => true]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'family-foyer',
                                'name' => 'Stair Foyer & Entry Hall',
                                'type' => 'living',
                                'color' => '#6366f1',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.4],
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
                                        ['id' => 'door-foyer-living', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Great Room'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-fam-foyer-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.0, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'foyer-plant-fam', 'type' => 'plant', 'x' => 1.8, 'z' => 2.8, 'rot' => 0, 'p' => ['s' => 1.2]],
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
                        'height' => 3.2,
                        'elevation' => 3.4,
                        'rooms' => [
                            [
                                'id' => 'family-master',
                                'name' => 'Master Bedroom Suite',
                                'type' => 'bedroom',
                                'color' => '#8b5cf6',
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
                                        'brightness' => 1.15,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-master-landing', 'wall' => 'west', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Stair Landing'],
                                        ['id' => 'door-master-bath', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'To Master Bath'],
                                        ['id' => 'door-master-balcony', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'glass', 'label' => 'To Balcony'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-fam-bed-s', 'wall' => 'south', 'offset' => 0, 'width' => 3.2, 'height' => 2.0, 'sill_height' => 0.5],
                                    ],
                                    'objects' => [
                                        ['id' => 'fam-bed', 'type' => 'table', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 2.2, 'material' => 'wood']],
                                        ['id' => 'fam-rug', 'type' => 'rug', 'x' => 0, 'z' => -1.4, 'rot' => 0, 'p' => ['w' => 4.2, 'd' => 3.8, 'color' => '#1e293b', 'material' => 'carpet']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'family-bath',
                                'name' => 'Family Spa Bathroom',
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
                                        ['id' => 'door-bath-master', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.1, 'height' => 2.2, 'material' => 'wood', 'label' => 'To Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-fam-bath-e', 'wall' => 'east', 'offset' => 0, 'width' => 1.8, 'height' => 1.2, 'sill_height' => 1.2],
                                    ],
                                    'objects' => [
                                        ['id' => 'fam-tub', 'type' => 'block', 'x' => 0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 1.9, 'd' => 1.0, 'h' => 0.65, 'material' => 'marble', 'color' => '#ffffff', 'collide' => true]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'family-landing',
                                'name' => 'Upper Landing & Gallery',
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
                                        ['id' => 'door-landing-master', 'wall' => 'east', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Master Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-fam-land-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.0, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'fam-land-plant', 'type' => 'plant', 'x' => -1.8, 'z' => -2.8, 'rot' => 0, 'p' => ['s' => 1.1]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'family-balcony',
                                'name' => 'Sunset Balcony',
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
                                    'objects' => [],
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            // -------------------------------------------------------------
            // 5. CYBERPUNK NEON PENTHOUSE (2 Levels)
            // -------------------------------------------------------------
            [
                'title' => 'Cyberpunk Neon Penthouse',
                'slug' => 'cyberpunk-neon-penthouse',
                'description' => 'A dark architectural spectacle featuring glowing neon LED cove accents, dark micro-cement surfaces, an open DJ and synthesizer stage, and an upper high-tech mezzanine sleeping deck.',
                'thumbnail' => '/images/cyberpunk-loft.jpg',
                'status' => 'published',
                'is_default' => false,
                'plot_width' => 32.0,
                'plot_depth' => 28.0,
                'environment' => [
                    'sky' => 'night',
                    'sun_elevation' => 10,
                    'fog_density' => 0.003,
                    'ambient_sound' => 'city_night',
                    'stairs' => [
                        [
                            'id' => 'stairs-cyber-l0-l1',
                            'name' => 'Steel LED Matrix Staircase (Level 0 ➔ Level 1)',
                            'startX' => -9.0,
                            'startY' => 0.0,
                            'startZ' => 2.2,
                            'endX' => -9.0,
                            'endY' => 3.6,
                            'endZ' => -2.2,
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
                        'name' => 'Lower Club Level',
                        'level' => 0,
                        'height' => 3.6,
                        'elevation' => 0.0,
                        'rooms' => [
                            [
                                'id' => 'cyber-lounge',
                                'name' => 'Neon Synth Great Lounge',
                                'type' => 'living',
                                'color' => '#06b6d4',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.6],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'concrete',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#090d16',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#020617',
                                        'light' => 'cool',
                                        'brightness' => 1.4,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-cyber-front', 'wall' => 'south', 'type' => 'front_entrance', 'offset' => 0, 'width' => 1.6, 'height' => 2.4, 'material' => 'wood', 'label' => 'Airlock Security Entrance'],
                                        ['id' => 'door-cyber-bar', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 2.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Neon Bar'],
                                        ['id' => 'door-cyber-foyer', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Matrix Stairs'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-cyber-s1', 'wall' => 'south', 'offset' => 3.8, 'width' => 2.4, 'height' => 2.2, 'sill_height' => 0.4],
                                        ['id' => 'win-cyber-s2', 'wall' => 'south', 'offset' => -3.8, 'width' => 2.4, 'height' => 2.2, 'sill_height' => 0.4],
                                    ],
                                    'objects' => [
                                        ['id' => 'cyber-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -1.2, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#1e1b4b']],
                                        ['id' => 'cyber-table', 'type' => 'table', 'x' => 0, 'z' => 0.5, 'rot' => 0, 'p' => ['w' => 1.5, 'd' => 0.8, 'material' => 'marble']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'cyber-bar',
                                'name' => 'Synthesized Bar & Sound Stage',
                                'type' => 'kitchen',
                                'color' => '#d946ef',
                                'layout' => [
                                    'size' => ['w' => 8.0, 'd' => 8.0, 'h' => 3.6],
                                    'position' => ['x' => 10.0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'granite',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#0f172a',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#020617',
                                        'light' => 'cool',
                                        'brightness' => 1.3,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-bar-lounge', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 2.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Main Lounge'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-cyber-bar-e', 'wall' => 'east', 'offset' => 0, 'width' => 2.8, 'height' => 2.0, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [
                                        ['id' => 'cyber-counter', 'type' => 'block', 'x' => 0, 'z' => -2.2, 'rot' => 0, 'p' => ['w' => 3.2, 'd' => 0.9, 'h' => 1.0, 'material' => 'granite', 'color' => '#020617', 'collide' => true]],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'cyber-foyer',
                                'name' => 'Neon Stair Gallery & Foyer',
                                'type' => 'living',
                                'color' => '#a855f7',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.6],
                                    'position' => ['x' => -9.0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'concrete',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#0b0f19',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#020617',
                                        'light' => 'cool',
                                        'brightness' => 1.25,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-cyber-foyer-lounge', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 1.8, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Main Lounge'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-cyber-foyer-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.0, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [],
                                ],
                            ],
                        ],
                    ],

                    // LEVEL 1
                    [
                        'id' => 'floor-1',
                        'name' => 'Upper Mezzanine & Sky Pod',
                        'level' => 1,
                        'height' => 3.2,
                        'elevation' => 3.6,
                        'rooms' => [
                            [
                                'id' => 'cyber-mezzanine',
                                'name' => 'VIP Tech Suite & Sleeping Pod',
                                'type' => 'bedroom',
                                'color' => '#8b5cf6',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => 0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'concrete',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#090d16',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#020617',
                                        'light' => 'cool',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-mezz-landing', 'wall' => 'west', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To Upper Stair Gallery'],
                                        ['id' => 'door-mezz-deck', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.6, 'height' => 2.4, 'material' => 'glass', 'label' => 'To Neon Sky Deck'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-mezz-south', 'wall' => 'south', 'offset' => 0, 'width' => 3.6, 'height' => 2.2, 'sill_height' => 0.4],
                                    ],
                                    'objects' => [
                                        ['id' => 'cyber-bed', 'type' => 'table', 'x' => 0, 'z' => -1.8, 'rot' => 0, 'p' => ['w' => 2.4, 'd' => 2.2, 'material' => 'marble']],
                                    ],
                                ],
                            ],
                            [
                                'id' => 'cyber-sky-deck',
                                'name' => 'Neon Skyline Rooftop Deck',
                                'type' => 'balcony',
                                'color' => '#ec4899',
                                'layout' => [
                                    'size' => ['w' => 12.0, 'd' => 4.0, 'h' => 2.6],
                                    'position' => ['x' => 0, 'z' => -6.0],
                                    'theme' => [
                                        'floor' => 'concrete',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#1e293b',
                                        'ceiling' => 'open_sky',
                                        'ceiling_color' => '#ffffff',
                                        'light' => 'cool',
                                        'brightness' => 1.4,
                                    ],
                                    'doors' => [],
                                    'windows' => [],
                                    'objects' => [],
                                ],
                            ],
                            [
                                'id' => 'cyber-upper-landing',
                                'name' => 'Upper Matrix Stair Landing',
                                'type' => 'living',
                                'color' => '#a855f7',
                                'layout' => [
                                    'size' => ['w' => 6.0, 'd' => 8.0, 'h' => 3.2],
                                    'position' => ['x' => -9.0, 'z' => 0],
                                    'theme' => [
                                        'floor' => 'concrete',
                                        'floor_sound' => 'marble',
                                        'wall' => 'plaster',
                                        'wall_color' => '#0b0f19',
                                        'ceiling' => 'gypsum_led',
                                        'ceiling_color' => '#020617',
                                        'light' => 'cool',
                                        'brightness' => 1.2,
                                    ],
                                    'doors' => [
                                        ['id' => 'door-land-mezz', 'wall' => 'east', 'type' => 'standard', 'offset' => -2.6, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => 'To VIP Tech Suite'],
                                    ],
                                    'windows' => [
                                        ['id' => 'win-cyber-land-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.0, 'height' => 2.2, 'sill_height' => 0.6],
                                    ],
                                    'objects' => [],
                                ],
                            ],
                        ],
                    ],
                ],
            ],

            // -------------------------------------------------------------
            // 6. THE GRAND CELESTIAL SKYSCRAPER HOTEL & SUITES (20 Floors, 60 Rooms, High-Speed Elevator)
            // -------------------------------------------------------------
            $this->getHotelTemplate(),
        ];
    }

    /**
     * The Grand Celestial Skyscraper Hotel & Suites:
     * 20 Floors, 60 Suites & Rooms, Express High-Speed Elevator, Rooftop Observatory.
     *
     * @return array<string, mixed>
     */
    private function getHotelTemplate(): array
    {
        $floors = [];

        // -----------------------------------------------------------------
        // LEVEL 0: Ground Floor — Grand Atrium Lobby & Fine Dining (Elevation 0.0, Height 4.2m)
        // -----------------------------------------------------------------
        $floors[] = [
            'id' => 'hotel-floor-0',
            'name' => 'Ground Floor — Grand Atrium Lobby & Fine Dining',
            'level' => 0,
            'height' => 4.2,
            'elevation' => 0.0,
            'rooms' => [
                [
                    'id' => 'hotel-room-lobby',
                    'name' => 'Grand Atrium Lobby & 24h Concierge',
                    'type' => 'living',
                    'color' => '#d4af37',
                    'layout' => [
                        'size' => ['w' => 16.0, 'd' => 12.0, 'h' => 4.2],
                        'position' => ['x' => 0, 'z' => -1.0],
                        'theme' => [
                            'floor' => 'marble',
                            'floor_sound' => 'marble',
                            'wall' => 'stone',
                            'wall_color' => '#f8fafc',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.4,
                        ],
                        'doors' => [
                            ['id' => 'hotel-door-entrance', 'wall' => 'south', 'type' => 'double_french', 'offset' => 0, 'width' => 2.4, 'height' => 2.8, 'material' => 'glass', 'label' => 'Grand Hotel Entrance'],
                            ['id' => 'hotel-door-lobby-west', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 2.2, 'height' => 2.8, 'material' => 'wood', 'label' => 'Arch to Crystal Palm Lounge'],
                            ['id' => 'hotel-door-lobby-east', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 2.2, 'height' => 2.8, 'material' => 'wood', 'label' => 'Arch to L\'Étoile Fine Dining'],
                        ],
                        'windows' => [
                            ['id' => 'hotel-win-lobby-1', 'wall' => 'south', 'offset' => 5.2, 'width' => 3.2, 'height' => 2.6, 'sill_height' => 0.4],
                            ['id' => 'hotel-win-lobby-2', 'wall' => 'south', 'offset' => -5.2, 'width' => 3.2, 'height' => 2.6, 'sill_height' => 0.4],
                        ],
                        'objects' => [
                            ['id' => 'hotel-desk-reception', 'type' => 'block', 'x' => 0, 'z' => 2.2, 'rot' => 0, 'p' => ['w' => 4.2, 'd' => 1.0, 'h' => 1.1, 'color' => '#1e293b', 'material' => 'marble', 'collide' => true]],
                            ['id' => 'hotel-lobby-sofa-1', 'type' => 'sofa', 'x' => -4.5, 'z' => -1.5, 'rot' => 90, 'p' => ['w' => 3.2, 'color' => '#1e293b']],
                            ['id' => 'hotel-lobby-sofa-2', 'type' => 'sofa', 'x' => 4.5, 'z' => -1.5, 'rot' => 270, 'p' => ['w' => 3.2, 'color' => '#1e293b']],
                            ['id' => 'hotel-lobby-table-1', 'type' => 'table', 'x' => -4.5, 'z' => 0.4, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 1.0, 'material' => 'marble']],
                            ['id' => 'hotel-lobby-table-2', 'type' => 'table', 'x' => 4.5, 'z' => 0.4, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 1.0, 'material' => 'marble']],
                            ['id' => 'hotel-palm-1', 'type' => 'plant', 'x' => -6.8, 'z' => -4.8, 'rot' => 0, 'p' => ['s' => 1.5]],
                            ['id' => 'hotel-palm-2', 'type' => 'plant', 'x' => 6.8, 'z' => -4.8, 'rot' => 0, 'p' => ['s' => 1.5]],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-lounge',
                    'name' => 'The Crystal Palm Lounge & Cafe',
                    'type' => 'living',
                    'color' => '#a855f7',
                    'layout' => [
                        'size' => ['w' => 12.0, 'd' => 11.0, 'h' => 4.2],
                        'position' => ['x' => -14.0, 'z' => -1.0],
                        'theme' => [
                            'floor' => 'parquet',
                            'floor_sound' => 'wood',
                            'wall' => 'wood_panel',
                            'wall_color' => '#1e293b',
                            'ceiling' => 'coffered',
                            'ceiling_color' => '#0f172a',
                            'light' => 'warm',
                            'brightness' => 1.3,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-lounge-w1', 'wall' => 'west', 'offset' => 2.5, 'width' => 2.8, 'height' => 2.4, 'sill_height' => 0.5],
                            ['id' => 'hotel-win-lounge-w2', 'wall' => 'west', 'offset' => -2.5, 'width' => 2.8, 'height' => 2.4, 'sill_height' => 0.5],
                        ],
                        'objects' => [
                            ['id' => 'hotel-lounge-sofa-1', 'type' => 'sofa', 'x' => -2.0, 'z' => -2.0, 'rot' => 0, 'p' => ['w' => 3.0, 'color' => '#334155']],
                            ['id' => 'hotel-lounge-table-1', 'type' => 'table', 'x' => -2.0, 'z' => -0.5, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'marble']],
                            ['id' => 'hotel-lounge-bar', 'type' => 'block', 'x' => 3.5, 'z' => 2.0, 'rot' => 0, 'p' => ['w' => 3.2, 'd' => 0.9, 'h' => 1.1, 'color' => '#0f172a', 'material' => 'wood', 'collide' => true]],
                            ['id' => 'hotel-lounge-plant-1', 'type' => 'plant', 'x' => -4.8, 'z' => -4.2, 'rot' => 0, 'p' => ['s' => 1.3]],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-dining',
                    'name' => 'L\'Étoile Fine Dining Restaurant',
                    'type' => 'kitchen',
                    'color' => '#f59e0b',
                    'layout' => [
                        'size' => ['w' => 12.0, 'd' => 11.0, 'h' => 4.2],
                        'position' => ['x' => 14.0, 'z' => -1.0],
                        'theme' => [
                            'floor' => 'marble',
                            'floor_sound' => 'marble',
                            'wall' => 'plaster',
                            'wall_color' => '#fdf4ff',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.3,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-dining-e1', 'wall' => 'east', 'offset' => 2.5, 'width' => 2.8, 'height' => 2.4, 'sill_height' => 0.5],
                            ['id' => 'hotel-win-dining-e2', 'wall' => 'east', 'offset' => -2.5, 'width' => 2.8, 'height' => 2.4, 'sill_height' => 0.5],
                        ],
                        'objects' => [
                            ['id' => 'hotel-dining-tbl-1', 'type' => 'table', 'x' => -2.0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 1.1, 'material' => 'marble']],
                            ['id' => 'hotel-dining-tbl-2', 'type' => 'table', 'x' => 2.0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 1.1, 'material' => 'marble']],
                            ['id' => 'hotel-dining-chair-1', 'type' => 'chair', 'x' => -3.4, 'z' => -1.5, 'rot' => 90, 'p' => ['color' => '#991b1b']],
                            ['id' => 'hotel-dining-chair-2', 'type' => 'chair', 'x' => -0.6, 'z' => -1.5, 'rot' => 270, 'p' => ['color' => '#991b1b']],
                        ],
                    ],
                ],
            ],
        ];

        // -----------------------------------------------------------------
        // LEVEL 1: First Floor — Imperial Ballroom & Business Center (Elevation 4.2m, Height 3.8m)
        // -----------------------------------------------------------------
        $floors[] = [
            'id' => 'hotel-floor-1',
            'name' => 'First Floor — Imperial Ballroom & Conference Summit',
            'level' => 1,
            'height' => 3.8,
            'elevation' => 4.2,
            'rooms' => [
                [
                    'id' => 'hotel-room-ballroom',
                    'name' => 'Grand Imperial Ballroom & Gala Hall',
                    'type' => 'living',
                    'color' => '#e11d48',
                    'layout' => [
                        'size' => ['w' => 18.0, 'd' => 12.0, 'h' => 3.8],
                        'position' => ['x' => 0, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'hardwood',
                            'floor_sound' => 'wood',
                            'wall' => 'wood_panel',
                            'wall_color' => '#1e1b4b',
                            'ceiling' => 'coffered',
                            'ceiling_color' => '#0f172a',
                            'light' => 'warm',
                            'brightness' => 1.4,
                        ],
                        'doors' => [
                            ['id' => 'hotel-door-ballroom-w', 'wall' => 'west', 'type' => 'arch', 'offset' => 0, 'width' => 2.0, 'height' => 2.6, 'material' => 'wood', 'label' => 'To Boardroom'],
                            ['id' => 'hotel-door-ballroom-e', 'wall' => 'east', 'type' => 'arch', 'offset' => 0, 'width' => 2.0, 'height' => 2.6, 'material' => 'wood', 'label' => 'To Pre-Function Lounge'],
                        ],
                        'windows' => [
                            ['id' => 'hotel-win-ball-s1', 'wall' => 'south', 'offset' => 5.0, 'width' => 3.0, 'height' => 2.2, 'sill_height' => 0.6],
                            ['id' => 'hotel-win-ball-s2', 'wall' => 'south', 'offset' => -5.0, 'width' => 3.0, 'height' => 2.2, 'sill_height' => 0.6],
                        ],
                        'objects' => [
                            ['id' => 'hotel-ball-table', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 3.6, 'd' => 1.4, 'material' => 'marble']],
                            ['id' => 'hotel-ball-sofa-1', 'type' => 'sofa', 'x' => -6.0, 'z' => -2.0, 'rot' => 90, 'p' => ['w' => 3.2, 'color' => '#831843']],
                            ['id' => 'hotel-ball-sofa-2', 'type' => 'sofa', 'x' => 6.0, 'z' => -2.0, 'rot' => 270, 'p' => ['w' => 3.2, 'color' => '#831843']],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-boardroom',
                    'name' => 'Executive Summit Boardroom & Business Center',
                    'type' => 'living',
                    'color' => '#2563eb',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.8],
                        'position' => ['x' => -14.5, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'parquet',
                            'floor_sound' => 'wood',
                            'wall' => 'plaster',
                            'wall_color' => '#f1f5f9',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.2,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-board-w', 'wall' => 'west', 'offset' => 0, 'width' => 3.2, 'height' => 2.2, 'sill_height' => 0.6],
                        ],
                        'objects' => [
                            ['id' => 'hotel-conf-tbl', 'type' => 'table', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 4.0, 'd' => 1.6, 'material' => 'wood']],
                            ['id' => 'hotel-conf-chair-1', 'type' => 'chair', 'x' => -2.4, 'z' => 0, 'rot' => 90, 'p' => ['color' => '#1e293b']],
                            ['id' => 'hotel-conf-chair-2', 'type' => 'chair', 'x' => 2.4, 'z' => 0, 'rot' => 270, 'p' => ['color' => '#1e293b']],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-prefunction',
                    'name' => 'Pre-Function Gala Reception Lounge',
                    'type' => 'living',
                    'color' => '#7c3aed',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.8],
                        'position' => ['x' => 14.5, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'marble',
                            'floor_sound' => 'marble',
                            'wall' => 'plaster',
                            'wall_color' => '#faf5ff',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.3,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-pref-e', 'wall' => 'east', 'offset' => 0, 'width' => 3.2, 'height' => 2.2, 'sill_height' => 0.6],
                        ],
                        'objects' => [
                            ['id' => 'hotel-pref-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -2.0, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#4c1d95']],
                            ['id' => 'hotel-pref-table', 'type' => 'table', 'x' => 0, 'z' => -0.5, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'marble']],
                        ],
                    ],
                ],
            ],
        ];

        // -----------------------------------------------------------------
        // LEVEL 2: Second Floor — Azure Pool, Thermal Spa & Fitness (Elevation 8.0m, Height 3.8m)
        // -----------------------------------------------------------------
        $floors[] = [
            'id' => 'hotel-floor-2',
            'name' => 'Second Floor — Azure Horizon Pool, Spa & Fitness',
            'level' => 2,
            'height' => 3.8,
            'elevation' => 8.0,
            'rooms' => [
                [
                    'id' => 'hotel-room-pool',
                    'name' => 'The Azure Heated Indoor Horizon Pool',
                    'type' => 'balcony',
                    'color' => '#06b6d4',
                    'layout' => [
                        'size' => ['w' => 16.0, 'd' => 12.0, 'h' => 3.8],
                        'position' => ['x' => 0, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'tile',
                            'floor_sound' => 'marble',
                            'wall' => 'tile',
                            'wall_color' => '#ecfeff',
                            'ceiling' => 'open_sky',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.5,
                        ],
                        'doors' => [
                            ['id' => 'hotel-door-pool-spa', 'wall' => 'west', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.0, 'height' => 2.4, 'material' => 'glass', 'label' => 'To Thermal Spa'],
                            ['id' => 'hotel-door-pool-gym', 'wall' => 'east', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.0, 'height' => 2.4, 'material' => 'glass', 'label' => 'To Fitness Studio'],
                        ],
                        'windows' => [],
                        'objects' => [
                            ['id' => 'hotel-pool-sofa-1', 'type' => 'sofa', 'x' => -5.0, 'z' => 2.0, 'rot' => 0, 'p' => ['w' => 2.4, 'color' => '#0e7490']],
                            ['id' => 'hotel-pool-sofa-2', 'type' => 'sofa', 'x' => 5.0, 'z' => 2.0, 'rot' => 0, 'p' => ['w' => 2.4, 'color' => '#0e7490']],
                            ['id' => 'hotel-pool-plant-1', 'type' => 'plant', 'x' => -6.5, 'z' => -4.5, 'rot' => 0, 'p' => ['s' => 1.4]],
                            ['id' => 'hotel-pool-plant-2', 'type' => 'plant', 'x' => 6.5, 'z' => -4.5, 'rot' => 0, 'p' => ['s' => 1.4]],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-spa',
                    'name' => 'Lotus Wellness & Thermal Spa',
                    'type' => 'living',
                    'color' => '#14b8a6',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.8],
                        'position' => ['x' => -13.5, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'parquet',
                            'floor_sound' => 'wood',
                            'wall' => 'wood_panel',
                            'wall_color' => '#134e4a',
                            'ceiling' => 'coffered',
                            'ceiling_color' => '#042f2e',
                            'light' => 'warm',
                            'brightness' => 1.2,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-spa-w', 'wall' => 'west', 'offset' => 0, 'width' => 2.8, 'height' => 2.0, 'sill_height' => 0.6],
                        ],
                        'objects' => [
                            ['id' => 'hotel-spa-sofa', 'type' => 'sofa', 'x' => 0, 'z' => -1.5, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#115e59']],
                            ['id' => 'hotel-spa-table', 'type' => 'table', 'x' => 0, 'z' => 0.5, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'wood']],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-gym',
                    'name' => 'Skyline Fitness & Private Studio',
                    'type' => 'living',
                    'color' => '#f97316',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.8],
                        'position' => ['x' => 13.5, 'z' => -1.5],
                        'theme' => [
                            'floor' => 'hardwood',
                            'floor_sound' => 'wood',
                            'wall' => 'plaster',
                            'wall_color' => '#f8fafc',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.3,
                        ],
                        'doors' => [],
                        'windows' => [
                            ['id' => 'hotel-win-gym-e', 'wall' => 'east', 'offset' => 0, 'width' => 2.8, 'height' => 2.0, 'sill_height' => 0.6],
                        ],
                        'objects' => [
                            ['id' => 'hotel-gym-bench', 'type' => 'block', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => ['w' => 2.2, 'd' => 0.8, 'h' => 0.6, 'color' => '#1e293b', 'material' => 'wood', 'collide' => true]],
                            ['id' => 'hotel-gym-rack', 'type' => 'block', 'x' => 3.5, 'z' => 2.0, 'rot' => 0, 'p' => ['w' => 1.8, 'd' => 0.8, 'h' => 1.2, 'color' => '#334155', 'material' => 'wood', 'collide' => true]],
                        ],
                    ],
                ],
            ],
        ];

        // -----------------------------------------------------------------
        // LEVELS 3 to 18: 16 Luxury Hotel Suite Floors (3 Suites per Floor = 48 Suites)
        // -----------------------------------------------------------------
        $suiteThemeTitles = [
            3 => 'Executive Suite Collection',
            4 => 'Executive Suite Collection',
            5 => 'Premium Horizon Suites',
            6 => 'Premium Horizon Suites',
            7 => 'Royal Palace Suites',
            8 => 'Royal Palace Suites',
            9 => 'Skyline Panorama Suites',
            10 => 'Skyline Panorama Suites',
            11 => 'Ambassador Diplomatic Suites',
            12 => 'Ambassador Diplomatic Suites',
            13 => 'Diplomatic Grand Suites',
            14 => 'Diplomatic Grand Suites',
            15 => 'Imperial Crown Suites',
            16 => 'Imperial Crown Suites',
            17 => 'Celestial Panorama Suites',
            18 => 'Celestial Panorama Suites',
        ];

        for ($lvl = 3; $lvl <= 18; $lvl++) {
            $elevation = round(8.0 + ($lvl - 2) * 3.4, 2);
            $themeTitle = $suiteThemeTitles[$lvl] ?? 'Luxury Suites';

            $floors[] = [
                'id' => "hotel-floor-{$lvl}",
                'name' => "Floor {$lvl} — {$themeTitle} ({$lvl}01, {$lvl}02, {$lvl}03)",
                'level' => $lvl,
                'height' => 3.4,
                'elevation' => $elevation,
                'rooms' => [
                    // Suite A: Master Bedroom
                    [
                        'id' => "hotel-room-suite-{$lvl}01",
                        'name' => "Suite {$lvl}01 — King Master Bedroom Suite",
                        'type' => 'bedroom',
                        'color' => '#6366f1',
                        'layout' => [
                            'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.4],
                            'position' => ['x' => -9.0, 'z' => -2.0],
                            'theme' => [
                                'floor' => 'parquet',
                                'floor_sound' => 'wood',
                                'wall' => 'plaster',
                                'wall_color' => '#f1f5f9',
                                'ceiling' => 'coffered',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.2,
                            ],
                            'doors' => [
                                ['id' => "door-suite-{$lvl}01-corr", 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => "Suite {$lvl}01 Entrance"],
                                ['id' => "door-suite-{$lvl}01-terrace", 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'glass', 'label' => 'Terrace Glass Door'],
                            ],
                            'windows' => [
                                ['id' => "win-suite-{$lvl}01-s", 'wall' => 'south', 'offset' => 0, 'width' => 3.2, 'height' => 2.0, 'sill_height' => 0.5],
                                ['id' => "win-suite-{$lvl}01-w", 'wall' => 'west', 'offset' => 0, 'width' => 2.8, 'height' => 2.0, 'sill_height' => 0.5],
                            ],
                            'objects' => [
                                ['id' => "bed-{$lvl}01", 'type' => 'sofa', 'x' => -1.8, 'z' => -2.2, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#1e293b']],
                                ['id' => "sofa-{$lvl}01", 'type' => 'sofa', 'x' => 2.2, 'z' => 1.2, 'rot' => 270, 'p' => ['w' => 2.0, 'color' => '#334155']],
                                ['id' => "table-{$lvl}01", 'type' => 'table', 'x' => 0.5, 'z' => 1.2, 'rot' => 0, 'p' => ['w' => 1.2, 'd' => 0.8, 'material' => 'marble']],
                                ['id' => "plant-{$lvl}01", 'type' => 'plant', 'x' => -4.2, 'z' => 3.0, 'rot' => 0, 'p' => ['s' => 1.2]],
                            ],
                        ],
                    ],

                    // Suite B: Living & Dining Salon
                    [
                        'id' => "hotel-room-suite-{$lvl}02",
                        'name' => "Suite {$lvl}02 — Executive Living & Dining Salon",
                        'type' => 'living',
                        'color' => '#3b82f6',
                        'layout' => [
                            'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 3.4],
                            'position' => ['x' => 9.0, 'z' => -2.0],
                            'theme' => [
                                'floor' => 'marble',
                                'floor_sound' => 'marble',
                                'wall' => 'plaster',
                                'wall_color' => '#f8fafc',
                                'ceiling' => 'gypsum_led',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.2,
                            ],
                            'doors' => [
                                ['id' => "door-suite-{$lvl}02-corr", 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.2, 'height' => 2.4, 'material' => 'wood', 'label' => "Suite {$lvl}02 Entrance"],
                                ['id' => "door-suite-{$lvl}02-terrace", 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.4, 'height' => 2.4, 'material' => 'glass', 'label' => 'Terrace Glass Door'],
                            ],
                            'windows' => [
                                ['id' => "win-suite-{$lvl}02-s", 'wall' => 'south', 'offset' => 0, 'width' => 3.2, 'height' => 2.0, 'sill_height' => 0.5],
                                ['id' => "win-suite-{$lvl}02-e", 'wall' => 'east', 'offset' => 0, 'width' => 2.8, 'height' => 2.0, 'sill_height' => 0.5],
                            ],
                            'objects' => [
                                ['id' => "sofa-{$lvl}02", 'type' => 'sofa', 'x' => 0, 'z' => -2.0, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#1e293b']],
                                ['id' => "table-{$lvl}02", 'type' => 'table', 'x' => 0, 'z' => -0.2, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'marble']],
                                ['id' => "bar-{$lvl}02", 'type' => 'block', 'x' => 3.2, 'z' => 2.2, 'rot' => 0, 'p' => ['w' => 2.0, 'd' => 0.8, 'h' => 1.0, 'color' => '#0f172a', 'material' => 'wood', 'collide' => true]],
                                ['id' => "plant-{$lvl}02", 'type' => 'plant', 'x' => 4.0, 'z' => -3.0, 'rot' => 0, 'p' => ['s' => 1.2]],
                            ],
                        ],
                    ],

                    // Suite C: Skyline Panoramic Suite & Terrace
                    [
                        'id' => "hotel-room-suite-{$lvl}03",
                        'name' => "Suite {$lvl}03 — Skyline Panoramic Suite & Terrace",
                        'type' => 'balcony',
                        'color' => '#f59e0b',
                        'layout' => [
                            'size' => ['w' => 14.0, 'd' => 6.0, 'h' => 3.2],
                            'position' => ['x' => 0.0, 'z' => -8.5],
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
                                ['id' => "terrace-sofa-{$lvl}", 'type' => 'sofa', 'x' => 0, 'z' => 0.5, 'rot' => 0, 'p' => ['w' => 2.8, 'color' => '#334155']],
                                ['id' => "terrace-tbl-{$lvl}", 'type' => 'table', 'x' => 0, 'z' => 1.8, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.8, 'material' => 'wood']],
                                ['id' => "terrace-plant-1-{$lvl}", 'type' => 'plant', 'x' => -5.5, 'z' => 0.5, 'rot' => 0, 'p' => ['s' => 1.3]],
                                ['id' => "terrace-plant-2-{$lvl}", 'type' => 'plant', 'x' => 5.5, 'z' => 0.5, 'rot' => 0, 'p' => ['s' => 1.3]],
                            ],
                        ],
                    ],
                ],
            ];
        }

        // -----------------------------------------------------------------
        // LEVEL 19: Floor 20 — Presidential Sky Penthouse & Observatory (Elevation 65.8m, Height 4.2m)
        // -----------------------------------------------------------------
        $floors[] = [
            'id' => 'hotel-floor-19',
            'name' => 'Floor 19 — Presidential Sky Penthouse & Rooftop Observatory',
            'level' => 19,
            'height' => 4.2,
            'elevation' => 65.8,
            'rooms' => [
                [
                    'id' => 'hotel-room-suite-1901',
                    'name' => 'Suite 1901 — Presidential Sky Penthouse Master Bedroom',
                    'type' => 'bedroom',
                    'color' => '#8b5cf6',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 4.2],
                        'position' => ['x' => -9.0, 'z' => -2.0],
                        'theme' => [
                            'floor' => 'parquet',
                            'floor_sound' => 'wood',
                            'wall' => 'wood_panel',
                            'wall_color' => '#1e1b4b',
                            'ceiling' => 'coffered',
                            'ceiling_color' => '#0f172a',
                            'light' => 'warm',
                            'brightness' => 1.4,
                        ],
                        'doors' => [
                            ['id' => 'door-suite-1901-corr', 'wall' => 'east', 'type' => 'standard', 'offset' => 0, 'width' => 1.4, 'height' => 2.6, 'material' => 'wood', 'label' => 'Presidential Master Suite'],
                            ['id' => 'door-suite-1901-deck', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.8, 'height' => 2.6, 'material' => 'glass', 'label' => 'To Sunset Sky Deck'],
                        ],
                        'windows' => [
                            ['id' => 'win-suite-1901-s', 'wall' => 'south', 'offset' => 0, 'width' => 3.6, 'height' => 2.4, 'sill_height' => 0.4],
                            ['id' => 'win-suite-1901-w', 'wall' => 'west', 'offset' => 0, 'width' => 3.2, 'height' => 2.4, 'sill_height' => 0.4],
                        ],
                        'objects' => [
                            ['id' => 'bed-1901', 'type' => 'sofa', 'x' => -1.8, 'z' => -2.2, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#1e1b4b']],
                            ['id' => 'sofa-1901', 'type' => 'sofa', 'x' => 2.2, 'z' => 1.2, 'rot' => 270, 'p' => ['w' => 2.2, 'color' => '#312e81']],
                            ['id' => 'table-1901', 'type' => 'table', 'x' => 0.5, 'z' => 1.2, 'rot' => 0, 'p' => ['w' => 1.4, 'd' => 0.9, 'material' => 'marble']],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-suite-1902',
                    'name' => 'Suite 1902 — Presidential Grand Salon & Sky Bar',
                    'type' => 'living',
                    'color' => '#ec4899',
                    'layout' => [
                        'size' => ['w' => 11.0, 'd' => 9.0, 'h' => 4.2],
                        'position' => ['x' => 9.0, 'z' => -2.0],
                        'theme' => [
                            'floor' => 'marble',
                            'floor_sound' => 'marble',
                            'wall' => 'plaster',
                            'wall_color' => '#0f172a',
                            'ceiling' => 'gypsum_led',
                            'ceiling_color' => '#020617',
                            'light' => 'warm',
                            'brightness' => 1.3,
                        ],
                        'doors' => [
                            ['id' => 'door-suite-1902-corr', 'wall' => 'west', 'type' => 'standard', 'offset' => 0, 'width' => 1.4, 'height' => 2.6, 'material' => 'wood', 'label' => 'Presidential Salon Entrance'],
                            ['id' => 'door-suite-1902-deck', 'wall' => 'north', 'type' => 'sliding_glass', 'offset' => 0, 'width' => 2.8, 'height' => 2.6, 'material' => 'glass', 'label' => 'To Sunset Sky Deck'],
                        ],
                        'windows' => [
                            ['id' => 'win-suite-1902-s', 'wall' => 'south', 'offset' => 0, 'width' => 3.6, 'height' => 2.4, 'sill_height' => 0.4],
                            ['id' => 'win-suite-1902-e', 'wall' => 'east', 'offset' => 0, 'width' => 3.2, 'height' => 2.4, 'sill_height' => 0.4],
                        ],
                        'objects' => [
                            ['id' => 'sofa-1902', 'type' => 'sofa', 'x' => 0, 'z' => -2.0, 'rot' => 0, 'p' => ['w' => 3.6, 'color' => '#831843']],
                            ['id' => 'table-1902', 'type' => 'table', 'x' => 0, 'z' => -0.2, 'rot' => 0, 'p' => ['w' => 1.8, 'd' => 1.0, 'material' => 'marble']],
                            ['id' => 'sky-bar-1902', 'type' => 'block', 'x' => 3.2, 'z' => 2.2, 'rot' => 0, 'p' => ['w' => 2.4, 'd' => 0.9, 'h' => 1.1, 'color' => '#0f172a', 'material' => 'wood', 'collide' => true]],
                        ],
                    ],
                ],
                [
                    'id' => 'hotel-room-suite-1903',
                    'name' => 'Suite 1903 — 360° Rooftop Observatory & Sunset Sky Deck',
                    'type' => 'balcony',
                    'color' => '#d97706',
                    'layout' => [
                        'size' => ['w' => 16.0, 'd' => 7.0, 'h' => 3.6],
                        'position' => ['x' => 0.0, 'z' => -8.5],
                        'theme' => [
                            'floor' => 'tile',
                            'floor_sound' => 'marble',
                            'wall' => 'plaster',
                            'wall_color' => '#cbd5e1',
                            'ceiling' => 'open_sky',
                            'ceiling_color' => '#ffffff',
                            'light' => 'warm',
                            'brightness' => 1.5,
                        ],
                        'doors' => [],
                        'windows' => [],
                        'objects' => [
                            ['id' => 'sky-lounge-1903', 'type' => 'sofa', 'x' => 0, 'z' => 0.8, 'rot' => 0, 'p' => ['w' => 3.2, 'color' => '#1e293b']],
                            ['id' => 'sky-table-1903', 'type' => 'table', 'x' => 0, 'z' => 2.2, 'rot' => 0, 'p' => ['w' => 1.6, 'd' => 0.9, 'material' => 'wood']],
                            ['id' => 'sky-plant-1-1903', 'type' => 'plant', 'x' => -6.5, 'z' => 0.8, 'rot' => 0, 'p' => ['s' => 1.4]],
                            ['id' => 'sky-plant-2-1903', 'type' => 'plant', 'x' => 6.5, 'z' => 0.8, 'rot' => 0, 'p' => ['s' => 1.4]],
                        ],
                    ],
                ],
            ],
        ];

        return [
            'title' => 'The Grand Celestial Hotel & Luxury Suites',
            'slug' => 'grand-celestial-hotel',
            'description' => 'A soaring 20-story luxury skyscraper hotel featuring 60 expansive suites and rooms, grand double-height atrium lobby, heated indoor horizon pool, luxury spa, high-speed elevator system connecting all 20 floors, presidential sky penthouses, and a 360-degree rooftop observatory deck.',
            'thumbnail' => '/images/hotel-grand-celestial.jpg',
            'status' => 'published',
            'is_default' => false,
            'plot_width' => 55.0,
            'plot_depth' => 45.0,
            'environment' => [
                'sky' => 'sunset',
                'sun_elevation' => 32,
                'fog_density' => 0.001,
                'ambient_sound' => 'wind_gentle',
                'stairs' => [
                    [
                        'id' => 'stairs-hotel-foyer',
                        'name' => 'Grand Foyer Stairs (Level 0 ➔ Level 1)',
                        'startX' => -9.5,
                        'startY' => 0.0,
                        'startZ' => 2.2,
                        'endX' => -9.5,
                        'endY' => 4.2,
                        'endZ' => -2.2,
                        'width' => 1.6,
                        'steps' => 22,
                        'style' => 'marble_modern',
                    ],
                ],
                'elevators' => [
                    [
                        'id' => 'elevator-celestial-main',
                        'name' => 'High-Speed Luxury Glass Elevator (Floors 0-19)',
                        'x' => 0.0,
                        'z' => -3.6,
                        'width' => 3.6,
                        'depth' => 3.6,
                        'height' => 3.2,
                        'facing' => 'south',
                        'floors' => range(0, 19),
                    ],
                ],
            ],
            'floors_data' => $floors,
        ];
    }
}
