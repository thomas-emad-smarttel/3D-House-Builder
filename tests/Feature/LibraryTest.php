<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\RarExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LibraryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create();
    }

    public function test_unauthenticated_cannot_access_library_endpoints(): void
    {
        $this->getJson('/admin/library')->assertUnauthorized();
        $this->getJson('/admin/library/desk')->assertUnauthorized();
        $this->postJson('/admin/library/import')->assertUnauthorized();
        $this->deleteJson('/admin/library/desk')->assertUnauthorized();
    }

    public function test_admin_can_list_library_objects_and_filters(): void
    {
        $this->actingAs($this->admin());

        $res = $this->getJson('/admin/library')->assertOk();
        $res->assertJsonStructure(['objects', 'categories', 'file_types']);

        $objects = $res->json('objects');
        $this->assertGreaterThanOrEqual(20, count($objects));

        // Test filtering by file_type
        $builtins = $this->getJson('/admin/library?file_type=builtin')->assertOk()->json('objects');
        $this->assertNotEmpty($builtins);
        $this->assertTrue(collect($builtins)->every(fn ($o) => $o['file_type'] === 'builtin'));

        // Test searching by name
        $desks = $this->getJson('/admin/library?q=desk')->assertOk()->json('objects');
        $this->assertNotEmpty($desks);
        $this->assertTrue(collect($desks)->contains(fn ($o) => str_contains(strtolower($o['name']), 'desk')));
    }

    public function test_admin_can_view_single_object_and_usage(): void
    {
        $this->actingAs($this->admin());

        $res = $this->getJson('/admin/library/desk')->assertOk();
        $res->assertJsonPath('object.id', 'desk');
        $res->assertJsonStructure(['object', 'usage']);
    }

    public function test_import_valid_svg_object(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="10" y="10" width="180" height="80" fill="#38bdf8"/></svg>';
        $file = UploadedFile::fake()->createWithContent('modern-couch.svg', $svgContent);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'Modern Couch',
            'category' => 'Furniture',
        ])->assertCreated();

        $res->assertJsonPath('object.name', 'Modern Couch');
        $res->assertJsonPath('object.file_type', 'svg');
        $res->assertJsonPath('object.category', 'Furniture');

        $objId = $res->json('object.id');
        $filePath = $res->json('object.file_path');
        $this->assertNotNull($filePath);

        // Verify file is stored in public disk
        $relPath = str_replace('storage/', '', $filePath);
        Storage::disk('public')->assertExists($relPath);

        // Verify object appears in Library list
        $list = $this->getJson('/admin/library')->json('objects');
        $this->assertTrue(collect($list)->contains(fn ($o) => $o['id'] === $objId));
    }

    public function test_import_svg_with_malicious_scripts_is_sanitized(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><script>alert("XSS")</script><circle cx="50" cy="50" r="40" onload="alert(1)" fill="red"/></svg>';
        $file = UploadedFile::fake()->createWithContent('malicious.svg', $maliciousSvg);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'Cleaned Object',
        ])->assertCreated();

        $storedSvg = $res->json('object.thumbnail_path');
        $this->assertStringNotContainsString('<script', $storedSvg);
        $this->assertStringNotContainsString('onload', $storedSvg);
        $this->assertStringContainsString('<circle', $storedSvg);
    }

    public function test_import_invalid_svg_file_fails_validation(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $brokenSvg = 'not an xml svg at all';
        $file = UploadedFile::fake()->createWithContent('broken.svg', $brokenSvg);

        $this->postJson('/admin/library/import', [
            'file' => $file,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_import_valid_dxf_cad_object(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $dxfContent = implode("\n", [
            '0', 'SECTION',
            '2', 'HEADER',
            '0', 'ENDSEC',
            '0', 'SECTION',
            '2', 'ENTITIES',
            '0', 'LINE',
            '8', 'WALLS',
            '10', '0.0',
            '20', '0.0',
            '30', '0.0',
            '11', '6.0',
            '21', '4.0',
            '31', '0.0',
            '0', 'CIRCLE',
            '8', 'PILLARS',
            '10', '3.0',
            '20', '2.0',
            '40', '0.8',
            '0', 'ENDSEC',
            '0', 'EOF',
        ]);

        $file = UploadedFile::fake()->createWithContent('floor-plan.dxf', $dxfContent);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'CAD Floor Plan',
            'category' => 'Structure',
        ])->assertCreated();

        $res->assertJsonPath('object.name', 'CAD Floor Plan');
        $res->assertJsonPath('object.file_type', 'dxf');
        $this->assertGreaterThanOrEqual(2, $res->json('object.metadata.entities_count'));
        $this->assertNotEmpty($res->json('object.thumbnail_path'));
    }

    public function test_import_dwg_returns_informative_error_guiding_user(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $file = UploadedFile::fake()->createWithContent('model.dwg', 'binarydwgdata');

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
        ])->assertStatus(422);

        $errorMsg = $res->json('errors.file');
        $this->assertStringContainsString('DWG is an Autodesk proprietary binary format', $errorMsg);
        $this->assertStringContainsString('DXF', $errorMsg);
    }

    public function test_library_object_can_be_placed_in_room_and_persisted(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        // 1. Import a new library object
        $svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="#38bdf8"/></svg>';
        $file = UploadedFile::fake()->createWithContent('lamp-svg.svg', $svgContent);
        $importRes = $this->postJson('/admin/library/import', ['file' => $file, 'name' => 'Custom SVG Lamp'])->assertCreated();
        $libId = $importRes->json('object.id');

        // 2. Place this object into a room layout
        $content = $this->getJson('/admin/content')->assertOk()->json('content');
        $idx = array_search('my-room', array_column($content['rooms'], 'id'));

        $content['rooms'][$idx]['layout']['objects'][] = [
            'id' => 'custom-lamp-1',
            'type' => $libId,
            'library_id' => $libId,
            'x' => 2.0,
            'z' => -1.0,
            'rot' => 0,
            'p' => ['w' => 1.5, 'd' => 1.5, 'h' => 1.2, 'y' => 0.0, 'color' => '#38bdf8', 'collide' => true],
        ];

        // 3. Save layout
        $saveRes = $this->putJson('/admin/content', ['content' => $content])->assertOk();
        $savedObjects = $saveRes->json("content.rooms.{$idx}.layout.objects");
        $this->assertTrue(collect($savedObjects)->contains(fn ($o) => $o['id'] === 'custom-lamp-1' && $o['type'] === $libId));

        // 4. Verify usage endpoint reports this room
        $usage = $this->getJson("/admin/library/{$libId}")->json('usage');
        $this->assertNotEmpty($usage);
        $this->assertSame('my-room', $usage[0]['id']);
    }

    public function test_delete_library_object_is_prevented_when_in_use(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        // 1. Import object
        $file = UploadedFile::fake()->createWithContent('chair-used.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect width="50" height="50"/></svg>');
        $importRes = $this->postJson('/admin/library/import', ['file' => $file, 'name' => 'Used Chair'])->assertCreated();
        $libId = $importRes->json('object.id');

        // 2. Put in room
        $content = $this->getJson('/admin/content')->assertOk()->json('content');
        $idx = array_search('my-room', array_column($content['rooms'], 'id'));
        $content['rooms'][$idx]['layout']['objects'][] = [
            'id' => 'chair-inst-1',
            'type' => $libId,
            'x' => 1.0,
            'z' => 1.0,
            'rot' => 0,
            'p' => ['w' => 1.0, 'd' => 1.0],
        ];
        $this->putJson('/admin/content', ['content' => $content])->assertOk();

        // 3. Attempt deletion: must fail with 409 Conflict
        $delRes = $this->deleteJson("/admin/library/{$libId}")->assertStatus(409);
        $delRes->assertJsonPath('in_use', true);
        $this->assertStringContainsString('in use', $delRes->json('message'));
    }

    public function test_delete_unused_library_object_succeeds_and_cleans_up(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        // Import
        $file = UploadedFile::fake()->createWithContent('free-object.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect width="50" height="50"/></svg>');
        $importRes = $this->postJson('/admin/library/import', ['file' => $file, 'name' => 'Free Object'])->assertCreated();
        $libId = $importRes->json('object.id');
        $filePath = $importRes->json('object.file_path');

        // Delete
        $this->deleteJson("/admin/library/{$libId}")->assertOk();

        // Verify deleted from list
        $this->getJson("/admin/library/{$libId}")->assertNotFound();

        // Verify file deleted from storage
        $relPath = str_replace('storage/', '', $filePath);
        Storage::disk('public')->assertMissing($relPath);
    }

    public function test_import_valid_obj_model_standalone(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $obj = <<<'OBJ'
# Wavefront OBJ couch model
v -1.0 0.0 -0.5
v 1.0 0.0 -0.5
v 1.0 0.0 0.5
v -1.0 0.0 0.5
v -1.0 0.8 -0.5
v 1.0 0.8 -0.5
v 1.0 0.8 0.5
v -1.0 0.8 0.5
f 1 2 3 4
f 5 6 7 8
OBJ;

        $file = UploadedFile::fake()->createWithContent('couch.obj', $obj);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'Living Room Couch',
            'category' => 'Furniture',
        ])->assertCreated();

        $res->assertJsonPath('object.name', 'Living Room Couch');
        $res->assertJsonPath('object.file_type', 'obj');
        $res->assertJsonPath('object.category', 'Furniture');
        $res->assertJsonPath('object.metadata.vertex_count', 8);
        $res->assertJsonPath('object.metadata.face_count', 2);
        $this->assertNotEmpty($res->json('object.thumbnail_path'));

        $objId = $res->json('object.id');
        Storage::disk('public')->assertExists("library/objects/{$objId}.obj");
    }

    public function test_import_valid_obj_with_companion_mtl(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $obj = <<<'OBJ'
# Couch model
v -1.0 0.0 -0.5
v 1.0 0.0 -0.5
v 1.0 0.0 0.5
v -1.0 0.0 0.5
f 1 2 3 4
mtllib couch.mtl
usemtl VelvetBlue
OBJ;

        $mtl = <<<'MTL'
# Couch material
newmtl VelvetBlue
Kd 0.1 0.3 0.8
MTL;

        $objFile = UploadedFile::fake()->createWithContent('couch.obj', $obj);
        $mtlFile = UploadedFile::fake()->createWithContent('couch.mtl', $mtl);

        $res = $this->postJson('/admin/library/import', [
            'file' => $objFile,
            'mtl_file' => $mtlFile,
            'name' => 'Blue Velvet Couch',
            'category' => 'Furniture',
        ])->assertCreated();

        $res->assertJsonPath('object.file_type', 'obj');
        $this->assertNotNull($res->json('object.metadata.mtl_path'));
        $this->assertNotNull($res->json('object.definition.mtl_path'));

        $objId = $res->json('object.id');
        Storage::disk('public')->assertExists("library/objects/{$objId}.obj");
        Storage::disk('public')->assertExists("library/objects/{$objId}.mtl");
    }

    public function test_uploading_mtl_alone_returns_helpful_guidance(): void
    {
        $this->actingAs($this->admin());

        $mtlFile = UploadedFile::fake()->createWithContent('couch.mtl', 'newmtl Leather\nKd 0.5 0.5 0.5');

        $res = $this->postJson('/admin/library/import', [
            'file' => $mtlFile,
        ])->assertStatus(422);

        $res->assertJsonValidationErrors(['file']);
        $this->assertStringContainsString('.obj', $res->json('errors.file.0') ?? $res->json('errors.file'));
    }

    public function test_delete_obj_cleans_up_both_obj_and_mtl_files(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $objFile = UploadedFile::fake()->createWithContent('chair.obj', "v 0 0 0\nv 1 0 0\nv 1 1 0\nf 1 2 3\n");
        $mtlFile = UploadedFile::fake()->createWithContent('chair.mtl', "newmtl Wood\nKd 0.6 0.4 0.2\n");

        $res = $this->postJson('/admin/library/import', [
            'file' => $objFile,
            'mtl_file' => $mtlFile,
            'name' => 'Wooden Chair',
        ])->assertCreated();

        $objId = $res->json('object.id');
        Storage::disk('public')->assertExists("library/objects/{$objId}.obj");
        Storage::disk('public')->assertExists("library/objects/{$objId}.mtl");

        // Delete
        $this->deleteJson("/admin/library/{$objId}")->assertOk();

        // Verify both files removed from storage
        Storage::disk('public')->assertMissing("library/objects/{$objId}.obj");
        Storage::disk('public')->assertMissing("library/objects/{$objId}.mtl");
    }

    public function test_uploading_max_file_returns_clear_conversion_guidance(): void
    {
        $this->actingAs($this->admin());

        $maxFile = UploadedFile::fake()->createWithContent('chair.max', 'BINARY_3DS_MAX_DATA_STREAM');

        $res = $this->postJson('/admin/library/import', [
            'file' => $maxFile,
            'name' => '3ds Max Chair',
        ])->assertStatus(422);

        $res->assertJsonValidationErrors(['file']);
        $this->assertStringContainsString('3ds Max', $res->json('errors.file.0') ?? $res->json('errors.file'));
        $this->assertStringContainsString('OBJ', $res->json('errors.file.0') ?? $res->json('errors.file'));
    }

    public function test_file_size_limit_is_200mb_and_rejects_larger_files(): void
    {
        $this->actingAs($this->admin());

        // File larger than 200MB (204800 KB): 205MB
        $hugeFile = UploadedFile::fake()->create('large-model.obj', 205 * 1024);

        $res = $this->postJson('/admin/library/import', [
            'file' => $hugeFile,
            'name' => 'Too Large Model',
        ])->assertStatus(422);

        $res->assertJsonValidationErrors(['file']);
        $this->assertStringContainsString('204800 kilobytes', $res->json('errors.file.0'));
    }

    public function test_import_zip_archive_containing_obj(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $tempZip = tempnam(sys_get_temp_dir(), 'test_zip_');
        $zip = new \ZipArchive;
        $zip->open($tempZip, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('couch.obj', "v -1 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
        $zip->addFromString('couch.mtl', "newmtl Fabric\nKd 0.2 0.7 0.3\n");
        $zip->close();

        $file = new UploadedFile($tempZip, 'couch_pack.zip', 'application/zip', null, true);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'Pack Couch',
        ])->assertCreated();

        $res->assertJsonPath('object.file_type', 'obj');
        $this->assertNotNull($res->json('object.metadata.mtl_path'));
        @unlink($tempZip);
    }

    public function test_import_rar_archive_containing_obj(): void
    {
        if (! RarExtractor::isSupported()) {
            $this->markTestSkipped('UnRAR is not available in this environment.');
        }

        Storage::fake('public');
        $this->actingAs($this->admin());

        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rar_test_'.uniqid();
        mkdir($tempDir, 0777, true);
        file_put_contents($tempDir.DIRECTORY_SEPARATOR.'sofa.obj', "v -1 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
        file_put_contents($tempDir.DIRECTORY_SEPARATOR.'sofa.mtl', "newmtl Velvet\nKd 0.8 0.1 0.1\n");

        $rarPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'sofa_pack.rar';
        @unlink($rarPath);

        $winrar = 'C:\\Program Files\\WinRAR\\WinRAR.exe';
        if (file_exists($winrar)) {
            exec(escapeshellarg($winrar).' a -ibck '.escapeshellarg($rarPath).' '.escapeshellarg($tempDir.DIRECTORY_SEPARATOR.'*'));
        }

        if (! file_exists($rarPath)) {
            @unlink($tempDir.DIRECTORY_SEPARATOR.'sofa.obj');
            @unlink($tempDir.DIRECTORY_SEPARATOR.'sofa.mtl');
            @rmdir($tempDir);
            $this->markTestSkipped('WinRAR could not create test archive.');
        }

        $file = new UploadedFile($rarPath, 'sofa_pack.rar', 'application/x-rar-compressed', null, true);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
            'name' => 'Sofa Pack',
        ])->assertCreated();

        $res->assertJsonPath('object.file_type', 'obj');
        $this->assertNotNull($res->json('object.metadata.mtl_path'));

        @unlink($tempDir.DIRECTORY_SEPARATOR.'sofa.obj');
        @unlink($tempDir.DIRECTORY_SEPARATOR.'sofa.mtl');
        @rmdir($tempDir);
        @unlink($rarPath);
    }

    public function test_import_rar_archive_without_obj_reports_error(): void
    {
        if (! RarExtractor::isSupported()) {
            $this->markTestSkipped('UnRAR is not available in this environment.');
        }

        $this->actingAs($this->admin());

        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rar_test_empty_'.uniqid();
        mkdir($tempDir, 0777, true);
        file_put_contents($tempDir.DIRECTORY_SEPARATOR.'readme.txt', 'Just a text file.');

        $rarPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'no_obj.rar';
        @unlink($rarPath);

        $winrar = 'C:\\Program Files\\WinRAR\\WinRAR.exe';
        if (file_exists($winrar)) {
            exec(escapeshellarg($winrar).' a -ibck '.escapeshellarg($rarPath).' '.escapeshellarg($tempDir.DIRECTORY_SEPARATOR.'*'));
        }

        if (! file_exists($rarPath)) {
            @unlink($tempDir.DIRECTORY_SEPARATOR.'readme.txt');
            @rmdir($tempDir);
            $this->markTestSkipped('WinRAR could not create test archive.');
        }

        $file = new UploadedFile($rarPath, 'no_obj.rar', 'application/x-rar-compressed', null, true);

        $res = $this->postJson('/admin/library/import', [
            'file' => $file,
        ])->assertStatus(422);

        $res->assertJsonValidationErrors(['file']);
        $error = $res->json('errors.file');
        $this->assertStringContainsString('The RAR archive does not contain an .obj', is_array($error) ? $error[0] : $error);

        @unlink($tempDir.DIRECTORY_SEPARATOR.'readme.txt');
        @rmdir($tempDir);
        @unlink($rarPath);
    }
}
