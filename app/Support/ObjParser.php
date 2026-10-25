<?php

namespace App\Support;

class ObjParser
{
    /**
     * Parse and inspect an ASCII Wavefront OBJ file.
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
    public static function parse(string $content): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (! is_array($lines) || count($lines) < 3) {
            return ['valid' => false, 'error' => 'The file does not contain enough data to be a valid 3D OBJ model.'];
        }

        $vertices = [];
        $faces = [];
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

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $parts = preg_split('/\s+/', $line);
            if (! is_array($parts) || count($parts) < 2) {
                continue;
            }

            $type = strtolower($parts[0]);

            if ($type === 'v' && count($parts) >= 4) {
                $x = (float) $parts[1];
                $y = (float) $parts[2];
                $z = (float) $parts[3];

                $vertices[] = [$x, $y, $z];

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
            } elseif ($type === 'vn') {
                $normalCount++;
            } elseif ($type === 'vt') {
                $texcoordCount++;
            } elseif ($type === 'f' && count($parts) >= 4) {
                // Polygon face (at least 3 vertices)
                $faceIndices = [];
                for ($k = 1; $k < count($parts); $k++) {
                    $sub = explode('/', $parts[$k]);
                    $idx = (int) $sub[0];
                    if ($idx !== 0) {
                        $faceIndices[] = $idx;
                    }
                }
                if (count($faceIndices) >= 3) {
                    $faces[] = $faceIndices;
                }
            } elseif ($type === 'mtllib' && isset($parts[1])) {
                $mtllib = $parts[1];
            } elseif ($type === 'usemtl' && isset($parts[1])) {
                if (! in_array($parts[1], $materials, true)) {
                    $materials[] = $parts[1];
                }
            }
        }

        $vertexCount = count($vertices);
        $faceCount = count($faces);

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
            $vertices,
            $faces,
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
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (! is_array($lines)) {
            return ['valid' => false, 'error' => 'Invalid MTL material file.', 'materials' => [], 'primary_color' => '#8b5cf6'];
        }

        $materials = [];
        $current = null;
        $primaryColor = '#8b5cf6'; // default stylish purple

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }

            $parts = preg_split('/\s+/', $line);
            if (! is_array($parts) || count($parts) < 2) {
                continue;
            }

            $type = strtolower($parts[0]);

            if ($type === 'newmtl') {
                if ($current !== null) {
                    $materials[] = $current;
                }
                $current = ['name' => $parts[1]];
            } elseif ($type === 'kd' && count($parts) >= 4) {
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
     * @param  list<array{0: float, 1: float, 2: float}>  $vertices
     * @param  list<list<int>>  $faces
     */
    private static function generateSvgPreview(
        array $vertices,
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

        $vCount = count($vertices);

        // First pass: project sample vertices to determine 2D screen bounds
        $projMinX = INF;
        $projMaxX = -INF;
        $projMinY = INF;
        $projMaxY = -INF;

        $stepV = max(1, (int) floor($vCount / 300));
        for ($i = 0; $i < $vCount; $i += $stepV) {
            $v = $vertices[$i];
            $rx = ($v[0] - $cx) * $cosY - ($v[2] - $cz) * $sinY;
            $rz = ($v[0] - $cx) * $sinY + ($v[2] - $cz) * $cosY;
            $ry = $v[1] - $cy;
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

        $pw = max(0.001, $projMaxX - $projMinX);
        $ph = max(0.001, $projMaxY - $projMinY);
        $availW = $viewW - ($pad * 2);
        $availH = $viewH - ($pad * 2);
        $scale = min($availW / $pw, $availH / $ph);

        $offsetX = $pad + ($availW - ($pw * $scale)) / 2 - ($projMinX * $scale);
        $offsetY = $pad + ($availH - ($ph * $scale)) / 2 - ($projMinY * $scale);

        // Project and sort faces by depth (painter's algorithm)
        $maxSample = min(count($faces), 180);
        $stepF = max(1, (int) floor(count($faces) / $maxSample));
        $projectedFaces = [];

        for ($fi = 0; $fi < count($faces); $fi += $stepF) {
            $f = $faces[$fi];
            $pts = [];
            $avgDepth = 0;
            $valid = true;

            foreach ($f as $idx) {
                $realIdx = $idx > 0 ? $idx - 1 : $vCount + $idx;
                if (! isset($vertices[$realIdx])) {
                    $valid = false;
                    break;
                }
                $v = $vertices[$realIdx];
                $rx = ($v[0] - $cx) * $cosY - ($v[2] - $cz) * $sinY;
                $rz = ($v[0] - $cx) * $sinY + ($v[2] - $cz) * $cosY;
                $ry = $v[1] - $cy;
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
        foreach ($projectedFaces as $pf) {
            $polygons .= "<polygon points=\"{$pf['pts']}\" fill=\"#8b5cf6\" fill-opacity=\"0.45\" stroke=\"#c084fc\" stroke-width=\"1\" stroke-linejoin=\"round\" />\n    ";
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
