<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\CadFormatAdapter;
use App\Support\LibraryStore;
use App\Support\MaxFormatAdapter;
use App\Support\ObjParser;
use App\Support\RarExtractor;
use App\Support\SvgSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LibraryController extends Controller
{
    public function __construct(private readonly LibraryStore $library) {}

    public function index(Request $request): JsonResponse
    {
        $objects = collect($this->library->all());

        if ($q = $request->query('q')) {
            $q = strtolower(trim((string) $q));
            $objects = $objects->filter(fn ($o) => str_contains(strtolower($o['name']), $q) || str_contains(strtolower($o['id']), $q));
        }

        if ($type = $request->query('file_type')) {
            $objects = $objects->filter(fn ($o) => $o['file_type'] === $type);
        }

        if ($category = $request->query('category')) {
            $objects = $objects->filter(fn ($o) => $o['category'] === $category);
        }

        return response()->json([
            'objects' => $objects->values()->all(),
            'categories' => LibraryStore::GROUPS,
            'file_types' => ['builtin', 'svg', 'dxf', 'obj'],
            'can_convert_max' => (bool) (env('MAX_CONVERTER_PATH') && is_executable((string) env('MAX_CONVERTER_PATH'))),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $object = $this->library->find($id);
        if ($object === null) {
            return response()->json(['message' => 'Library object not found.'], 404);
        }

        $usage = $this->library->getUsage($id);

        return response()->json([
            'object' => $object,
            'usage' => $usage,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:204800'],
            'mtl_file' => ['nullable', 'file', 'max:204800'],
            'mtl' => ['nullable', 'file', 'max:204800'],
            'obj_file' => ['nullable', 'file', 'max:204800'],
            'obj' => ['nullable', 'file', 'max:204800'],
            'name' => ['nullable', 'string', 'max:80'],
            'category' => ['nullable', 'string', 'max:40'],
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $origName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $name = trim($request->input('name') ?: $origName);
        $name = Str::limit($name ?: 'Object', 60, '');
        $category = trim($request->input('category') ?: 'Custom');

        // Check if user uploaded .mtl as primary file with companion .obj
        if ($ext === 'mtl') {
            $objCompanion = $request->file('obj_file') ?: $request->file('obj');
            if ($objCompanion instanceof UploadedFile) {
                $mtlFile = $file;
                $file = $objCompanion;
                $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
                if (! $request->filled('name')) {
                    $name = Str::limit(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME), 60, '');
                }
            } else {
                return response()->json([
                    'message' => 'Material template requires 3D geometry file.',
                    'errors' => ['file' => 'An .mtl file defines materials for a Wavefront 3D model and must be uploaded alongside its corresponding .obj geometry file (e.g. couch.obj).'],
                ], 422);
            }
        } else {
            $mtlFile = $request->file('mtl_file') ?: $request->file('mtl');
        }

        $mtlFromZip = null;
        if ($ext === 'zip' && class_exists('ZipArchive')) {
            $zip = new \ZipArchive;
            if ($zip->open($file->getRealPath()) === true) {
                $objIndex = -1;
                $mtlIndex = -1;
                $hasMax = false;
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $entryName = $zip->getNameIndex($i);
                    $entryExt = strtolower(pathinfo($entryName, PATHINFO_EXTENSION));
                    if ($entryExt === 'obj' && $objIndex === -1) {
                        $objIndex = $i;
                        if (! $request->filled('name')) {
                            $name = Str::limit(pathinfo($entryName, PATHINFO_FILENAME), 60, '');
                        }
                    } elseif ($entryExt === 'mtl' && $mtlIndex === -1) {
                        $mtlIndex = $i;
                    } elseif ($entryExt === 'max') {
                        $hasMax = true;
                    }
                }
                if ($objIndex !== -1) {
                    $content = $zip->getFromIndex($objIndex);
                    $ext = 'obj';
                    if ($mtlIndex !== -1) {
                        $mtlFromZip = $zip->getFromIndex($mtlIndex);
                    }
                } elseif ($hasMax) {
                    $zip->close();

                    return response()->json([
                        'message' => 'ZIP archive contains only 3ds Max (.max) file.',
                        'errors' => ['file' => 'The uploaded ZIP archive contains an Autodesk 3ds Max (.max) file, but no Wavefront (.obj) geometry file. Please export as Wavefront OBJ (.obj + .mtl) from 3ds Max before uploading.'],
                    ], 422);
                } else {
                    $zip->close();

                    return response()->json([
                        'message' => 'No supported 3D model found in ZIP archive.',
                        'errors' => ['file' => 'The ZIP archive does not contain an .obj (Wavefront 3D) model. Supported formats are .obj, .svg, and .dxf.'],
                    ], 422);
                }
                $zip->close();
            }
        }

        if ($ext === 'rar') {
            $extracted = RarExtractor::extract($file->getRealPath());
            if (! $extracted['success']) {
                return response()->json([
                    'message' => 'RAR extraction failed.',
                    'errors' => ['file' => $extracted['error'] ?? 'Could not extract RAR archive.'],
                ], 422);
            }

            if ($extracted['obj_content'] !== null) {
                $content = $extracted['obj_content'];
                $ext = 'obj';
                if (! $request->filled('name') && $extracted['obj_name']) {
                    $name = Str::limit($extracted['obj_name'], 60, '');
                }
                if ($extracted['mtl_content'] !== null) {
                    $mtlFromZip = $extracted['mtl_content'];
                }
            } elseif ($extracted['has_max']) {
                return response()->json([
                    'message' => 'RAR archive contains only 3ds Max (.max) file.',
                    'errors' => ['file' => 'The uploaded RAR archive contains an Autodesk 3ds Max (.max) file, but no Wavefront (.obj) geometry file. Please export as Wavefront OBJ (.obj + .mtl) from 3ds Max before uploading.'],
                ], 422);
            } else {
                return response()->json([
                    'message' => 'No supported 3D model found in RAR archive.',
                    'errors' => ['file' => 'The RAR archive does not contain an .obj (Wavefront 3D) model. Supported formats are .obj, .zip, .rar, .svg, and .dxf.'],
                ], 422);
            }
        }

        $content = isset($content) ? $content : file_get_contents($file->getRealPath());
        if ($content === false) {
            return response()->json(['message' => 'Could not read uploaded file.'], 422);
        }

        // 1. Handle SVG
        if ($ext === 'svg') {
            $processed = SvgSanitizer::process($content);
            if (! $processed['valid']) {
                return response()->json([
                    'message' => 'Invalid SVG file.',
                    'errors' => ['file' => $processed['error'] ?? 'The SVG content could not be parsed safely.'],
                ], 422);
            }

            $id = 'svg_'.Str::lower(Str::slug(Str::limit($name, 25, ''))).'_'.Str::lower(Str::random(5));
            $fileName = "{$id}.svg";
            $storageRel = "library/objects/{$fileName}";
            Storage::disk('public')->put($storageRel, $processed['svg']);

            $aspect = $processed['aspect_ratio'] ?? 1.0;
            $w = 2.0;
            $d = max(0.4, min(10.0, round(2.0 * $aspect, 2)));

            $definition = [
                'label' => $name,
                'group' => $category,
                'icon' => '❖',
                'color' => '#38bdf8',
                'shape' => 'rect',
                'wall' => false,
                'collide' => 'param',
                'interactive' => false,
                'file_type' => 'svg',
                'file_path' => '/storage/'.$storageRel,
                'footprint' => ['w' => 'w', 'd' => 'd'],
                'params' => [
                    'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $w],
                    'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $d],
                    'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => 1.2],
                    'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0.0],
                    'color' => ['kind' => 'color', 'label' => 'Accent colour', 'default' => '#38bdf8'],
                    'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot walk through)', 'default' => true],
                ],
            ];

            $item = $this->library->create([
                'id' => $id,
                'name' => $name,
                'category' => $category,
                'file_type' => 'svg',
                'file_path' => 'storage/'.$storageRel,
                'thumbnail_path' => $processed['svg'],
                'metadata' => [
                    'view_box' => $processed['view_box'],
                    'aspect_ratio' => $aspect,
                    'orig_width' => $processed['width'],
                    'orig_height' => $processed['height'],
                ],
                'definition' => $definition,
            ]);

            return response()->json(['object' => $item], 201);
        }

        // 2. Handle CAD (DXF or DWG)
        if (in_array($ext, ['dxf', 'dwg'], true)) {
            $processed = CadFormatAdapter::process($content, $ext);
            if (! $processed['valid']) {
                return response()->json([
                    'message' => 'CAD file error.',
                    'errors' => ['file' => $processed['error'] ?? 'Unsupported CAD format or invalid file structure.'],
                ], 422);
            }

            $id = 'cad_'.Str::lower(Str::slug(Str::limit($name, 25, ''))).'_'.Str::lower(Str::random(5));
            $fileName = "{$id}.{$ext}";
            $storageRel = "library/objects/{$fileName}";
            Storage::disk('public')->put($storageRel, $content);

            $w = max(0.5, min(20.0, (float) ($processed['width'] ?? 2.0)));
            $d = max(0.5, min(20.0, (float) ($processed['depth'] ?? 2.0)));

            $definition = [
                'label' => $name,
                'group' => $category,
                'icon' => '📐',
                'color' => '#38bdf8',
                'shape' => 'rect',
                'wall' => false,
                'collide' => 'param',
                'interactive' => false,
                'file_type' => 'dxf',
                'file_path' => '/storage/'.$storageRel,
                'footprint' => ['w' => 'w', 'd' => 'd'],
                'params' => [
                    'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $w],
                    'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $d],
                    'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => 1.0],
                    'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0.0],
                    'color' => ['kind' => 'color', 'label' => 'Line colour', 'default' => '#38bdf8'],
                    'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot walk through)', 'default' => true],
                ],
            ];

            $item = $this->library->create([
                'id' => $id,
                'name' => $name,
                'category' => $category,
                'file_type' => 'dxf',
                'file_path' => 'storage/'.$storageRel,
                'thumbnail_path' => $processed['svg'] ?? null,
                'metadata' => [
                    'entities_count' => $processed['entities_count'] ?? 0,
                    'entities' => $processed['entities'] ?? [],
                    'bbox' => $processed['bbox'] ?? null,
                ],
                'definition' => $definition,
            ]);

            return response()->json(['object' => $item], 201);
        }

        // 3. Handle Wavefront 3D Model (OBJ with optional companion MTL)
        if ($ext === 'obj') {
            $parsed = ObjParser::parse($content);
            if (! $parsed['valid']) {
                return response()->json([
                    'message' => 'Invalid 3D OBJ file.',
                    'errors' => ['file' => $parsed['error'] ?? 'The OBJ file structure could not be parsed.'],
                ], 422);
            }

            $id = 'obj_'.Str::lower(Str::slug(Str::limit($name, 25, ''))).'_'.Str::lower(Str::random(5));
            $objFileName = "{$id}.obj";
            $storageRel = "library/objects/{$objFileName}";
            Storage::disk('public')->put($storageRel, $content);

            // Automatically optimize massive 3D models (> 50,000 faces) into lightweight web-ready models
            $fullObjPath = Storage::disk('public')->path($storageRel);
            if (($parsed['face_count'] ?? 0) > 50000 && file_exists($fullObjPath)) {
                $script = base_path('tools/optimize-obj.mjs');
                if (file_exists($script)) {
                    $cmd = 'node '.escapeshellarg($script).' '.escapeshellarg($fullObjPath).' 2>&1';
                    @exec($cmd, $optOut, $optCode);
                    if ($optCode === 0 && file_exists($fullObjPath)) {
                        $optimizedContent = file_get_contents($fullObjPath);
                        if ($optimizedContent !== false) {
                            $reparsed = ObjParser::parse($optimizedContent);
                            if ($reparsed['valid']) {
                                $parsed['face_count'] = $reparsed['face_count'];
                                $parsed['vertex_count'] = $reparsed['vertex_count'];
                                $parsed['svg'] = $reparsed['svg'];
                                $parsed['bbox'] = $reparsed['bbox'];
                                $parsed['dimensions'] = $reparsed['dimensions'];
                                $parsed['suggested'] = $reparsed['suggested'];
                            }
                        }
                    }
                }
            }

            $mtlRel = null;
            $mtlData = ['primary_color' => '#8b5cf6', 'materials' => []];

            if ($mtlFromZip !== null) {
                $mtlData = ObjParser::parseMtl($mtlFromZip);
                $mtlFileName = "{$id}.mtl";
                $mtlRel = "library/objects/{$mtlFileName}";
                Storage::disk('public')->put($mtlRel, $mtlFromZip);
            } elseif ($mtlFile instanceof UploadedFile) {
                $mtlContent = file_get_contents($mtlFile->getRealPath());
                if ($mtlContent !== false) {
                    $mtlData = ObjParser::parseMtl($mtlContent);
                    $mtlFileName = "{$id}.mtl";
                    $mtlRel = "library/objects/{$mtlFileName}";
                    Storage::disk('public')->put($mtlRel, $mtlContent);
                }
            }

            $w = (float) ($parsed['suggested']['w'] ?? 2.0);
            $d = (float) ($parsed['suggested']['d'] ?? 1.0);
            $h = (float) ($parsed['suggested']['h'] ?? 0.9);
            $color = $mtlData['primary_color'] ?? '#8b5cf6';

            $definition = [
                'label' => $name,
                'group' => $category,
                'icon' => '🛋',
                'color' => $color,
                'shape' => 'rect',
                'wall' => false,
                'collide' => 'param',
                'interactive' => false,
                'file_type' => 'obj',
                'file_path' => '/storage/'.$storageRel,
                'mtl_path' => $mtlRel ? '/storage/'.$mtlRel : null,
                'footprint' => ['w' => 'w', 'd' => 'd'],
                'params' => [
                    'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $w],
                    'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $d],
                    'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => $h],
                    'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0.0],
                    'color' => ['kind' => 'color', 'label' => 'Accent colour', 'default' => $color],
                    'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot walk through)', 'default' => true],
                ],
            ];

            $item = $this->library->create([
                'id' => $id,
                'name' => $name,
                'category' => $category,
                'file_type' => 'obj',
                'file_path' => 'storage/'.$storageRel,
                'thumbnail_path' => $parsed['svg'] ?? null,
                'metadata' => [
                    'mtl_path' => $mtlRel ? 'storage/'.$mtlRel : null,
                    'mtl_url' => $mtlRel ? '/storage/'.$mtlRel : null,
                    'mtllib' => $parsed['mtllib'] ?? null,
                    'materials' => ! empty($mtlData['materials']) ? $mtlData['materials'] : $parsed['materials'],
                    'vertex_count' => $parsed['vertex_count'] ?? 0,
                    'face_count' => $parsed['face_count'] ?? 0,
                    'bbox' => $parsed['bbox'] ?? null,
                    'dimensions' => $parsed['dimensions'] ?? null,
                ],
                'definition' => $definition,
            ]);

            return response()->json(['object' => $item], 201);
        }

        // 4. Handle Autodesk 3ds Max (.max)
        if ($ext === 'max') {
            $processed = MaxFormatAdapter::process($content, $file->getRealPath());
            if (! $processed['valid']) {
                return response()->json([
                    'message' => '3ds Max (.max) conversion required.',
                    'errors' => ['file' => $processed['error'] ?? 'Autodesk 3ds Max (.max) is a proprietary binary project file format and must be converted to Wavefront OBJ.'],
                    'advice' => $processed['advice'] ?? null,
                ], 422);
            }

            // If converted successfully via MAX_CONVERTER_PATH:
            $objContent = $processed['obj_content'] ?? '';
            $parsed = ObjParser::parse($objContent);
            if (! $parsed['valid']) {
                return response()->json([
                    'message' => 'Converted 3D model could not be parsed.',
                    'errors' => ['file' => $parsed['error'] ?? 'Converted OBJ structure is invalid.'],
                ], 422);
            }

            $id = 'max_'.Str::lower(Str::slug(Str::limit($name, 25, ''))).'_'.Str::lower(Str::random(5));
            $objFileName = "{$id}.obj";
            $storageRel = "library/objects/{$objFileName}";
            Storage::disk('public')->put($storageRel, $objContent);

            $mtlRel = null;
            $mtlData = ['primary_color' => '#8b5cf6', 'materials' => []];
            if (! empty($processed['mtl_content'])) {
                $mtlData = ObjParser::parseMtl($processed['mtl_content']);
                $mtlFileName = "{$id}.mtl";
                $mtlRel = "library/objects/{$mtlFileName}";
                Storage::disk('public')->put($mtlRel, $processed['mtl_content']);
            }

            $w = (float) ($parsed['suggested']['w'] ?? 2.0);
            $d = (float) ($parsed['suggested']['d'] ?? 1.0);
            $h = (float) ($parsed['suggested']['h'] ?? 0.9);
            $color = $mtlData['primary_color'] ?? '#8b5cf6';

            $definition = [
                'label' => $name,
                'group' => $category,
                'icon' => '🛋',
                'color' => $color,
                'shape' => 'rect',
                'wall' => false,
                'collide' => 'param',
                'interactive' => false,
                'file_type' => 'obj',
                'file_path' => '/storage/'.$storageRel,
                'mtl_path' => $mtlRel ? '/storage/'.$mtlRel : null,
                'footprint' => ['w' => 'w', 'd' => 'd'],
                'params' => [
                    'w' => ['kind' => 'number', 'label' => 'Width (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $w],
                    'd' => ['kind' => 'number', 'label' => 'Depth (m)', 'min' => 0.2, 'max' => 20, 'step' => 0.1, 'default' => $d],
                    'h' => ['kind' => 'number', 'label' => 'Height (m)', 'min' => 0.1, 'max' => 10, 'step' => 0.1, 'default' => $h],
                    'y' => ['kind' => 'number', 'label' => 'Raised by (m)', 'min' => 0, 'max' => 8, 'step' => 0.1, 'default' => 0.0],
                    'color' => ['kind' => 'color', 'label' => 'Accent colour', 'default' => $color],
                    'collide' => ['kind' => 'bool', 'label' => 'Solid (cannot walk through)', 'default' => true],
                ],
            ];

            $item = $this->library->create([
                'id' => $id,
                'name' => $name,
                'category' => $category,
                'file_type' => 'obj',
                'file_path' => 'storage/'.$storageRel,
                'thumbnail_path' => $parsed['svg'] ?? null,
                'metadata' => [
                    'source_format' => 'max',
                    'mtl_path' => $mtlRel ? 'storage/'.$mtlRel : null,
                    'mtl_url' => $mtlRel ? '/storage/'.$mtlRel : null,
                    'mtllib' => $parsed['mtllib'] ?? null,
                    'materials' => ! empty($mtlData['materials']) ? $mtlData['materials'] : $parsed['materials'],
                    'vertex_count' => $parsed['vertex_count'] ?? 0,
                    'face_count' => $parsed['face_count'] ?? 0,
                    'bbox' => $parsed['bbox'] ?? null,
                    'dimensions' => $parsed['dimensions'] ?? null,
                ],
                'definition' => $definition,
            ]);

            return response()->json(['object' => $item], 201);
        }

        return response()->json([
            'message' => 'Unsupported file format.',
            'errors' => ['file' => 'Supported formats are 3D Wavefront (.obj with optional .mtl), 3D packages (.zip, .rar), Autodesk 3ds Max (.max), SVG vector (.svg), and CAD Drawing Exchange Format (.dxf).'],
        ], 422);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $object = $this->library->find($id);
        if ($object === null) {
            return response()->json(['message' => 'Library object not found.'], 404);
        }

        // Safety check: Is this object currently placed in any room?
        $usage = $this->library->getUsage($id);
        $force = $request->boolean('force');

        if (! empty($usage) && ! $force) {
            $roomNames = implode(', ', array_map(fn ($u) => "{$u['name']} ({$u['count']} instances)", $usage));

            return response()->json([
                'message' => "Cannot permanently delete '{$object['name']}' because it is in use in: {$roomNames}. Remove it from these rooms first or confirm deletion.",
                'in_use' => true,
                'usage' => $usage,
            ], 409);
        }

        $this->library->delete($id);

        return response()->json([
            'message' => "Object '{$object['name']}' was permanently deleted.",
            'deleted' => $id,
        ]);
    }
}
