<?php

namespace Tests\Feature;

use App\Models\House;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseViewerTest extends TestCase
{
    use RefreshDatabase;

    public function test_house_page_loads_with_embedded_house_data(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('3D House Builder')
            ->assertSee('house-data', false)
            ->assertSee('game-canvas', false);
    }

    public function test_house_page_embeds_floors_and_rooms(): void
    {
        $house = House::create([
            'title' => 'Skyline Duplex',
            'slug' => 'skyline-duplex',
            'status' => 'published',
            'is_default' => true,
            'plot_width' => 26,
            'plot_depth' => 22,
            'floors_data' => House::defaultFloors(),
        ]);

        $this->get('/')
            ->assertOk()
            ->assertSee('Skyline Duplex')
            ->assertSee('Ground Floor')
            ->assertSee('First Floor');
    }
}
