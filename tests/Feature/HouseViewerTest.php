<?php

namespace Tests\Feature;

use App\Models\House;
use Database\Seeders\HouseSeeder;
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
            ->assertSee('Main Living Room');
    }

    public function test_house_seeder_populates_rich_multi_floor_templates(): void
    {
        $this->seed(HouseSeeder::class);

        $defaultHouse = House::where('is_default', true)->first();
        $this->assertNotNull($defaultHouse);
        $this->assertSame('modern-luxury-villa', $defaultHouse->slug);
        $this->assertCount(3, $defaultHouse->floors);
        $this->assertNotEmpty($defaultHouse->stairs);

        $response = $this->get('/house/modern-luxury-villa');
        $response->assertOk();
        $response->assertSee('Modern Luxury Villa');
        $response->assertSee('Penthouse Sky Lounge');
        $response->assertSee('stairs-foyer-l0-l1');
    }
}
