<?php

namespace Tests\Feature;

use App\Models\House;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HouseProjectTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'email' => 'admin@example.com',
        ]);
    }

    public function test_can_view_default_house_3d_showcase(): void
    {
        $house = House::create([
            'title' => 'Coastal Minimalist Villa',
            'slug' => 'coastal-minimalist-villa',
            'description' => 'A clean modern villa with ocean views.',
            'status' => 'published',
            'is_default' => true,
            'plot_width' => 30,
            'plot_depth' => 24,
            'floors_data' => House::defaultFloors(),
        ]);

        $response = $this->get('/');
        $response->assertOk();
        $response->assertSee('Coastal Minimalist Villa');
        $response->assertSee('3D House Builder');
    }

    public function test_can_view_house_by_slug(): void
    {
        $house = House::create([
            'title' => 'Mountain Chalet',
            'slug' => 'mountain-chalet',
            'description' => 'A luxury mountain getaway with timber ceilings.',
            'status' => 'published',
            'is_default' => false,
            'plot_width' => 24,
            'plot_depth' => 20,
            'floors_data' => House::defaultFloors(),
        ]);

        $response = $this->get('/house/mountain-chalet');
        $response->assertOk();
        $response->assertSee('Mountain Chalet');
    }

    public function test_api_lists_published_houses(): void
    {
        House::create([
            'title' => 'House Alpha',
            'slug' => 'house-alpha',
            'status' => 'published',
            'floors_data' => House::defaultFloors(),
        ]);

        House::create([
            'title' => 'House Beta (Draft)',
            'slug' => 'house-beta',
            'status' => 'draft',
            'floors_data' => House::defaultFloors(),
        ]);

        $response = $this->getJson('/api/houses');
        $response->assertOk();
        $response->assertJsonCount(1, 'houses');
        $response->assertJsonFragment(['title' => 'House Alpha']);
        $response->assertJsonMissing(['title' => 'House Beta (Draft)']);
    }

    public function test_admin_can_list_houses(): void
    {
        $this->actingAs($this->admin());

        House::create([
            'title' => 'Suburban House',
            'slug' => 'suburban-house',
            'status' => 'published',
            'floors_data' => House::defaultFloors(),
        ]);

        $response = $this->getJson('/admin/houses');
        $response->assertOk();
        $response->assertJsonStructure([
            'houses' => [
                '*' => ['id', 'title', 'slug', 'status', 'is_default', 'floors_count', 'rooms_count'],
            ],
            'library',
        ]);
    }

    public function test_admin_can_create_new_house_project(): void
    {
        $this->actingAs($this->admin());

        $response = $this->postJson('/admin/houses', [
            'title' => 'Nordic Pine Villa',
            'description' => 'Eco-friendly residence with wood beams and gypsum cove lighting.',
            'template' => 'villa',
            'plot_width' => 32,
            'plot_depth' => 26,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('houses', ['title' => 'Nordic Pine Villa', 'slug' => 'nordic-pine-villa']);
    }

    public function test_admin_can_update_house_floors_rooms_doors_and_ceilings(): void
    {
        $this->actingAs($this->admin());

        $house = House::create([
            'title' => 'Architectural Showcase',
            'slug' => 'arch-showcase',
            'status' => 'published',
            'plot_width' => 28,
            'plot_depth' => 24,
            'floors_data' => [
                [
                    'id' => 'floor-0',
                    'name' => 'Ground Floor',
                    'level' => 0,
                    'height' => 3.4,
                    'elevation' => 0.0,
                    'rooms' => [
                        [
                            'id' => 'room-grand-salon',
                            'name' => 'Grand Salon',
                            'type' => 'living',
                            'color' => '#3b82f6',
                            'layout' => [
                                'size' => ['w' => 14.0, 'd' => 10.0, 'h' => 3.4],
                                'position' => ['x' => 0, 'z' => 0],
                                'theme' => [
                                    'floor' => 'parquet',
                                    'ceiling' => 'gypsum_led',
                                    'wall' => 'plaster',
                                    'wall_color' => '#ffffff',
                                ],
                                'doors' => [
                                    [
                                        'id' => 'door-main',
                                        'wall' => 'south',
                                        'type' => 'front_entrance',
                                        'offset' => 0,
                                        'width' => 1.8,
                                        'height' => 2.4,
                                        'material' => 'wood',
                                        'label' => 'Main Security Pivot Door',
                                    ],
                                    [
                                        'id' => 'door-patio',
                                        'wall' => 'north',
                                        'type' => 'sliding_glass',
                                        'offset' => 2.0,
                                        'width' => 3.0,
                                        'height' => 2.4,
                                        'material' => 'glass',
                                        'label' => 'Sliding Patio Door',
                                    ],
                                ],
                                'windows' => [
                                    [
                                        'id' => 'win-west',
                                        'wall' => 'west',
                                        'offset' => 0,
                                        'width' => 2.4,
                                        'height' => 1.8,
                                        'sill_height' => 0.6,
                                    ],
                                ],
                                'objects' => [],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $updatedFloors = $house->floors_data;
        $updatedFloors[0]['rooms'][0]['layout']['theme']['ceiling'] = 'coffered';
        $updatedFloors[0]['rooms'][0]['layout']['theme']['floor'] = 'marble';

        $response = $this->putJson("/admin/houses/{$house->id}", [
            'title' => 'Architectural Showcase Updated',
            'floors' => $updatedFloors,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('houses', ['title' => 'Architectural Showcase Updated']);

        $refreshed = House::find($house->id);
        $this->assertSame('coffered', $refreshed->floors_data[0]['rooms'][0]['layout']['theme']['ceiling']);
        $this->assertSame('marble', $refreshed->floors_data[0]['rooms'][0]['layout']['theme']['floor']);
        $this->assertCount(2, $refreshed->floors_data[0]['rooms'][0]['layout']['doors']);
    }

    public function test_admin_can_clone_house_project(): void
    {
        $this->actingAs($this->admin());

        $house = House::create([
            'title' => 'Original Villa',
            'slug' => 'original-villa',
            'status' => 'published',
            'floors_data' => House::defaultFloors(),
        ]);

        $response = $this->postJson("/admin/houses/{$house->id}/clone");
        $response->assertOk();

        $this->assertDatabaseHas('houses', ['title' => 'Copy of Original Villa']);
    }

    public function test_admin_can_set_default_showcase(): void
    {
        $this->actingAs($this->admin());

        $h1 = House::create(['title' => 'House 1', 'slug' => 'h1', 'is_default' => true]);
        $h2 = House::create(['title' => 'House 2', 'slug' => 'h2', 'is_default' => false]);

        $response = $this->postJson("/admin/houses/{$h2->id}/default");
        $response->assertOk();

        $this->assertTrue($h2->fresh()->is_default);
        $this->assertFalse($h1->fresh()->is_default);
    }
}
