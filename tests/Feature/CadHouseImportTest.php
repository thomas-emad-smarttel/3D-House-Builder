<?php

namespace Tests\Feature;

use App\Models\House;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CadHouseImportTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create();
    }

    public function test_guest_cannot_import_cad_house(): void
    {
        $response = $this->postJson('/admin/houses/import-cad', []);
        $response->assertUnauthorized();
    }

    public function test_validates_required_file(): void
    {
        $this->actingAs($this->admin());

        $response = $this->postJson('/admin/houses/import-cad', []);
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_rejects_unsupported_file_extension(): void
    {
        $this->actingAs($this->admin());
        Storage::fake('public');

        $file = UploadedFile::fake()->create('blueprint.pdf', 500, 'application/pdf');

        $response = $this->postJson('/admin/houses/import-cad', [
            'file' => $file,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonFragment([
            'message' => "Unsupported CAD format '.pdf'. Supported formats: obj, glb, gltf, dxf",
        ]);
    }

    public function test_can_import_obj_house_with_dimensions_and_bounding_box(): void
    {
        $this->actingAs($this->admin());
        Storage::fake('public');

        // Sample Wavefront OBJ of a house box (10m x 4m x 8m)
        $objContent = <<<'OBJ'
# Architectural House Model
v 0.0 0.0 0.0
v 10.0 0.0 0.0
v 10.0 4.0 0.0
v 0.0 4.0 0.0
v 0.0 0.0 8.0
v 10.0 0.0 8.0
v 10.0 4.0 8.0
v 0.0 4.0 8.0
f 1 2 3 4
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
OBJ;

        $file = UploadedFile::fake()->createWithContent('modern_villa.obj', $objContent);

        $response = $this->postJson('/admin/houses/import-cad', [
            'file' => $file,
            'title' => 'Imported Modern Villa',
            'unit_scale' => 'm',
            'ground_preset' => 'grass',
            'sky_preset' => 'golden_hour',
            'plot_padding' => 6,
        ]);

        $response->assertCreated();
        $response->assertJsonStructure([
            'message',
            'house' => [
                'id',
                'title',
                'slug',
                'plot_width',
                'plot_depth',
                'environment',
                'floors',
            ],
            'details' => [
                'format',
                'width',
                'height',
                'depth',
                'plot_width',
                'plot_depth',
            ],
        ]);

        $house = House::where('title', 'Imported Modern Villa')->first();
        $this->assertNotNull($house);
        $this->assertEquals(22.0, (float) $house->plot_width); // 10 + 6*2 = 22
        $this->assertEquals(20.0, (float) $house->plot_depth); // 8 + 6*2 = 20
        $this->assertArrayHasKey('cad_model', $house->environment);
        $this->assertEquals('obj', $house->environment['cad_model']['format']);
        $this->assertEquals(10.0, $house->environment['cad_model']['dimensions']['w']);
        $this->assertEquals(4.0, $house->environment['cad_model']['dimensions']['h']);
        $this->assertEquals(8.0, $house->environment['cad_model']['dimensions']['d']);
    }

    public function test_can_import_obj_with_companion_mtl(): void
    {
        $this->actingAs($this->admin());
        Storage::fake('public');

        $objContent = "v 0 0 0\nv 12 0 0\nv 12 3.5 0\nv 0 3.5 0\nv 0 0 10\nv 12 0 10\nv 12 3.5 10\nv 0 3.5 10\nf 1 2 3 4\n";
        $mtlContent = "newmtl WallPlaster\nKd 0.9 0.9 0.9\n";

        $objFile = UploadedFile::fake()->createWithContent('penthouse.obj', $objContent);
        $mtlFile = UploadedFile::fake()->createWithContent('penthouse.mtl', $mtlContent);

        $response = $this->postJson('/admin/houses/import-cad', [
            'file' => $objFile,
            'mtl_file' => $mtlFile,
            'title' => 'Skyline Penthouse',
        ]);

        $response->assertCreated();
        $house = House::where('title', 'Skyline Penthouse')->first();
        $this->assertNotNull($house);
        $this->assertNotNull($house->environment['cad_model']['mtl_path']);
    }

    public function test_auto_detects_millimeter_scale(): void
    {
        $this->actingAs($this->admin());
        Storage::fake('public');

        // House model exported in millimeters: 15000mm x 3500mm x 12000mm
        $objContent = "v 0 0 0\nv 15000 0 0\nv 15000 3500 0\nv 0 3500 0\nv 0 0 12000\nv 15000 0 12000\nv 15000 3500 12000\nv 0 3500 12000\nf 1 2 3 4\n";
        $file = UploadedFile::fake()->createWithContent('autocad_house_mm.obj', $objContent);

        $response = $this->postJson('/admin/houses/import-cad', [
            'file' => $file,
            'unit_scale' => 'auto',
        ]);

        $response->assertCreated();
        $house = House::latest('id')->first();
        $this->assertNotNull($house);
        $this->assertEquals(15.0, (float) $house->environment['cad_model']['dimensions']['w']);
        $this->assertEquals(3.5, (float) $house->environment['cad_model']['dimensions']['h']);
        $this->assertEquals(12.0, (float) $house->environment['cad_model']['dimensions']['d']);
    }
}
