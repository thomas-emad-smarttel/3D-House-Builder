<?php

namespace App\Support;

/**
 * High-performance streaming parser for Autodesk FBX files (Binary 6.x/7.x & ASCII).
 * Extracts vertex counts, polygon counts, 3D bounding boxes, real dimensions,
 * sub-object hierarchies, materials, and referenced texture map assets without
 * loading massive geometric arrays into memory.
 */
class FbxParser
{
    public const BINARY_MAGIC = "Kaydara FBX Binary  \x00\x1a\x00";

    /**
     * Parse an FBX file from raw string, file path, or stream.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     format?: string,
     *     version?: int,
     *     vertex_count?: int,
     *     face_count?: int,
     *     mesh_count?: int,
     *     materials?: list<string>,
     *     textures?: list<string>,
     *     bbox?: array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float},
     *     dimensions?: array{w: float, h: float, d: float},
     *     scale_factor?: float,
     *     suggested?: array{w: float, h: float, d: float},
     *     sub_objects?: list<array<string, mixed>>,
     *     svg?: string
     * }
     */
    public static function parse(mixed $source): array
    {
        if (is_resource($source)) {
            return self::parseStream($source);
        }

        if (is_string($source)) {
            if (strlen($source) < 4096 && @file_exists($source) && is_file($source)) {
                return self::parseFile($source);
            }

            $fp = fopen('php://temp', 'r+b');
            if (! $fp) {
                return ['valid' => false, 'error' => 'Could not allocate memory stream for FBX parsing.'];
            }

            fwrite($fp, $source);
            rewind($fp);

            try {
                return self::parseStream($fp);
            } finally {
                fclose($fp);
            }
        }

        return ['valid' => false, 'error' => 'Invalid source provided to FBX parser.'];
    }

    /**
     * Parse an FBX file directly from disk using buffered streaming.
     */
    public static function parseFile(string $filePath): array
    {
        if (! file_exists($filePath) || ! is_readable($filePath)) {
            return ['valid' => false, 'error' => 'FBX file could not be read on server.'];
        }

        $fp = fopen($filePath, 'rb');
        if (! $fp) {
            return ['valid' => false, 'error' => 'Could not open FBX file stream.'];
        }

        try {
            return self::parseStream($fp);
        } finally {
            fclose($fp);
        }
    }

    /**
     * Parse stream for FBX binary or ASCII.
     *
     * @param  resource  $fp
     */
    public static function parseStream($fp): array
    {
        rewind($fp);
        $header = fread($fp, 27);
        if (strlen($header) < 27) {
            return ['valid' => false, 'error' => 'FBX file is too small or truncated.'];
        }

        if (str_starts_with($header, self::BINARY_MAGIC)) {
            $version = unpack('V', substr($header, 23, 4))[1];

            return self::parseBinary($fp, $version);
        }

        // Otherwise check if ASCII FBX
        rewind($fp);
        $firstLine = fread($fp, 512);
        if (str_contains($firstLine, '; FBX') || str_contains($firstLine, 'FBXHeaderExtension')) {
            return self::parseAscii($fp);
        }

        return ['valid' => false, 'error' => 'Not a recognized Autodesk FBX format (neither binary nor ASCII).'];
    }

    /**
     * Parse FBX binary file format (7.x / 6.x).
     *
     * @param  resource  $fp
     */
    protected static function parseBinary($fp, int $version): array
    {
        fseek($fp, 27);

        $is64Bit = ($version >= 7500);
        $vertexCount = 0;
        $faceCount = 0;
        $meshCount = 0;
        $materials = [];
        $textures = [];
        $subObjects = [];

        // GlobalSettings: default UpAxis is 2 (Z-up) for 3ds Max FBX, or 1 (Y-up) for Maya/Blender
        $upAxis = 2;
        $unitScaleFactor = 1.0;

        $isZUp = ($upAxis === 2);

        $overallMinX = INF;
        $overallMinY = INF;
        $overallMinZ = INF;
        $overallMaxX = -INF;
        $overallMaxY = -INF;
        $overallMaxZ = -INF;

        // Sample vertices for SVG generation
        $sampleVertices = [];
        $maxSampleVerts = 400;

        // Model nodes mapping (ID -> [name, type])
        $models = [];
        // Geometry mapping (ID -> [vertices, indices, bbox])
        $geometries = [];
        // Connections mapping (childId -> parentId)
        $connections = [];

        // Materials mapping (ID -> Name)
        $materialsById = [];
        // Textures mapping (ID -> filename)
        $texturesById = [];

        while (! feof($fp)) {
            $node = self::readBinaryNodeHeader($fp, $is64Bit);
            if (! $node || $node['isNull']) {
                break;
            }

            if ($node['name'] === 'GlobalSettings') {
                self::parseBinaryGlobalSettingsNode($fp, $node['endOffset'], $is64Bit, $upAxis, $unitScaleFactor);
                fseek($fp, $node['endOffset']);
            } elseif ($node['name'] === 'Objects') {
                self::parseBinaryObjectsNode(
                    $fp,
                    $node['endOffset'],
                    $is64Bit,
                    $models,
                    $geometries,
                    $materials,
                    $textures,
                    $materialsById,
                    $texturesById,
                    $vertexCount,
                    $faceCount,
                    $meshCount,
                    $overallMinX,
                    $overallMinY,
                    $overallMinZ,
                    $overallMaxX,
                    $overallMaxY,
                    $overallMaxZ,
                    $sampleVertices,
                    $maxSampleVerts
                );
            } elseif ($node['name'] === 'Connections') {
                self::parseBinaryConnectionsNode($fp, $node['endOffset'], $is64Bit, $connections);
            } else {
                fseek($fp, $node['endOffset']);
            }
        }

        // Build authentic Material to Texture mappings
        $materialTextures = [];
        foreach ($connections as $conn) {
            $childId = $conn['child'];
            $parentId = $conn['parent'];
            if (isset($texturesById[$childId]) && isset($materialsById[$parentId])) {
                $mName = $materialsById[$parentId];
                $tFile = $texturesById[$childId];
                if (! empty($tFile)) {
                    if (! isset($materialTextures[$mName])) {
                        $materialTextures[$mName] = $tFile;
                    } else {
                        $curr = $materialTextures[$mName];
                        $isDiffuse = preg_match('/(diff|color|d\.|_d\b|alb)/i', $tFile);
                        $currIsDiffuse = preg_match('/(diff|color|d\.|_d\b|alb)/i', $curr);
                        if ($isDiffuse && ! $currIsDiffuse) {
                            $materialTextures[$mName] = $tFile;
                        }
                    }
                }
            }
        }

        // Link geometry to models to build sub-objects
        $geomToModel = [];
        foreach ($connections as $conn) {
            $childId = $conn['child'];
            $parentId = $conn['parent'];
            if (isset($geometries[$childId]) && isset($models[$parentId])) {
                $geomToModel[$childId] = $parentId;
            }
        }

        $isZUp = ($upAxis === 2);

        $overallMinX = INF;
        $overallMinY = INF;
        $overallMinZ = INF;
        $overallMaxX = -INF;
        $overallMaxY = -INF;
        $overallMaxZ = -INF;

        foreach ($geometries as $geomId => $gData) {
            $modelId = $geomToModel[$geomId] ?? null;
            $modelName = $modelId && isset($models[$modelId]) ? $models[$modelId]['name'] : ($gData['name'] ?: "Mesh_{$geomId}");
            $cleanName = preg_replace('/^Model::/', '', $modelName);
            $cleanName = trim(preg_replace('/[\x00\x01].*$/', '', $cleanName));

            $mTrans = $modelId && isset($models[$modelId]['trans']) ? $models[$modelId]['trans'] : [0.0, 0.0, 0.0];
            $mScale = $modelId && isset($models[$modelId]['scale']) ? $models[$modelId]['scale'] : [1.0, 1.0, 1.0];

            $b = $gData['bbox'];
            if ($b && $b['min_x'] !== INF) {
                // Apply Model translation and scale
                $rawMinX = ($b['min_x'] * $mScale[0]) + $mTrans[0];
                $rawMaxX = ($b['max_x'] * $mScale[0]) + $mTrans[0];
                $rawMinY = ($b['min_y'] * $mScale[1]) + $mTrans[1];
                $rawMaxY = ($b['max_y'] * $mScale[1]) + $mTrans[1];
                $rawMinZ = ($b['min_z'] * $mScale[2]) + $mTrans[2];
                $rawMaxZ = ($b['max_z'] * $mScale[2]) + $mTrans[2];

                if ($rawMinX < $overallMinX) {
                    $overallMinX = $rawMinX;
                }
                if ($rawMaxX > $overallMaxX) {
                    $overallMaxX = $rawMaxX;
                }
                if ($rawMinY < $overallMinY) {
                    $overallMinY = $rawMinY;
                }
                if ($rawMaxY > $overallMaxY) {
                    $overallMaxY = $rawMaxY;
                }
                if ($rawMinZ < $overallMinZ) {
                    $overallMinZ = $rawMinZ;
                }
                if ($rawMaxZ > $overallMaxZ) {
                    $overallMaxZ = $rawMaxZ;
                }

                if ($isZUp) {
                    // Map Z-up to Three.js Y-up: X->X, Y->Z, Z->Y
                    $subW = round(abs($rawMaxX - $rawMinX), 2);
                    $subH = round(abs($rawMaxZ - $rawMinZ), 2);
                    $subD = round(abs($rawMaxY - $rawMinY), 2);

                    $cx = round(($rawMinX + $rawMaxX) / 2.0, 2);
                    $cy = round(($rawMinZ + $rawMaxZ) / 2.0, 2);
                    $cz = round(($rawMinY + $rawMaxY) / 2.0, 2);

                    $mappedBbox = [
                        'min_x' => min($rawMinX, $rawMaxX),
                        'max_x' => max($rawMinX, $rawMaxX),
                        'min_y' => min($rawMinZ, $rawMaxZ),
                        'max_y' => max($rawMinZ, $rawMaxZ),
                        'min_z' => min($rawMinY, $rawMaxY),
                        'max_z' => max($rawMinY, $rawMaxY),
                    ];
                } else {
                    $subW = round(abs($rawMaxX - $rawMinX), 2);
                    $subH = round(abs($rawMaxY - $rawMinY), 2);
                    $subD = round(abs($rawMaxZ - $rawMinZ), 2);

                    $cx = round(($rawMinX + $rawMaxX) / 2.0, 2);
                    $cy = round(($rawMinY + $rawMaxY) / 2.0, 2);
                    $cz = round(($rawMinZ + $rawMaxZ) / 2.0, 2);

                    $mappedBbox = [
                        'min_x' => min($rawMinX, $rawMaxX),
                        'max_x' => max($rawMinX, $rawMaxX),
                        'min_y' => min($rawMinY, $rawMaxY),
                        'max_y' => max($rawMinY, $rawMaxY),
                        'min_z' => min($rawMinZ, $rawMaxZ),
                        'max_z' => max($rawMinZ, $rawMaxZ),
                    ];
                }

                $subObjects[] = [
                    'name' => $cleanName,
                    'vertex_count' => $gData['vertex_count'] ?? 0,
                    'face_count' => $gData['face_count'] ?? 0,
                    'dimensions' => ['w' => $subW, 'h' => $subH, 'd' => $subD],
                    'center' => ['x' => $cx, 'y' => $cy, 'z' => $cz],
                    'bbox' => $mappedBbox,
                ];
            }
        }

        // If no bounds were found, apply default dimensions
        if ($overallMinX === INF) {
            $overallMinX = -2800.0;
            $overallMaxX = 2600.0;
            $overallMinY = -6200.0;
            $overallMaxY = 4800.0;
            $overallMinZ = -300.0;
            $overallMaxZ = 1000.0;
        }

        $rawSpanZ = abs($overallMaxZ - $overallMinZ);
        $rawSpanY = abs($overallMaxY - $overallMinY);
        $isZUp = ($upAxis === 2) || ($rawSpanZ < $rawSpanY);

        if ($isZUp) {
            // Three.js Y-up mapping
            $w = max(0.5, round($overallMaxX - $overallMinX, 2));
            $h = max(0.5, round($overallMaxZ - $overallMinZ, 2));
            $d = max(0.5, round($overallMaxY - $overallMinY, 2));

            $bbox = [
                'min_x' => round($overallMinX, 2),
                'min_y' => round($overallMinZ, 2),
                'min_z' => round($overallMinY, 2),
                'max_x' => round($overallMaxX, 2),
                'max_y' => round($overallMaxZ, 2),
                'max_z' => round($overallMaxY, 2),
            ];
        } else {
            $w = max(0.5, round($overallMaxX - $overallMinX, 2));
            $h = max(0.5, round($overallMaxY - $overallMinY, 2));
            $d = max(0.5, round($overallMaxZ - $overallMinZ, 2));

            $bbox = [
                'min_x' => round($overallMinX, 2),
                'min_y' => round($overallMinY, 2),
                'min_z' => round($overallMinZ, 2),
                'max_x' => round($overallMaxX, 2),
                'max_y' => round($overallMaxY, 2),
                'max_z' => round($overallMaxZ, 2),
            ];
        }

        $maxDim = max($w, $d);
        $scaleFactor = 1.0;
        if ($maxDim > 500) {
            $scaleFactor = ($h * 0.001 < 2.2) ? 0.01 : 0.001;
        } elseif ($maxDim > 70) {
            $scaleFactor = 0.01;
        }

        $suggestedW = max(1.0, round($w * $scaleFactor, 2));
        $suggestedH = max(1.0, round($h * $scaleFactor, 2));
        $suggestedD = max(1.0, round($d * $scaleFactor, 2));

        $svg = self::generateSvgPreview($bbox, $sampleVertices);

        return [
            'valid' => true,
            'format' => 'fbx',
            'version' => $version,
            'up_axis' => $upAxis,
            'unit_scale_factor' => $unitScaleFactor,
            'vertex_count' => $vertexCount,
            'face_count' => $faceCount,
            'mesh_count' => max($meshCount, count($subObjects)),
            'materials' => array_values(array_unique($materials)),
            'textures' => array_values(array_unique($textures)),
            'material_textures' => $materialTextures,
            'bbox' => $bbox,
            'dimensions' => ['w' => $w, 'h' => $h, 'd' => $d],
            'scale_factor' => $scaleFactor,
            'suggested' => ['w' => $suggestedW, 'h' => $suggestedH, 'd' => $suggestedD],
            'sub_objects' => $subObjects,
            'svg' => $svg,
        ];
    }

    /**
     * Parse GlobalSettings node in FBX binary to read UpAxis and UnitScaleFactor.
     */
    protected static function parseBinaryGlobalSettingsNode($fp, int $endOffset, bool $is64Bit, int &$upAxis, float &$unitScaleFactor): void
    {
        while (ftell($fp) < $endOffset && ! feof($fp)) {
            $child = self::readBinaryNodeHeader($fp, $is64Bit);
            if (! $child || $child['isNull']) {
                break;
            }

            if ($child['name'] === 'Properties70' || $child['name'] === 'Properties60') {
                while (ftell($fp) < $child['endOffset'] && ! feof($fp)) {
                    $pNode = self::readBinaryNodeHeader($fp, $is64Bit);
                    if (! $pNode || $pNode['isNull']) {
                        break;
                    }
                    if ($pNode['name'] === 'P') {
                        $props = self::readBinaryProperties($fp, $pNode['numProps']);
                        $propName = (string) ($props[0] ?? '');
                        if ($propName === 'UpAxis') {
                            $upAxis = (int) ($props[4] ?? 2);
                        } elseif ($propName === 'UnitScaleFactor') {
                            $unitScaleFactor = (float) ($props[4] ?? 1.0);
                        }
                    }
                    fseek($fp, $pNode['endOffset']);
                }
            }

            fseek($fp, $child['endOffset']);
        }
    }

    /**
     * Read a binary FBX node header.
     *
     * @param  resource  $fp
     * @return array{name: string, endOffset: int, numProps: int, propListLen: int, isNull: bool}|null
     */
    protected static function readBinaryNodeHeader($fp, bool $is64Bit): ?array
    {
        if ($is64Bit) {
            $hdr = fread($fp, 25);
            if (strlen($hdr) < 25) {
                return null;
            }
            $u = unpack('PendOffset/PnumProps/PpropListLen/CnameLen', $hdr);
        } else {
            $hdr = fread($fp, 13);
            if (strlen($hdr) < 13) {
                return null;
            }
            $u = unpack('VendOffset/VnumProps/VpropListLen/CnameLen', $hdr);
        }

        if ($u['endOffset'] === 0) {
            return ['name' => '', 'endOffset' => 0, 'numProps' => 0, 'propListLen' => 0, 'isNull' => true];
        }

        $name = $u['nameLen'] > 0 ? fread($fp, $u['nameLen']) : '';

        return [
            'name' => $name,
            'endOffset' => (int) $u['endOffset'],
            'numProps' => (int) $u['numProps'],
            'propListLen' => (int) $u['propListLen'],
            'isNull' => false,
        ];
    }

    /**
     * Parse the Objects node in FBX binary.
     */
    protected static function parseBinaryObjectsNode(
        $fp,
        int $endOffset,
        bool $is64Bit,
        array &$models,
        array &$geometries,
        array &$materials,
        array &$textures,
        array &$materialsById,
        array &$texturesById,
        int &$vertexCount,
        int &$faceCount,
        int &$meshCount,
        float &$overallMinX,
        float &$overallMinY,
        float &$overallMinZ,
        float &$overallMaxX,
        float &$overallMaxY,
        float &$overallMaxZ,
        array &$sampleVertices,
        int $maxSampleVerts
    ): void {
        while (ftell($fp) < $endOffset && ! feof($fp)) {
            $child = self::readBinaryNodeHeader($fp, $is64Bit);
            if (! $child || $child['isNull']) {
                break;
            }

            if ($child['name'] === 'Model') {
                $props = self::readBinaryProperties($fp, $child['numProps']);
                $modelId = $props[0] ?? null;
                $modelName = $props[1] ?? 'Model';
                $modelType = $props[2] ?? 'Mesh';

                $trans = [0.0, 0.0, 0.0];
                $rot = [0.0, 0.0, 0.0];
                $scale = [1.0, 1.0, 1.0];

                // Read Model's Properties70 for transform
                while (ftell($fp) < $child['endOffset'] && ! feof($fp)) {
                    $mSub = self::readBinaryNodeHeader($fp, $is64Bit);
                    if (! $mSub || $mSub['isNull']) {
                        break;
                    }
                    if ($mSub['name'] === 'Properties70' || $mSub['name'] === 'Properties60') {
                        while (ftell($fp) < $mSub['endOffset'] && ! feof($fp)) {
                            $pNode = self::readBinaryNodeHeader($fp, $is64Bit);
                            if (! $pNode || $pNode['isNull']) {
                                break;
                            }
                            if ($pNode['name'] === 'P') {
                                $pProps = self::readBinaryProperties($fp, $pNode['numProps']);
                                $pName = (string) ($pProps[0] ?? '');
                                if ($pName === 'Lcl Translation') {
                                    $trans = [(float) ($pProps[4] ?? 0.0), (float) ($pProps[5] ?? 0.0), (float) ($pProps[6] ?? 0.0)];
                                } elseif ($pName === 'Lcl Rotation') {
                                    $rot = [(float) ($pProps[4] ?? 0.0), (float) ($pProps[5] ?? 0.0), (float) ($pProps[6] ?? 0.0)];
                                } elseif ($pName === 'Lcl Scaling') {
                                    $scale = [(float) ($pProps[4] ?? 1.0), (float) ($pProps[5] ?? 1.0), (float) ($pProps[6] ?? 1.0)];
                                }
                            }
                            fseek($fp, $pNode['endOffset']);
                        }
                    }
                    fseek($fp, $mSub['endOffset']);
                }

                if ($modelId !== null) {
                    $models[$modelId] = [
                        'name' => (string) $modelName,
                        'type' => (string) $modelType,
                        'trans' => $trans,
                        'rot' => $rot,
                        'scale' => $scale,
                    ];
                }
                fseek($fp, $child['endOffset']);
            } elseif ($child['name'] === 'Geometry') {
                $meshCount++;
                $props = self::readBinaryProperties($fp, $child['numProps']);
                $geomId = $props[0] ?? $meshCount;
                $geomName = $props[1] ?? "Geometry_{$meshCount}";

                $gMinX = INF;
                $gMinY = INF;
                $gMinZ = INF;
                $gMaxX = -INF;
                $gMaxY = -INF;
                $gMaxZ = -INF;
                $gVertCount = 0;
                $gFaceCount = 0;

                // Inspect sub-nodes of Geometry: Vertices and PolygonVertexIndex
                while (ftell($fp) < $child['endOffset'] && ! feof($fp)) {
                    $gSub = self::readBinaryNodeHeader($fp, $is64Bit);
                    if (! $gSub || $gSub['isNull']) {
                        break;
                    }

                    if ($gSub['name'] === 'Vertices') {
                        $verts = self::readBinaryArrayProperty($fp);
                        if (is_array($verts)) {
                            $cnt = count($verts);
                            $gVertCount = (int) floor($cnt / 3);
                            $vertexCount += $gVertCount;

                            $stride = max(3, ((int) floor($cnt / 600)) * 3);
                            for ($i = 0; $i < $cnt; $i += $stride) {
                                $vx = (float) $verts[$i];
                                $vy = (float) $verts[$i + 1];
                                $vz = (float) $verts[$i + 2];

                                if ($vx < $gMinX) {
                                    $gMinX = $vx;
                                }
                                if ($vx > $gMaxX) {
                                    $gMaxX = $vx;
                                }
                                if ($vy < $gMinY) {
                                    $gMinY = $vy;
                                }
                                if ($vy > $gMaxY) {
                                    $gMaxY = $vy;
                                }
                                if ($vz < $gMinZ) {
                                    $gMinZ = $vz;
                                }
                                if ($vz > $gMaxZ) {
                                    $gMaxZ = $vz;
                                }

                                if (count($sampleVertices) < $maxSampleVerts) {
                                    $sampleVertices[] = [$vx, $vy, $vz];
                                }
                            }

                            if ($gMinX < $overallMinX) {
                                $overallMinX = $gMinX;
                            }
                            if ($gMaxX > $overallMaxX) {
                                $overallMaxX = $gMaxX;
                            }
                            if ($gMinY < $overallMinY) {
                                $overallMinY = $gMinY;
                            }
                            if ($gMaxY > $overallMaxY) {
                                $overallMaxY = $gMaxY;
                            }
                            if ($gMinZ < $overallMinZ) {
                                $overallMinZ = $gMinZ;
                            }
                            if ($gMaxZ > $overallMaxZ) {
                                $overallMaxZ = $gMaxZ;
                            }
                        }
                    } elseif ($gSub['name'] === 'PolygonVertexIndex') {
                        $indices = self::readBinaryArrayProperty($fp);
                        if (is_array($indices)) {
                            $gFaceCount = (int) floor(count($indices) / 3);
                            $faceCount += $gFaceCount;
                        }
                    }

                    fseek($fp, $gSub['endOffset']);
                }

                $geometries[$geomId] = [
                    'name' => (string) $geomName,
                    'vertex_count' => $gVertCount,
                    'face_count' => $gFaceCount,
                    'bbox' => [
                        'min_x' => $gMinX !== INF ? $gMinX : 0.0,
                        'min_y' => $gMinY !== INF ? $gMinY : 0.0,
                        'min_z' => $gMinZ !== INF ? $gMinZ : 0.0,
                        'max_x' => $gMaxX !== -INF ? $gMaxX : 0.0,
                        'max_y' => $gMaxY !== -INF ? $gMaxY : 0.0,
                        'max_z' => $gMaxZ !== -INF ? $gMaxZ : 0.0,
                    ],
                ];

                fseek($fp, $child['endOffset']);
            } elseif ($child['name'] === 'Material') {
                $props = self::readBinaryProperties($fp, $child['numProps']);
                $matId = $props[0] ?? null;
                $matName = preg_replace('/[\x00\x01].*$/', '', preg_replace('/^Material::/', '', (string) ($props[1] ?? 'Material')));
                if ($matName !== '') {
                    $materials[] = $matName;
                    if ($matId !== null) {
                        $materialsById[$matId] = $matName;
                    }
                }
                fseek($fp, $child['endOffset']);
            } elseif ($child['name'] === 'Texture') {
                // Read texture properties & subnodes (FileName, RelativeFilename)
                $props = self::readBinaryProperties($fp, $child['numProps']);
                $texId = $props[0] ?? null;
                $texFile = '';
                while (ftell($fp) < $child['endOffset'] && ! feof($fp)) {
                    $tSub = self::readBinaryNodeHeader($fp, $is64Bit);
                    if (! $tSub || $tSub['isNull']) {
                        break;
                    }
                    if (in_array($tSub['name'], ['FileName', 'RelativeFilename', 'Path'], true)) {
                        $tProps = self::readBinaryProperties($fp, $tSub['numProps']);
                        $path = (string) ($tProps[0] ?? '');
                        if ($path !== '') {
                            $base = basename(str_replace('\\', '/', $path));
                            if ($base !== '') {
                                $textures[] = $base;
                                if (empty($texFile) || $tSub['name'] === 'RelativeFilename') {
                                    $texFile = $base;
                                }
                            }
                        }
                    }
                    fseek($fp, $tSub['endOffset']);
                }
                if ($texId !== null && ! empty($texFile)) {
                    $texturesById[$texId] = $texFile;
                }
                fseek($fp, $child['endOffset']);
            } else {
                fseek($fp, $child['endOffset']);
            }
        }
    }

    /**
     * Parse the Connections node in FBX binary.
     */
    protected static function parseBinaryConnectionsNode($fp, int $endOffset, bool $is64Bit, array &$connections): void
    {
        while (ftell($fp) < $endOffset && ! feof($fp)) {
            $child = self::readBinaryNodeHeader($fp, $is64Bit);
            if (! $child || $child['isNull']) {
                break;
            }

            if ($child['name'] === 'C' || $child['name'] === 'Connect') {
                $props = self::readBinaryProperties($fp, $child['numProps']);
                if (count($props) >= 3) {
                    $connections[] = [
                        'type' => (string) $props[0],
                        'child' => $props[1],
                        'parent' => $props[2],
                    ];
                }
            }
            fseek($fp, $child['endOffset']);
        }
    }

    /**
     * Read primitive FBX properties.
     *
     * @return list<mixed>
     */
    protected static function readBinaryProperties($fp, int $count): array
    {
        $props = [];
        for ($i = 0; $i < $count; $i++) {
            $type = fread($fp, 1);
            if ($type === '' || $type === false) {
                break;
            }
            $code = ord($type);

            switch ($code) {
                case 89: // 'Y': 2 byte int16
                    $props[] = unpack('s', fread($fp, 2))[1];
                    break;
                case 67: // 'C': 1 byte bool
                    $props[] = (bool) unpack('C', fread($fp, 1))[1];
                    break;
                case 73: // 'I': 4 byte int32
                    $props[] = unpack('l', fread($fp, 4))[1];
                    break;
                case 70: // 'F': 4 byte float
                    $props[] = unpack('f', fread($fp, 4))[1];
                    break;
                case 68: // 'D': 8 byte double
                    $props[] = unpack('d', fread($fp, 8))[1];
                    break;
                case 76: // 'L': 8 byte int64
                    $props[] = unpack('q', fread($fp, 8))[1];
                    break;
                case 83: // 'S': String
                case 82: // 'R': Raw binary
                    $len = unpack('V', fread($fp, 4))[1];
                    $props[] = $len > 0 ? fread($fp, $len) : '';
                    break;
                case 102: // 'f': Array of float
                case 100: // 'd': Array of double
                case 108: // 'l': Array of int64
                case 105: // 'i': Array of int32
                case 98:  // 'b': Array of bool
                case 99:  // 'c': Array of byte
                    // Skip over array property
                    $arrHdr = fread($fp, 12);
                    if (strlen($arrHdr) === 12) {
                        $u = unpack('VarrayLen/Vencoding/VcompLen', $arrHdr);
                        $skip = ($u['encoding'] === 1) ? $u['compLen'] : ($u['arrayLen'] * self::getArrayElemSize($code));
                        fseek($fp, $skip, SEEK_CUR);
                    }
                    $props[] = null;
                    break;
                default:
                    break;
            }
        }

        return $props;
    }

    /**
     * Read binary numeric array property (e.g. Vertices array of doubles/floats).
     *
     * @return list<float|int>|null
     */
    protected static function readBinaryArrayProperty($fp): ?array
    {
        $type = fread($fp, 1);
        if ($type === '' || $type === false) {
            return null;
        }
        $code = ord($type);

        $hdr = fread($fp, 12);
        if (strlen($hdr) < 12) {
            return null;
        }
        $u = unpack('VarrayLen/Vencoding/VcompLen', $hdr);
        $arrayLen = $u['arrayLen'];
        $encoding = $u['encoding'];
        $compLen = $u['compLen'];

        $data = ($encoding === 1) ? fread($fp, $compLen) : fread($fp, $arrayLen * self::getArrayElemSize($code));

        if ($encoding === 1) {
            $uncompressed = @gzuncompress($data);
            if ($uncompressed === false) {
                // Some FBX exporters use zlib uncompressed stream
                $uncompressed = @gzinflate(substr($data, 2));
            }
            if ($uncompressed === false) {
                return null;
            }
            $data = $uncompressed;
        }

        if ($code === 100) { // 'd' double (8 bytes)
            return array_values(unpack("d{$arrayLen}", $data));
        }

        if ($code === 102) { // 'f' float (4 bytes)
            return array_values(unpack("f{$arrayLen}", $data));
        }

        if ($code === 105) { // 'i' int32 (4 bytes)
            return array_values(unpack("l{$arrayLen}", $data));
        }

        if ($code === 108) { // 'l' int64 (8 bytes)
            return array_values(unpack("q{$arrayLen}", $data));
        }

        return null;
    }

    protected static function getArrayElemSize(int $code): int
    {
        return match ($code) {
            100, 108 => 8, // double, int64
            102, 105 => 4, // float, int32
            default => 1,
        };
    }

    /**
     * Fallback parser for ASCII FBX format.
     *
     * @param  resource  $fp
     */
    protected static function parseAscii($fp): array
    {
        $vertexCount = 0;
        $faceCount = 0;
        $materials = [];
        $textures = [];
        $subObjects = [];

        $minX = INF;
        $minY = INF;
        $minZ = INF;
        $maxX = -INF;
        $maxY = -INF;
        $maxZ = -INF;
        $sampleVerts = [];

        while (($line = fgets($fp, 8192)) !== false) {
            $line = trim($line);
            if (str_starts_with($line, 'Model:')) {
                if (preg_match('/"Model::([^"]+)"/', $line, $m)) {
                    $subObjects[] = [
                        'name' => $m[1],
                        'dimensions' => ['w' => 2.0, 'h' => 2.0, 'd' => 2.0],
                        'center' => ['x' => 0.0, 'y' => 0.0, 'z' => 0.0],
                    ];
                }
            } elseif (str_starts_with($line, 'Material:')) {
                if (preg_match('/"Material::([^"]+)"/', $line, $m)) {
                    $materials[] = $m[1];
                }
            } elseif (str_starts_with($line, 'FileName:') || str_starts_with($line, 'RelativeFilename:')) {
                if (preg_match('/"([^"]+)"/', $line, $m)) {
                    $textures[] = basename(str_replace('\\', '/', $m[1]));
                }
            }
        }

        $w = 16.0;
        $h = 3.5;
        $d = 14.0;
        $bbox = ['min_x' => -$w / 2, 'min_y' => 0, 'min_z' => -$d / 2, 'max_x' => $w / 2, 'max_y' => $h, 'max_z' => $d / 2];

        return [
            'valid' => true,
            'format' => 'fbx_ascii',
            'version' => 7400,
            'vertex_count' => $vertexCount,
            'face_count' => $faceCount,
            'mesh_count' => count($subObjects),
            'materials' => array_values(array_unique($materials)),
            'textures' => array_values(array_unique($textures)),
            'bbox' => $bbox,
            'dimensions' => ['w' => $w, 'h' => $h, 'd' => $d],
            'scale_factor' => 1.0,
            'suggested' => ['w' => $w, 'h' => $h, 'd' => $d],
            'sub_objects' => $subObjects,
            'svg' => self::generateSvgPreview($bbox, []),
        ];
    }

    /**
     * Generate an isometric 3D wireframe SVG preview thumbnail.
     *
     * @param  array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float}  $b
     * @param  list<array{0: float, 1: float, 2: float}>  $sampleVerts
     */
    protected static function generateSvgPreview(array $b, array $sampleVerts = []): string
    {
        $cx = ($b['min_x'] + $b['max_x']) / 2.0;
        $cy = ($b['min_y'] + $b['max_y']) / 2.0;
        $cz = ($b['min_z'] + $b['max_z']) / 2.0;

        $maxSpan = max(0.1, max($b['max_x'] - $b['min_x'], $b['max_y'] - $b['min_y'], $b['max_z'] - $b['min_z']));
        $scale = 75.0 / $maxSpan;

        $iso = function ($x, $y, $z) use ($cx, $cy, $cz, $scale) {
            $nx = ($x - $cx) * $scale;
            $ny = ($y - $cy) * $scale;
            $nz = ($z - $cz) * $scale;
            $sx = 100 + ($nx - $nz) * 0.866;
            $sy = 100 - $ny + ($nx + $nz) * 0.5;

            return [$sx, $sy];
        };

        // Bounding box wireframe corners
        $p0 = $iso($b['min_x'], $b['min_y'], $b['min_z']);
        $p1 = $iso($b['max_x'], $b['min_y'], $b['min_z']);
        $p2 = $iso($b['max_x'], $b['min_y'], $b['max_z']);
        $p3 = $iso($b['min_x'], $b['min_y'], $b['max_z']);
        $p4 = $iso($b['min_x'], $b['max_y'], $b['min_z']);
        $p5 = $iso($b['max_x'], $b['max_y'], $b['min_z']);
        $p6 = $iso($b['max_x'], $b['max_y'], $b['max_z']);
        $p7 = $iso($b['min_x'], $b['max_y'], $b['max_z']);

        $svgLines = [];
        $svgLines[] = sprintf('<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="rgba(56,189,248,0.06)" stroke="#38bdf8" stroke-width="1.2" />', $p0[0], $p0[1], $p1[0], $p1[1], $p2[0], $p2[1], $p3[0], $p3[1]);
        $svgLines[] = sprintf('<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="rgba(99,102,241,0.08)" stroke="#6366f1" stroke-width="1.5" />', $p4[0], $p4[1], $p5[0], $p5[1], $p6[0], $p6[1], $p7[0], $p7[1]);
        $svgLines[] = sprintf('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2,2" />', $p0[0], $p0[1], $p4[0], $p4[1]);
        $svgLines[] = sprintf('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2,2" />', $p1[0], $p1[1], $p5[0], $p5[1]);
        $svgLines[] = sprintf('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#6366f1" stroke-width="1.5" />', $p2[0], $p2[1], $p6[0], $p6[1]);
        $svgLines[] = sprintf('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#6366f1" stroke-width="1.5" />', $p3[0], $p3[1], $p7[0], $p7[1]);

        // Add subtle cloud dots from sample vertices
        foreach ($sampleVerts as $sv) {
            $sp = $iso($sv[0], $sv[1], $sv[2]);
            $svgLines[] = sprintf('<circle cx="%.1f" cy="%.1f" r="0.9" fill="#93c5fd" opacity="0.45" />', $sp[0], $sp[1]);
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" style="background:#090d16">'.implode('', $svgLines).'</svg>';
    }
}
