<?php

namespace App\Support;

class ObjParser
{
    /**
     * Parse and inspect an ASCII Wavefront OBJ file from raw string, file path, or stream.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     vertex_count?: int,
     *     face_count?: int,
     *     normal_count?: int,
     *     texcoord_count?: int,
     *     mtllib?: ?string,
     *     materials?: list<string>,
     *     bbox?: array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float},
     *     dimensions?: array{w: float, h: float, d: float},
     *     scale_factor?: float,
     *     suggested?: array{w: float, h: float, d: float},
     *     svg?: string
     * }
     */
    public static function parse(mixed $source): array
    {
        if (is_resource($source)) {
            return self::parseStream($source);
        }

        if (is_string($source)) {
            // If passed a valid file path on disk, parse stream directly to avoid loading large files into memory
            if (strlen($source) < 4096 && @file_exists($source) && is_file($source)) {
                return self::parseFile($source);
            }

            // Treat as in-memory content
            $fp = fopen('php://temp', 'r+b');
            if (! $fp) {
                return ['valid' => false, 'error' => 'Could not allocate memory stream for 3D model parsing.'];
            }

            fwrite($fp, $source);
            rewind($fp);

            try {
                return self::parseStream($fp);
            } finally {
                fclose($fp);
            }
        }

        return ['valid' => false, 'error' => 'Invalid source provided to OBJ parser.'];
    }

    /**
     * Parse an OBJ file directly from a filesystem path using buffered stream reading.
     * Memory usage remains under 5MB even for 100MB+ multi-million polygon files.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     vertex_count?: int,
     *     face_count?: int,
     *     normal_count?: int,
     *     texcoord_count?: int,
     *     mtllib?: ?string,
     *     materials?: list<string>,
     *     bbox?: array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float},
     *     dimensions?: array{w: float, h: float, d: float},
     *     scale_factor?: float,
     *     suggested?: array{w: float, h: float, d: float},
     *     svg?: string
     * }
     */
    public static function parseFile(string $filePath): array
    {
        if (! file_exists($filePath) || ! is_readable($filePath)) {
            return ['valid' => false, 'error' => '3D model file could not be read on server.'];
        }

        $fp = fopen($filePath, 'rb');
        if (! $fp) {
            return ['valid' => false, 'error' => 'Could not open 3D model file stream.'];
        }

        try {
            return self::parseStream($fp);
        } finally {
            fclose($fp);
        }
    }

    /**
     * Parse stream line-by-line without accumulating massive PHP arrays in memory.
     *
     * @param  resource  $fp
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     vertex_count?: int,
     *     face_count?: int,
     *     normal_count?: int,
     *     texcoord_count?: int,
     *     mtllib?: ?string,
     *     materials?: list<string>,
     *     bbox?: array{min_x: float, min_y: float, min_z: float, max_x: float, max_y: float, max_z: float},
     *     dimensions?: array{w: float, h: float, d: float},
     *     scale_factor?: float,
     *     suggested?: array{w: float, h: float, d: float},
     *     svg?: string
     * }
     */
    public static function parseStream($fp): array
    {
        $vertexCount = 0;
        $faceCount = 0;
        $normalCount = 0;
        $texcoordCount = 0;
        $mtllib = null;
        $materials = [];

        $minX = INF;
        $minY = INF;
        $minZ = INF;
        $maxX = -INF;
        $maxY = -INF;
        $maxZ = -INF;

        // Sample vertices packed in a binary string (12 bytes per vertex) to keep memory near zero
        $packedVertices = '';
        $sampleVerticesCount = 0;
        $maxSampleVertices = 25000;

        // Sample up to 300 faces for thumbnail projection
        $sampleFaces = [];
        $maxSampleFaces = 300;

        // Sub-object decomposition tracking (o <name> and g <name>)
        $subObjects = [];
        $currentObjName = '';
        $objMinX = INF;
        $objMaxX = -INF;
        $objMinY = INF;
        $objMaxY = -INF;
        $objMinZ = INF;
        $objMaxZ = -INF;
        $objVertexCount = 0;

        $commitSubObject = function () use (
            &$subObjects,
            &$currentObjName,
            &$objMinX,
            &$objMaxX,
            &$objMinY,
            &$objMaxY,
            &$objMinZ,
            &$objMaxZ,
            &$objVertexCount
        ) {
            if ($objVertexCount > 0 && $currentObjName !== '') {
                $subObjects[] = [
                    'name' => $currentObjName,
                    'vertex_count' => $objVertexCount,
                    'bbox' => [
                        'min_x' => round($objMinX, 4),
                        'min_y' => round($objMinY, 4),
                        'min_z' => round($objMinZ, 4),
                        'max_x' => round($objMaxX, 4),
                        'max_y' => round($objMaxY, 4),
                        'max_z' => round($objMaxZ, 4),
                    ],
                    'dimensions' => [
                        'w' => round(max(0.001, $objMaxX - $objMinX), 4),
                        'h' => round(max(0.001, $objMaxY - $objMinY), 4),
                        'd' => round(max(0.001, $objMaxZ - $objMinZ), 4),
                    ],
                    'center' => [
                        'x' => round(($objMinX + $objMaxX) / 2, 4),
                        'y' => round(($objMinY + $objMaxY) / 2, 4),
                        'z' => round(($objMinZ + $objMaxZ) / 2, 4),
                    ],
                ];
            }
            $objMinX = INF;
            $objMaxX = -INF;
            $objMinY = INF;
            $objMaxY = -INF;
            $objMinZ = INF;
            $objMaxZ = -INF;
            $objVertexCount = 0;
        };

        while (($line = fgets($fp, 65536)) !== false) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $first = $line[0];

            if ($first === 'o' || $first === 'g') {
                $second = $line[1] ?? ' ';
                if ($second === ' ' || $second === "\t") {
                    $commitSubObject();
                    $currentObjName = trim(substr($line, 2));
                }
            } elseif ($first === 'v') {
                $second = $line[1] ?? ' ';
                if ($second === ' ' || $second === "\t") {
                    $vertexCount++;
                    $x = null;
                    $y = null;
                    $z = null;
                    $matched = sscanf($line, 'v %f %f %f', $x, $y, $z);
                    if ($matched >= 3 && $x !== null && $y !== null && $z !== null) {
                        if ($x < $minX) {
                            $minX = $x;
                        }
                        if ($x > $maxX) {
                            $maxX = $x;
                        }
                        if ($y < $minY) {
                            $minY = $y;
                        }
                        if ($y > $maxY) {
                            $maxY = $y;
                        }
                        if ($z < $minZ) {
                            $minZ = $z;
                        }
                        if ($z > $maxZ) {
                            $maxZ = $z;
                        }

                        // Track sub-object bounding box
                        if ($x < $objMinX) {
                            $objMinX = $x;
                        }
                        if ($x > $objMaxX) {
                            $objMaxX = $x;
                        }
                        if ($y < $objMinY) {
                            $objMinY = $y;
                        }
                        if ($y > $objMaxY) {
                            $objMaxY = $y;
                        }
                        if ($z < $objMinZ) {
                            $objMinZ = $z;
                        }
                        if ($z > $objMaxZ) {
                            $objMaxZ = $z;
                        }
                        $objVertexCount++;

                        if ($sampleVerticesCount < $maxSampleVertices) {
                            $packedVertices .= pack('fff', $x, $y, $z);
                            $sampleVerticesCount++;
                        }
                    }
                } elseif ($second === 'n') {
                    $normalCount++;
                } elseif ($second === 't') {
                    $texcoordCount++;
                }
            } elseif ($first === 'f') {
                $second = $line[1] ?? ' ';
                if ($second === ' ' || $second === "\t") {
                    $faceCount++;

                    if (count($sampleFaces) < $maxSampleFaces) {
                        $parts = preg_split('/\s+/', substr($line, 2));
                        if (is_array($parts) && count($parts) >= 3) {
                            $indices = [];
                            foreach ($parts as $p) {
                                if ($p === '') {
                                    continue;
                                }
                                $slashPos = strpos($p, '/');
                                $idxStr = $slashPos === false ? $p : substr($p, 0, $slashPos);
                                $idx = (int) $idxStr;
                                if ($idx !== 0) {
                                    $indices[] = $idx;
                                }
                            }
                            if (count($indices) >= 3) {
                                $sampleFaces[] = $indices;
                            }
                        }
                    }
                }
            } elseif (str_starts_with($line, 'mtllib ')) {
                $mtllib = trim(substr($line, 7));
            } elseif (str_starts_with($line, 'usemtl ')) {
                $mat = trim(substr($line, 7));
                if ($mat !== '' && ! in_array($mat, $materials, true)) {
                    $materials[] = $mat;
                }
            }
        }

        $commitSubObject();

        if ($vertexCount < 3) {
            return [
                'valid' => false,
                'error' => 'File does not contain valid 3D geometric vertices (v x y z).',
            ];
        }

        $w = max(0.001, $maxX - $minX);
        $h = max(0.001, $maxY - $minY);
        $d = max(0.001, $maxZ - $minZ);

        // Determine sensible scaling factor for 3D mansion meters
        $maxDim = max($w, $h, $d);
        $scaleFactor = 1.0;
        if ($maxDim > 50.0) {
            // Millimeters
            $scaleFactor = 0.001;
        } elseif ($maxDim > 15.0) {
            // Centimeters or decimeters
            $scaleFactor = 0.01;
        }

        $suggestedW = round(max(0.3, min(10.0, $w * $scaleFactor)), 2);
        $suggestedH = round(max(0.2, min(6.0, $h * $scaleFactor)), 2);
        $suggestedD = round(max(0.3, min(10.0, $d * $scaleFactor)), 2);

        $svg = self::generateSvgPreview(
            $packedVertices,
            $sampleVerticesCount,
            $sampleFaces,
            $minX,
            $maxX,
            $minY,
            $maxY,
            $minZ,
            $maxZ
        );

        return [
            'valid' => true,
            'vertex_count' => $vertexCount,
            'face_count' => $faceCount,
            'normal_count' => $normalCount,
            'texcoord_count' => $texcoordCount,
            'mtllib' => $mtllib,
            'materials' => $materials,
            'bbox' => [
                'min_x' => round($minX, 4),
                'min_y' => round($minY, 4),
                'min_z' => round($minZ, 4),
                'max_x' => round($maxX, 4),
                'max_y' => round($maxY, 4),
                'max_z' => round($maxZ, 4),
            ],
            'dimensions' => [
                'w' => round($w, 4),
                'h' => round($h, 4),
                'd' => round($d, 4),
            ],
            'scale_factor' => $scaleFactor,
            'suggested' => [
                'w' => $suggestedW,
                'h' => $suggestedH,
                'd' => $suggestedD,
            ],
            'svg' => $svg,
            'sub_objects' => $subObjects,
        ];
    }

    /**
     * Parse an accompanying Wavefront MTL (Material Template Library) file.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     materials: list<array{name: string, kd?: string, diffuse?: array{r: float, g: float, b: float}}>,
     *     primary_color: string
     * }
     */
    public static function parseMtl(string $content): array
    {
        $materials = [];
        $current = null;
        $primaryColor = '#8b5cf6'; // default stylish purple

        $line = strtok($content, "\r\n");
        while ($line !== false) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                $line = strtok("\r\n");

                continue;
            }

            if (str_starts_with($line, 'newmtl ')) {
                if ($current !== null) {
                    $materials[] = $current;
                }
                $current = ['name' => trim(substr($line, 7))];
            } elseif (str_starts_with($line, 'Kd ') || str_starts_with($line, 'kd ')) {
                $parts = preg_split('/\s+/', $line);
                if (is_array($parts) && count($parts) >= 4) {
                    $r = min(1.0, max(0.0, (float) $parts[1]));
                    $g = min(1.0, max(0.0, (float) $parts[2]));
                    $b = min(1.0, max(0.0, (float) $parts[3]));

                    $hex = sprintf('#%02x%02x%02x', (int) round($r * 255), (int) round($g * 255), (int) round($b * 255));
                    if ($current !== null) {
                        $current['kd'] = $hex;
                        $current['diffuse'] = ['r' => $r, 'g' => $g, 'b' => $b];
                    }

                    // If not near-black or near-white, prefer as primaryColor
                    if ($primaryColor === '#8b5cf6' && ($r > 0.1 || $g > 0.1 || $b > 0.1)) {
                        $primaryColor = $hex;
                    }
                }
            }

            $line = strtok("\r\n");
        }

        if ($current !== null) {
            $materials[] = $current;
        }

        return [
            'valid' => true,
            'materials' => $materials,
            'primary_color' => $primaryColor,
        ];
    }

    /**
     * Generate an isometric 3D perspective projected SVG illustration for the thumbnail.
     *
     * @param  list<list<int>>  $faces
     */
    private static function generateSvgPreview(
        string $packedVertices,
        int $sampleVerticesCount,
        array $faces,
        float $minX,
        float $maxX,
        float $minY,
        float $maxY,
        float $minZ,
        float $maxZ
    ): string {
        $viewW = 200;
        $viewH = 200;
        $pad = 14;

        $cx = ($minX + $maxX) / 2;
        $cy = ($minY + $maxY) / 2;
        $cz = ($minZ + $maxZ) / 2;

        $cosY = cos(deg2rad(40));
        $sinY = sin(deg2rad(40));
        $cosP = cos(deg2rad(24));
        $sinP = sin(deg2rad(24));

        // Screen bounds projection using sample vertices
        $projMinX = INF;
        $projMaxX = -INF;
        $projMinY = INF;
        $projMaxY = -INF;

        $stepV = max(1, (int) floor($sampleVerticesCount / 300));
        for ($i = 0; $i < $sampleVerticesCount; $i += $stepV) {
            $vals = unpack('f3', substr($packedVertices, $i * 12, 12));
            if (! $vals) {
                continue;
            }
            $vx = $vals[1];
            $vy = $vals[2];
            $vz = $vals[3];

            $rx = ($vx - $cx) * $cosY - ($vz - $cz) * $sinY;
            $rz = ($vx - $cx) * $sinY + ($vz - $cz) * $cosY;
            $ry = $vy - $cy;
            $sx = $rx;
            $sy = -($ry * $cosP - $rz * $sinP);

            if ($sx < $projMinX) {
                $projMinX = $sx;
            }
            if ($sx > $projMaxX) {
                $projMaxX = $sx;
            }
            if ($sy < $projMinY) {
                $projMinY = $sy;
            }
            if ($sy > $projMaxY) {
                $projMaxY = $sy;
            }
        }

        // Fallback to bounding box corners if no projected points
        if ($projMinX === INF || $projMaxX === -INF || $projMinY === INF || $projMaxY === -INF) {
            $corners = [
                [$minX, $minY, $minZ], [$maxX, $minY, $minZ],
                [$maxX, $maxY, $minZ], [$minX, $maxY, $minZ],
                [$minX, $minY, $maxZ], [$maxX, $minY, $maxZ],
                [$maxX, $maxY, $maxZ], [$minX, $maxY, $maxZ],
            ];
            foreach ($corners as $c) {
                $rx = ($c[0] - $cx) * $cosY - ($c[2] - $cz) * $sinY;
                $rz = ($c[0] - $cx) * $sinY + ($c[2] - $cz) * $cosY;
                $ry = $c[1] - $cy;
                $sx = $rx;
                $sy = -($ry * $cosP - $rz * $sinP);
                if ($sx < $projMinX) {
                    $projMinX = $sx;
                }
                if ($sx > $projMaxX) {
                    $projMaxX = $sx;
                }
                if ($sy < $projMinY) {
                    $projMinY = $sy;
                }
                if ($sy > $projMaxY) {
                    $projMaxY = $sy;
                }
            }
        }

        $pw = max(0.001, $projMaxX - $projMinX);
        $ph = max(0.001, $projMaxY - $projMinY);
        $availW = $viewW - ($pad * 2);
        $availH = $viewH - ($pad * 2);
        $scale = min($availW / $pw, $availH / $ph);

        $offsetX = $pad + ($availW - ($pw * $scale)) / 2 - ($projMinX * $scale);
        $offsetY = $pad + ($availH - ($ph * $scale)) / 2 - ($projMinY * $scale);

        // Project and sort faces by depth (painter's algorithm)
        $projectedFaces = [];

        foreach ($faces as $f) {
            $pts = [];
            $avgDepth = 0;
            $valid = true;

            foreach ($f as $idx) {
                $realIdx = $idx > 0 ? $idx - 1 : $sampleVerticesCount + $idx;
                if ($realIdx < 0 || $realIdx >= $sampleVerticesCount) {
                    $valid = false;
                    break;
                }
                $vals = unpack('f3', substr($packedVertices, $realIdx * 12, 12));
                if (! $vals) {
                    $valid = false;
                    break;
                }
                $vx = $vals[1];
                $vy = $vals[2];
                $vz = $vals[3];

                $rx = ($vx - $cx) * $cosY - ($vz - $cz) * $sinY;
                $rz = ($vx - $cx) * $sinY + ($vz - $cz) * $cosY;
                $ry = $vy - $cy;
                $px = round($offsetX + ($rx * $scale), 1);
                $py = round($offsetY + (-($ry * $cosP - $rz * $sinP) * $scale), 1);
                $pts[] = "{$px},{$py}";
                $avgDepth += $rz;
            }

            if ($valid && count($pts) >= 3) {
                $avgDepth /= count($pts);
                $projectedFaces[] = [
                    'depth' => $avgDepth,
                    'pts' => implode(' ', $pts),
                ];
            }
        }

        // Sort back-to-front
        usort($projectedFaces, fn ($a, $b) => $a['depth'] <=> $b['depth']);

        $polygons = '';
        if (count($projectedFaces) > 0) {
            foreach ($projectedFaces as $pf) {
                $polygons .= "<polygon points=\"{$pf['pts']}\" fill=\"#8b5cf6\" fill-opacity=\"0.45\" stroke=\"#c084fc\" stroke-width=\"1\" stroke-linejoin=\"round\" />\n    ";
            }
        } else {
            // Isometric 3D prism fallback
            $projectCorner = function ($x, $y, $z) use ($cx, $cy, $cz, $cosY, $sinY, $cosP, $sinP, $scale, $offsetX, $offsetY) {
                $rx = ($x - $cx) * $cosY - ($z - $cz) * $sinY;
                $rz = ($x - $cx) * $sinY + ($z - $cz) * $cosY;
                $ry = $y - $cy;
                $px = round($offsetX + ($rx * $scale), 1);
                $py = round($offsetY + (-($ry * $cosP - $rz * $sinP) * $scale), 1);

                return "{$px},{$py}";
            };

            $c010 = $projectCorner($minX, $maxY, $minZ);
            $c110 = $projectCorner($maxX, $maxY, $minZ);
            $c111 = $projectCorner($maxX, $maxY, $maxZ);
            $c011 = $projectCorner($minX, $maxY, $maxZ);
            $c001 = $projectCorner($minX, $minY, $maxZ);
            $c101 = $projectCorner($maxX, $minY, $maxZ);

            $polygons .= "<polygon points=\"{$c010} {$c110} {$c111} {$c011}\" fill=\"#a855f7\" fill-opacity=\"0.6\" stroke=\"#c084fc\" stroke-width=\"1.5\" />\n    ";
            $polygons .= "<polygon points=\"{$c001} {$c101} {$c111} {$c011}\" fill=\"#8b5cf6\" fill-opacity=\"0.45\" stroke=\"#c084fc\" stroke-width=\"1.5\" />\n    ";
            $polygons .= "<polygon points=\"{$c110} {$c101} {$c111}\" fill=\"#7c3aed\" fill-opacity=\"0.35\" stroke=\"#c084fc\" stroke-width=\"1.5\" />\n    ";
        }

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {$viewW} {$viewH}" width="100%" height="100%" style="background:#090d16;border-radius:6px;">
  <defs>
    <radialGradient id="thumbglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#090d16" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#thumbglow)" />
  <g>
    {$polygons}
  </g>
</svg>
SVG;
    }
}
