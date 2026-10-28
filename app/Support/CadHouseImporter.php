<?php

namespace App\Support;

use App\Models\House;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class CadHouseImporter
{
    public const SUPPORTED_EXTENSIONS = ['obj', 'glb', 'gltf', 'dxf', 'max', 'zip', 'rar'];

    /**
     * Import a 3D CAD architectural model and generate a complete House project.
     *
     * @param  array{
     *     file: UploadedFile,
     *     mtl_file?: ?UploadedFile,
     *     title?: ?string,
     *     description?: ?string,
     *     unit_scale?: ?string,
     *     ground_preset?: ?string,
     *     sky_preset?: ?string,
     *     plot_padding?: ?float,
     *     user_id?: ?int,
     * }  $params
     * @return array{
     *     house: House,
     *     details: array<string, mixed>
     * }
     */
    public static function import(array $params): array
    {
        $file = $params['file'];
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());

        if (! in_array($ext, self::SUPPORTED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException("Unsupported CAD format '.{$ext}'. Supported formats: ".implode(', ', self::SUPPORTED_EXTENSIONS));
        }

        $originalExt = $ext;
        $origName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $title = trim($params['title'] ?? '') ?: Str::headline($origName);
        $description = trim($params['description'] ?? '');

        // 1. Process and store 3D CAD geometry
        $storageDisk = 'public';
        $subFolder = 'houses/cad';
        $storedMtlPath = null;

        if ($ext === 'zip') {
            $zipResult = self::extractZipArchive($file->getRealPath(), $subFolder, $storageDisk, $origName);
            if (! $zipResult['success']) {
                throw new \InvalidArgumentException($zipResult['error']);
            }
            $storedPath = $zipResult['stored_path'];
            $storedMtlPath = $zipResult['stored_mtl_path'] ?? null;
            $ext = $zipResult['ext'];
            $fullDiskPath = Storage::disk($storageDisk)->path($storedPath);
        } elseif ($ext === 'rar') {
            $rarResult = self::extractRarArchive($file->getRealPath(), $subFolder, $storageDisk, $origName);
            if (! $rarResult['success']) {
                throw new \InvalidArgumentException($rarResult['error']);
            }
            $storedPath = $rarResult['stored_path'];
            $storedMtlPath = $rarResult['stored_mtl_path'] ?? null;
            $ext = $rarResult['ext'];
            $fullDiskPath = Storage::disk($storageDisk)->path($storedPath);
        } elseif ($ext === 'max') {
            $maxResult = self::processMaxFile($file, $subFolder, $storageDisk, $origName);
            if (! $maxResult['success']) {
                throw new \InvalidArgumentException($maxResult['error']);
            }
            $storedPath = $maxResult['stored_path'];
            $storedMtlPath = $maxResult['stored_mtl_path'] ?? null;
            $ext = $maxResult['ext'];
            $fullDiskPath = Storage::disk($storageDisk)->path($storedPath);
        } else {
            // Direct 3D CAD format (obj, glb, gltf, dxf)
            $hashName = Str::random(16).'_'.Str::slug(Str::limit($origName, 30, '')).'.'.$ext;
            $storedPath = $file->storeAs($subFolder, $hashName, $storageDisk);
            $fullDiskPath = Storage::disk($storageDisk)->path($storedPath);

            // Store companion MTL file if provided
            if (isset($params['mtl_file']) && $params['mtl_file'] instanceof UploadedFile) {
                $mtlFile = $params['mtl_file'];
                $mtlExt = strtolower($mtlFile->getClientOriginalExtension() ?: $mtlFile->extension());
                if ($mtlExt === 'mtl') {
                    $mtlHashName = Str::random(16).'_'.Str::slug(Str::limit(pathinfo($mtlFile->getClientOriginalName(), PATHINFO_FILENAME), 30, '')).'.mtl';
                    $storedMtlPath = $mtlFile->storeAs($subFolder, $mtlHashName, $storageDisk);
                }
            }
        }

        // 3. Inspect geometry and calculate dimensions
        $inspection = self::inspectGeometry($fullDiskPath, $ext);
        $unitScale = $params['unit_scale'] ?? 'auto';
        $scaleFactor = self::resolveScaleFactor($unitScale, $inspection['dimensions']);

        $rawW = $inspection['dimensions']['w'] ?? 16.0;
        $rawH = $inspection['dimensions']['h'] ?? 4.0;
        $rawD = $inspection['dimensions']['d'] ?? 14.0;

        $width = max(2.0, round($rawW * $scaleFactor, 2));
        $height = max(2.4, round($rawH * $scaleFactor, 2));
        $depth = max(2.0, round($rawD * $scaleFactor, 2));

        // 4. Calculate plot dimensions with padding
        $padding = isset($params['plot_padding']) && is_numeric($params['plot_padding'])
            ? (float) $params['plot_padding']
            : 8.0;

        $plotWidth = max(16.0, ceil($width + $padding * 2));
        $plotDepth = max(16.0, ceil($depth + $padding * 2));

        // Decompose sub-objects into discrete interactive items
        $decomposed = self::classifySubObjects($inspection['sub_objects'] ?? [], $scaleFactor, $inspection['bbox'] ?? null);

        // 5. Estimate stories and build floor layout with discrete decomposed items
        $floorsData = self::generateFloorsLayout($width, $depth, $height, $decomposed, $inspection, $scaleFactor);

        // 6. Environment styling presets
        $skyPreset = $params['sky_preset'] ?? 'daylight';
        $groundPreset = $params['ground_preset'] ?? 'grass';

        $skyColors = [
            'daylight' => '#dfe6f2',
            'sunset' => '#ffddbe',
            'golden_hour' => '#ffeacc',
            'night' => '#0f172a',
            'cyberpunk' => '#1e1b4b',
        ];
        $skyColor = $skyColors[$skyPreset] ?? '#dfe6f2';

        if (empty($description)) {
            $vertInfo = isset($inspection['vertex_count']) && $inspection['vertex_count'] > 0
                ? number_format($inspection['vertex_count']).' vertices, '
                : '';
            $description = "Custom 3D CAD architectural house model imported from {$origName}.{$ext} ({$vertInfo}{$width}m × {$depth}m × {$height}m).";
        }

        // 7. Ensure unique slug
        $baseSlug = Str::slug($title) ?: 'cad-house-'.Str::random(6);
        $slug = $baseSlug;
        $counter = 1;
        while (House::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        // 8. Create House record
        $house = House::create([
            'title' => $title,
            'slug' => $slug,
            'description' => $description,
            'status' => 'published',
            'is_default' => House::count() === 0,
            'plot_width' => $plotWidth,
            'plot_depth' => $plotDepth,
            'environment' => [
                'preset' => $skyPreset,
                'sun_intensity' => 1.15,
                'sky_color' => $skyColor,
                'ground' => $groundPreset,
                'stairs' => $decomposed['stairs'] ?? [],
                'cad_model' => [
                    'format' => $ext,
                    'original_format' => $originalExt,
                    'file_path' => '/storage/'.$storedPath,
                    'mtl_path' => $storedMtlPath ? '/storage/'.$storedMtlPath : null,
                    'filename' => $origName.'.'.$ext,
                    'scale' => $scaleFactor,
                    'dimensions' => [
                        'w' => $width,
                        'h' => $height,
                        'd' => $depth,
                    ],
                    'bbox' => $inspection['bbox'] ?? null,
                    'vertex_count' => $inspection['vertex_count'] ?? 0,
                    'face_count' => $inspection['face_count'] ?? 0,
                    'decomposed_objects_count' => count($decomposed['furniture']) + count($decomposed['lighting']) + count($decomposed['plants']),
                ],
            ],
            'floors_data' => $floorsData,
            'created_by' => $params['user_id'] ?? null,
        ]);

        return [
            'house' => $house,
            'details' => [
                'format' => $ext,
                'original_format' => $originalExt,
                'width' => $width,
                'height' => $height,
                'depth' => $depth,
                'plot_width' => $plotWidth,
                'plot_depth' => $plotDepth,
                'scale_factor' => $scaleFactor,
                'vertex_count' => $inspection['vertex_count'] ?? 0,
                'face_count' => $inspection['face_count'] ?? 0,
            ],
        ];
    }

    /**
     * Inspect geometric properties of the CAD file.
     *
     * @return array{
     *     dimensions: array{w: float, h: float, d: float},
     *     bbox?: array<string, float>,
     *     vertex_count?: int,
     *     face_count?: int,
     * }
     */
    protected static function inspectGeometry(string $filePath, string $extension): array
    {
        if ($extension === 'obj') {
            $parsed = ObjParser::parse($filePath);
            if ($parsed['valid']) {
                return [
                    'dimensions' => $parsed['dimensions'] ?? ['w' => 16.0, 'h' => 4.0, 'd' => 14.0],
                    'bbox' => $parsed['bbox'] ?? null,
                    'vertex_count' => $parsed['vertex_count'] ?? 0,
                    'face_count' => $parsed['face_count'] ?? 0,
                    'sub_objects' => $parsed['sub_objects'] ?? [],
                ];
            }
        }

        if ($extension === 'dxf') {
            $content = @file_get_contents($filePath);
            if ($content) {
                $parsed = DxfParser::parse($content);
                if ($parsed['valid']) {
                    $w = (float) ($parsed['width'] ?? 16.0);
                    $d = (float) ($parsed['depth'] ?? 14.0);

                    return [
                        'dimensions' => ['w' => $w, 'h' => 3.4, 'd' => $d],
                        'bbox' => $parsed['bbox'] ?? null,
                        'vertex_count' => $parsed['entities_count'] ?? 0,
                    ];
                }
            }
        }

        if ($extension === 'glb' || $extension === 'gltf') {
            $gltfBounds = self::inspectGltfBounds($filePath, $extension);
            if ($gltfBounds) {
                return $gltfBounds;
            }
        }

        // Fallback default architectural dimensions
        return [
            'dimensions' => ['w' => 18.0, 'h' => 4.5, 'd' => 15.0],
            'vertex_count' => 0,
            'face_count' => 0,
        ];
    }

    /**
     * Inspect accessors in GLTF/GLB files to extract 3D bounding box if available.
     *
     * @return array{dimensions: array{w: float, h: float, d: float}, bbox: array<string, float>}|null
     */
    protected static function inspectGltfBounds(string $filePath, string $extension): ?array
    {
        $jsonStr = null;

        if ($extension === 'gltf') {
            $jsonStr = @file_get_contents($filePath);
        } elseif ($extension === 'glb') {
            $handle = @fopen($filePath, 'rb');
            if ($handle) {
                $header = fread($handle, 12);
                if (strlen($header) === 12) {
                    $unpacked = unpack('Nmagic/Vversion/Vlength', $header);
                    if ($unpacked && $unpacked['magic'] === 0x676C5446) { // 'glTF' in hex
                        $chunkHeader = fread($handle, 8);
                        if (strlen($chunkHeader) === 8) {
                            $chunkUnpacked = unpack('VchunkLength/NchunkType', $chunkHeader);
                            if ($chunkUnpacked && $chunkUnpacked['chunkType'] === 0x4A534F4E) { // 'JSON'
                                $jsonStr = fread($handle, $chunkUnpacked['chunkLength']);
                            }
                        }
                    }
                }
                fclose($handle);
            }
        }

        if (! $jsonStr) {
            return null;
        }

        $data = json_decode($jsonStr, true);
        if (! is_array($data) || empty($data['accessors'])) {
            return null;
        }

        $minX = INF;
        $minY = INF;
        $minZ = INF;
        $maxX = -INF;
        $maxY = -INF;
        $maxZ = -INF;
        $found = false;

        foreach ($data['accessors'] as $acc) {
            if (isset($acc['type']) && $acc['type'] === 'VEC3' && isset($acc['min']) && isset($acc['max'])) {
                $minX = min($minX, (float) $acc['min'][0]);
                $minY = min($minY, (float) $acc['min'][1]);
                $minZ = min($minZ, (float) $acc['min'][2]);
                $maxX = max($maxX, (float) $acc['max'][0]);
                $maxY = max($maxY, (float) $acc['max'][1]);
                $maxZ = max($maxZ, (float) $acc['max'][2]);
                $found = true;
            }
        }

        if (! $found) {
            return null;
        }

        $w = max(0.5, $maxX - $minX);
        $h = max(0.5, $maxY - $minY);
        $d = max(0.5, $maxZ - $minZ);

        return [
            'dimensions' => ['w' => round($w, 2), 'h' => round($h, 2), 'd' => round($d, 2)],
            'bbox' => [
                'min_x' => round($minX, 2),
                'min_y' => round($minY, 2),
                'min_z' => round($minZ, 2),
                'max_x' => round($maxX, 2),
                'max_y' => round($maxY, 2),
                'max_z' => round($maxZ, 2),
            ],
        ];
    }

    /**
     * Resolve scaling factor based on user selection or auto-detection.
     *
     * @param  array{w: float, h: float, d: float}  $dimensions
     */
    protected static function resolveScaleFactor(string $unitScale, array $dimensions): float
    {
        return match (strtolower($unitScale)) {
            'mm' => 0.001,
            'cm' => 0.01,
            'inch', 'in' => 0.0254,
            'm', 'meters' => 1.0,
            default => self::autoDetectScale($dimensions),
        };
    }

    /**
     * Auto-detect scale factor if dimensions seem to be in mm or cm.
     *
     * @param  array{w: float, h: float, d: float}  $dimensions
     */
    protected static function autoDetectScale(array $dimensions): float
    {
        $maxDim = max($dimensions['w'] ?? 0, $dimensions['d'] ?? 0);
        $height = $dimensions['h'] ?? 0;

        if ($maxDim > 500) {
            // Check if height in millimeters would be too short for an architectural building (< 2.2m)
            if ($height > 0 && ($height * 0.001) < 2.2) {
                // Dimensions are in centimeters (e.g. 5400cm = 54m, 1338cm = 13.38m)
                return 0.01;
            }

            // Millimeters (e.g. 15000mm = 15m, height 3500mm = 3.5m)
            return 0.001;
        }

        if ($maxDim > 70) {
            // Centimeters (e.g. 1500cm = 15m)
            return 0.01;
        }

        return 1.0;
    }

    /**
     * Classify sub-objects into discrete interactive items (furniture, lighting, plants, doors, stairs).
     *
     * @param  list<array<string, mixed>>  $subObjects
     * @param  array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float}|null  $bbox
     * @return array{
     *     furniture: list<array<string, mixed>>,
     *     lighting: list<array<string, mixed>>,
     *     plants: list<array<string, mixed>>,
     *     doors: list<array<string, mixed>>,
     *     stairs: list<array<string, mixed>>,
     * }
     */
    public static function classifySubObjects(array $subObjects, float $scaleFactor = 1.0, ?array $bbox = null): array
    {
        $furniture = [];
        $lighting = [];
        $plants = [];
        $doors = [];
        $stairs = [];

        if (empty($subObjects)) {
            return compact('furniture', 'lighting', 'plants', 'doors', 'stairs');
        }

        $centerX = $bbox ? ($bbox['min_x'] + $bbox['max_x']) / 2.0 : 0.0;
        $centerZ = $bbox ? ($bbox['min_z'] + $bbox['max_z']) / 2.0 : 0.0;
        $alignYZero = ($bbox && ($bbox['min_y'] ?? 0) < -0.1 && ($bbox['max_y'] ?? 0) > 0.1);
        $baseY = $alignYZero ? 0.0 : (float) ($bbox['min_y'] ?? 0.0);

        foreach ($subObjects as $obj) {
            $name = (string) ($obj['name'] ?? '');
            if ($name === '') {
                continue;
            }

            $rawCenterX = (float) ($obj['center']['x'] ?? 0.0);
            $rawCenterY = (float) ($obj['center']['y'] ?? 0.0);
            $rawCenterZ = (float) ($obj['center']['z'] ?? 0.0);

            $rawW = (float) ($obj['dimensions']['w'] ?? 1.0);
            $rawH = (float) ($obj['dimensions']['h'] ?? 1.0);
            $rawD = (float) ($obj['dimensions']['d'] ?? 1.0);

            $x = round(($rawCenterX - $centerX) * $scaleFactor, 2);
            $z = round(($rawCenterZ - $centerZ) * $scaleFactor, 2);
            $y = round(($rawCenterY - $baseY) * $scaleFactor, 2);

            $w = max(0.1, round($rawW * $scaleFactor, 2));
            $h = max(0.1, round($rawH * $scaleFactor, 2));
            $d = max(0.1, round($rawD * $scaleFactor, 2));

            $lname = strtolower($name);
            $cleanId = 'cad-obj-'.Str::slug($name);

            // 1. Entrance flights & stairs
            if (str_contains($lname, 'stair') || str_contains($lname, 'step') || str_contains($lname, 'line008')) {
                if ($w >= 0.8 && $h >= 0.15) {
                    $stairs[] = [
                        'id' => 'stairs-'.Str::slug($name),
                        'name' => self::formatSubObjectLabel($name).' Steps',
                        'startX' => $x,
                        'startY' => max(0.0, round($y - $h / 2, 2)),
                        'startZ' => round($z + $d / 2, 2),
                        'endX' => $x,
                        'endY' => max(0.45, round($y + $h / 2, 2)),
                        'endZ' => round($z - $d / 2, 2),
                        'width' => $w,
                        'steps' => max(4, min(24, (int) round($h / 0.18))),
                        'style' => 'stone_steps',
                    ];

                    continue;
                }
            }

            // 2. Interactive Doors & Entrance Portals
            if (str_contains($lname, 'door') || str_contains($lname, 'gate') || str_contains($lname, '2657') || str_contains($lname, 'garage')) {
                if ($h < 1.6 || ($w < 0.4 && $d < 0.4)) {
                    continue;
                }
                $doors[] = [
                    'id' => 'cad-door-'.Str::slug($name),
                    'mesh_name' => $name,
                    'wall' => 'front',
                    'label' => self::formatSubObjectLabel($name).' Door',
                    'offset' => 0.0,
                    'width' => max(0.9, $w),
                    'height' => max(2.1, $h),
                    'x' => $x,
                    'z' => $z,
                    'y' => $y,
                ];

                continue;
            }

            // 3. Exterior & Interior Lighting fixtures
            if (str_contains($lname, 'streetlamp') || str_contains($lname, 'lamp') || str_contains($lname, 'lantern') || str_contains($lname, 'sconce') || str_contains($lname, 'chandelier')) {
                $lighting[] = [
                    'id' => $cleanId,
                    'mesh_name' => $name,
                    'type' => 'lamp',
                    'label' => self::formatSubObjectLabel($name),
                    'x' => $x,
                    'z' => $z,
                    'y' => $y,
                    'rot' => 0,
                    'width' => $w,
                    'height' => $h,
                    'depth' => $d,
                    'is_cad_sub_object' => true,
                ];

                continue;
            }

            // 4. Foliage & Landscaping Plants
            if (str_contains($lname, 'plant') || str_contains($lname, 'tree') || str_contains($lname, 'flower') || str_contains($lname, 'bush')) {
                $plants[] = [
                    'id' => $cleanId,
                    'mesh_name' => $name,
                    'type' => 'plant',
                    'label' => self::formatSubObjectLabel($name),
                    'x' => $x,
                    'z' => $z,
                    'y' => $y,
                    'rot' => 0,
                    'width' => $w,
                    'height' => $h,
                    'depth' => $d,
                    'is_cad_sub_object' => true,
                ];

                continue;
            }

            // 5. Furniture & Movable Props (Tables, Chairs, Sofas, Beds, Desks)
            $isFurniture = str_contains($lname, 'table') ||
                str_contains($lname, 'chair') ||
                str_contains($lname, 'sofa') ||
                str_contains($lname, 'couch') ||
                str_contains($lname, 'bed') ||
                str_contains($lname, 'desk') ||
                str_contains($lname, 'bench') ||
                str_contains($lname, 'stool') ||
                str_contains($lname, 'cabinet') ||
                str_contains($lname, 'shelf') ||
                str_contains($lname, 'wardrobe') ||
                str_contains($lname, 'costa_') ||
                str_contains($lname, 'ai37_');

            if ($isFurniture) {
                if ($w > 8.0 || $d > 8.0 || $h > 4.0) {
                    continue;
                }

                $type = 'table';
                if (str_contains($lname, 'sofa') || str_contains($lname, 'couch') || (str_contains($lname, 'chair') && ($w >= 1.3 || $d >= 1.3))) {
                    $type = 'sofa';
                } elseif (str_contains($lname, 'chair') || str_contains($lname, 'stool')) {
                    $type = 'chair';
                } elseif (str_contains($lname, 'bed')) {
                    $type = 'bed';
                } elseif (str_contains($lname, 'desk')) {
                    $type = 'desk';
                } elseif (str_contains($lname, 'cabinet') || str_contains($lname, 'shelf') || str_contains($lname, 'wardrobe')) {
                    $type = 'cabinet';
                }

                $furniture[] = [
                    'id' => $cleanId,
                    'mesh_name' => $name,
                    'type' => $type,
                    'label' => self::formatSubObjectLabel($name),
                    'x' => $x,
                    'z' => $z,
                    'y' => $y,
                    'rot' => 0,
                    'width' => $w,
                    'height' => $h,
                    'depth' => $d,
                    'is_cad_sub_object' => true,
                ];
            }
        }

        // Group individual door components (leaves, glass panels, frames) into unified doorway portals
        $unifiedDoors = [];
        foreach ($doors as $dr) {
            $matchedIdx = null;
            foreach ($unifiedDoors as $idx => $cand) {
                $dH = hypot($cand['x'] - $dr['x'], $cand['z'] - $dr['z']);
                $dY = abs($cand['y'] - $dr['y']);
                if ($dH < 2.5 && $dY < 1.4) {
                    $matchedIdx = $idx;
                    break;
                }
            }

            if ($matchedIdx === null) {
                $unifiedDoors[] = [
                    'id' => $dr['id'],
                    'mesh_name' => $dr['mesh_name'],
                    'wall' => 'front',
                    'label' => $dr['label'],
                    'offset' => 0.0,
                    'x' => $dr['x'],
                    'y' => $dr['y'],
                    'z' => $dr['z'],
                    'minX' => $dr['x'] - $dr['width'] / 2,
                    'maxX' => $dr['x'] + $dr['width'] / 2,
                    'minY' => $dr['y'] - $dr['height'] / 2,
                    'maxY' => $dr['y'] + $dr['height'] / 2,
                    'minZ' => $dr['z'] - ($dr['depth'] ?? 0.2) / 2,
                    'maxZ' => $dr['z'] + ($dr['depth'] ?? 0.2) / 2,
                ];
            } else {
                $u = &$unifiedDoors[$matchedIdx];
                $u['minX'] = min($u['minX'], $dr['x'] - $dr['width'] / 2);
                $u['maxX'] = max($u['maxX'], $dr['x'] + $dr['width'] / 2);
                $u['minY'] = min($u['minY'], $dr['y'] - $dr['height'] / 2);
                $u['maxY'] = max($u['maxY'], $dr['y'] + $dr['height'] / 2);
                $u['minZ'] = min($u['minZ'], $dr['z'] - ($dr['depth'] ?? 0.2) / 2);
                $u['maxZ'] = max($u['maxZ'], $dr['z'] + ($dr['depth'] ?? 0.2) / 2);
                $u['x'] = round(($u['minX'] + $u['maxX']) / 2, 2);
                $u['y'] = round(($u['minY'] + $u['maxY']) / 2, 2);
                $u['z'] = round(($u['minZ'] + $u['maxZ']) / 2, 2);
                unset($u);
            }
        }

        $finalDoors = [];
        $entranceCount = 0;
        $patioCount = 0;
        foreach ($unifiedDoors as $u) {
            $doorW = max(1.2, round($u['maxX'] - $u['minX'], 2));
            $doorH = max(2.1, round($u['maxY'] - $u['minY'], 2));
            $isGarage = str_contains(strtolower($u['mesh_name'] ?? ''), '2657') || $u['y'] < -2.4;
            $isEntrance = abs($u['z'] - 9.9) < 6.0 || $u['z'] > 0;
            if ($isGarage) {
                $slugId = 'cad-door-basement-garage';
                $title = 'Basement Garage Shutter Door';
            } elseif ($isEntrance) {
                $entranceCount++;
                $slugId = $entranceCount === 1 ? 'cad-door-front-entrance' : "cad-door-front-entrance-{$entranceCount}";
                $title = $entranceCount === 1 ? 'Front Entrance Double Door' : "Front Entrance Double Door ({$entranceCount})";
            } else {
                $patioCount++;
                $slugId = $patioCount === 1 ? 'cad-door-patio-garden' : "cad-door-patio-garden-{$patioCount}";
                $title = $patioCount === 1 ? 'Patio Garden Double Door' : "Patio Garden Double Door ({$patioCount})";
            }

            $finalDoors[] = [
                'id' => $slugId,
                'mesh_name' => $u['mesh_name'],
                'wall' => 'front',
                'label' => $title,
                'offset' => 0.0,
                'width' => $doorW,
                'height' => $doorH,
                'x' => $u['x'],
                'y' => $u['y'],
                'z' => $u['z'],
            ];
        }

        $doors = $finalDoors;

        return compact('furniture', 'lighting', 'plants', 'doors', 'stairs');
    }

    /**
     * Format sub-object name into human-readable title.
     */
    public static function formatSubObjectLabel(string $name): string
    {
        $clean = preg_replace('/[_\-]+/', ' ', $name);
        $clean = preg_replace('/\s+/', ' ', trim((string) $clean));
        if (strtoupper($clean) === $clean) {
            $clean = ucwords(strtolower($clean));
        } else {
            $clean = Str::headline($clean);
        }

        return $clean;
    }

    /**
     * Generate modular floors data for the imported house with discrete decomposed items.
     *
     * @param  array{
     *     furniture?: list<array<string, mixed>>,
     *     lighting?: list<array<string, mixed>>,
     *     plants?: list<array<string, mixed>>,
     *     doors?: list<array<string, mixed>>,
     *     stairs?: list<array<string, mixed>>,
     * }  $decomposed
     * @return list<array<string, mixed>>
     */
    protected static function generateFloorsLayout(float $width, float $depth, float $height, array $decomposed = [], ?array $inspection = null, float $scaleFactor = 1.0): array
    {
        $stories = max(1, min(6, (int) round($height / 3.4)));
        $floors = [];

        $allItems = array_merge(
            $decomposed['furniture'] ?? [],
            $decomposed['lighting'] ?? [],
            $decomposed['plants'] ?? []
        );

        $hasBasement = false;
        if ($inspection && isset($inspection['bbox']['min_y'])) {
            $minY = (float) $inspection['bbox']['min_y'] * $scaleFactor;
            if ($minY < -0.8) {
                $hasBasement = true;
            }
        }
        if (! $hasBasement) {
            foreach (($decomposed['doors'] ?? []) as $dr) {
                if (((float) ($dr['y'] ?? 0.0)) < -0.8) {
                    $hasBasement = true;
                    break;
                }
            }
        }
        if (! $hasBasement) {
            foreach (($decomposed['furniture'] ?? []) as $fn) {
                if (((float) ($fn['y'] ?? 0.0)) < -0.8) {
                    $hasBasement = true;
                    break;
                }
            }
        }

        if ($hasBasement) {
            $basementItems = array_values(array_filter($allItems, function ($item) {
                return ((float) ($item['y'] ?? 0.0)) < -0.5;
            }));
            $basementDoors = array_values(array_filter($decomposed['doors'] ?? [], function ($door) {
                return ((float) ($door['y'] ?? 0.0)) < -0.5;
            }));

            $floors[] = [
                'id' => 'cad-floor-basement',
                'name' => 'Lower Floor (Basement & Sunken Patio)',
                'level' => -1,
                'height' => 3.0,
                'elevation' => -3.0,
                'rooms' => [
                    [
                        'id' => 'cad-room-basement',
                        'name' => 'Basement Garage & Sunken Courtyard',
                        'type' => 'garage',
                        'floor_id' => 'cad-floor-basement',
                        'elevation' => -3.0,
                        'height' => 3.0,
                        'color' => '#64748b',
                        'opacity' => 1.0,
                        'layout' => [
                            'size' => ['w' => $width, 'd' => $depth, 'h' => 3.0],
                            'position' => ['x' => 0.0, 'z' => 0.0],
                            'theme' => [
                                'floor' => 'concrete',
                                'wall' => 'stone',
                                'wall_color' => '#94a3b8',
                                'ceiling' => 'open_sky',
                                'ceiling_color' => '#ffffff',
                                'light' => 'cool',
                                'brightness' => 1.0,
                            ],
                            'doors' => $basementDoors,
                            'windows' => [],
                            'objects' => $basementItems,
                        ],
                    ],
                ],
            ];
        }

        for ($lvl = 0; $lvl < $stories; $lvl++) {
            $elev = round($lvl * 3.4, 2);
            $floorName = $lvl === 0 ? 'Ground Level (Foundation)' : "Floor {$lvl} (Upper Level)";

            // Filter decomposed items belonging to this vertical floor level
            $floorObjects = array_values(array_filter($allItems, function ($item) use ($lvl, $stories) {
                $itemY = (float) ($item['y'] ?? 0.0);
                if ($lvl === 0) {
                    return ($itemY >= -0.5 && $itemY < 3.0) || ($stories === 1 && $itemY >= -0.5);
                }

                return $itemY >= ($lvl * 3.4 - 0.5) && $itemY < (($lvl + 1) * 3.4);
            }));

            // Filter doors for this floor level
            $floorDoors = array_values(array_filter($decomposed['doors'] ?? [], function ($door) use ($lvl) {
                $doorY = (float) ($door['y'] ?? 0.0);
                if ($lvl === 0) {
                    return $doorY >= -0.5 && $doorY < 3.0;
                }

                return $doorY >= 3.0;
            }));

            $floors[] = [
                'id' => "cad-floor-{$lvl}",
                'name' => $floorName,
                'level' => $lvl,
                'height' => 3.4,
                'elevation' => $elev,
                'rooms' => [
                    [
                        'id' => "cad-room-base-{$lvl}",
                        'name' => $lvl === 0 ? 'Main Architectural Living Space' : "Level {$lvl} Suite Gallery",
                        'type' => $lvl === 0 ? 'living' : 'bedroom',
                        'color' => $lvl === 0 ? '#3b82f6' : '#8b5cf6',
                        'layout' => [
                            'size' => ['w' => $width, 'd' => $depth, 'h' => 3.4],
                            'position' => ['x' => 0.0, 'z' => 0.0],
                            'theme' => [
                                'floor' => $lvl === 0 ? 'hardwood' : 'parquet',
                                'wall' => 'plaster',
                                'wall_color' => '#f8fafc',
                                'ceiling' => 'open_sky',
                                'ceiling_color' => '#ffffff',
                                'light' => 'warm',
                                'brightness' => 1.2,
                            ],
                            'doors' => $floorDoors,
                            'windows' => [],
                            'objects' => $floorObjects,
                        ],
                    ],
                ],
            ];
        }

        return $floors;
    }

    /**
     * Process standalone Autodesk 3ds Max (.max) file via converter or provide detailed export advice.
     *
     * @return array{success: bool, error?: string, stored_path?: string, stored_mtl_path?: ?string, ext?: string}
     */
    protected static function processMaxFile(UploadedFile $file, string $subFolder, string $storageDisk, string $origName): array
    {
        $realPath = $file->getRealPath();
        $content = @file_get_contents($realPath) ?: '';
        $processed = MaxFormatAdapter::process($content, $realPath);

        if ($processed['valid'] && ! empty($processed['obj_content'])) {
            $hashBase = Str::random(16).'_'.Str::slug(Str::limit($origName, 30, ''));
            $objPath = "{$subFolder}/{$hashBase}.obj";
            Storage::disk($storageDisk)->put($objPath, $processed['obj_content']);

            $mtlPath = null;
            if (! empty($processed['mtl_content'])) {
                $mtlPath = "{$subFolder}/{$hashBase}.mtl";
                Storage::disk($storageDisk)->put($mtlPath, $processed['mtl_content']);
            }

            return [
                'success' => true,
                'stored_path' => $objPath,
                'stored_mtl_path' => $mtlPath,
                'ext' => 'obj',
            ];
        }

        $errorMsg = $processed['error'] ?? 'Autodesk 3ds Max (.max) is a proprietary binary project format that cannot be rendered directly in WebGL without conversion.';
        $advice = $processed['advice'] ?? "In 3ds Max: Select File -> Export -> Export..., choose type 'Wavefront Object (*.OBJ)' or 'glTF / GLB', ensure materials are included, then upload the exported 3D model or a .ZIP archive.";

        return [
            'success' => false,
            'error' => "{$errorMsg} {$advice}",
        ];
    }

    /**
     * Extract 3D models and materials from a ZIP archive.
     *
     * @return array{success: bool, error?: string, stored_path?: string, stored_mtl_path?: ?string, ext?: string}
     */
    protected static function extractZipArchive(string $zipFilePath, string $subFolder, string $storageDisk, string $origName): array
    {
        if (! class_exists(ZipArchive::class)) {
            return ['success' => false, 'error' => 'PHP ZipArchive extension is not enabled on this server.'];
        }

        $zip = new ZipArchive;
        if ($zip->open($zipFilePath) !== true) {
            return ['success' => false, 'error' => 'Could not open ZIP archive file.'];
        }

        $modelIndex = -1;
        $modelExt = null;
        $mtlIndex = -1;
        $maxIndex = -1;

        $targetExts = ['obj', 'glb', 'gltf', 'dxf'];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->getNameIndex($i);
            if (! $entry || str_ends_with($entry, '/')) {
                continue;
            }
            $eExt = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if ($modelIndex === -1 && in_array($eExt, $targetExts, true)) {
                $modelIndex = $i;
                $modelExt = $eExt;
            } elseif ($eExt === 'mtl' && $mtlIndex === -1) {
                $mtlIndex = $i;
            } elseif ($eExt === 'max' && $maxIndex === -1) {
                $maxIndex = $i;
            }
        }

        if ($modelIndex !== -1) {
            $content = $zip->getFromIndex($modelIndex);
            $hashBase = Str::random(16).'_'.Str::slug(Str::limit($origName, 30, ''));
            $modelPath = "{$subFolder}/{$hashBase}.{$modelExt}";
            Storage::disk($storageDisk)->put($modelPath, $content);

            $storedMtlPath = null;
            if ($mtlIndex !== -1) {
                $mtlContent = $zip->getFromIndex($mtlIndex);
                if ($mtlContent) {
                    $storedMtlPath = "{$subFolder}/{$hashBase}.mtl";
                    Storage::disk($storageDisk)->put($storedMtlPath, $mtlContent);
                }
            }

            $zip->close();

            return [
                'success' => true,
                'stored_path' => $modelPath,
                'stored_mtl_path' => $storedMtlPath,
                'ext' => $modelExt,
            ];
        }

        if ($maxIndex !== -1) {
            $maxContent = $zip->getFromIndex($maxIndex);
            $zip->close();

            $tempMax = sys_get_temp_dir().DIRECTORY_SEPARATOR.uniqid('zip_max_', true).'.max';
            file_put_contents($tempMax, $maxContent);
            $converted = MaxFormatAdapter::process($maxContent, $tempMax);
            @unlink($tempMax);

            if ($converted['valid'] && ! empty($converted['obj_content'])) {
                $hashBase = Str::random(16).'_'.Str::slug(Str::limit($origName, 30, ''));
                $objPath = "{$subFolder}/{$hashBase}.obj";
                Storage::disk($storageDisk)->put($objPath, $converted['obj_content']);

                $storedMtlPath = null;
                if (! empty($converted['mtl_content'])) {
                    $storedMtlPath = "{$subFolder}/{$hashBase}.mtl";
                    Storage::disk($storageDisk)->put($storedMtlPath, $converted['mtl_content']);
                }

                return [
                    'success' => true,
                    'stored_path' => $objPath,
                    'stored_mtl_path' => $storedMtlPath,
                    'ext' => 'obj',
                ];
            }

            return [
                'success' => false,
                'error' => 'The ZIP archive contains an Autodesk 3ds Max (.max) file without companion OBJ/glTF geometry. Export your model from 3ds Max as OBJ (.obj + .mtl) or glTF, or configure MAX_CONVERTER_PATH on your server.',
            ];
        }

        $zip->close();

        return [
            'success' => false,
            'error' => 'No supported 3D model found inside the ZIP archive. Archive must contain an .obj, .glb, .gltf, .dxf, or converted .max file.',
        ];
    }

    /**
     * Extract 3D models and materials from a RAR archive.
     *
     * @return array{success: bool, error?: string, stored_path?: string, stored_mtl_path?: ?string, ext?: string}
     */
    protected static function extractRarArchive(string $rarFilePath, string $subFolder, string $storageDisk, string $origName): array
    {
        $extracted = RarExtractor::extract($rarFilePath);
        if (! $extracted['success']) {
            return [
                'success' => false,
                'error' => $extracted['error'] ?? 'Could not extract RAR archive.',
            ];
        }

        if (! empty($extracted['obj_content'])) {
            $hashBase = Str::random(16).'_'.Str::slug(Str::limit($origName, 30, ''));
            $objPath = "{$subFolder}/{$hashBase}.obj";
            Storage::disk($storageDisk)->put($objPath, $extracted['obj_content']);

            $storedMtlPath = null;
            if (! empty($extracted['mtl_content'])) {
                $storedMtlPath = "{$subFolder}/{$hashBase}.mtl";
                Storage::disk($storageDisk)->put($storedMtlPath, $extracted['mtl_content']);
            }

            return [
                'success' => true,
                'stored_path' => $objPath,
                'stored_mtl_path' => $storedMtlPath,
                'ext' => 'obj',
            ];
        }

        if (! empty($extracted['has_max'])) {
            return [
                'success' => false,
                'error' => 'The RAR archive contains an Autodesk 3ds Max (.max) file without companion OBJ geometry. Please export from 3ds Max as Wavefront OBJ (.obj + .mtl) or glTF before uploading.',
            ];
        }

        return [
            'success' => false,
            'error' => 'No supported 3D model found inside the RAR archive. Archive must contain an .obj model.',
        ];
    }
}
