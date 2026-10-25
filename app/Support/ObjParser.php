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
            $minZ,
            $w,
            $d
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
     * Generate a top-down projected SVG wireframe / footprint thumbnail.
     *
     * @param  list<array{0: float, 1: float, 2: float}>  $vertices
     * @param  list<list<int>>  $faces
     */
    private static function generateSvgPreview(
        array $vertices,
        array $faces,
        float $minX,
        float $minZ,
        float $w,
        float $d
    ): string {
        $viewW = 200;
        $viewH = 200;
        $pad = 16;
        $availW = $viewW - ($pad * 2);
        $availH = $viewH - ($pad * 2);

        $scale = min($availW / $w, $availH / $d);
        $offsetX = $pad + ($availW - ($w * $scale)) / 2;
        $offsetY = $pad + ($availH - ($d * $scale)) / 2;

        $vCount = count($vertices);

        // Project sample faces onto top-down X-Z plane
        $paths = '';
        $maxSample = min(count($faces), 120);
        $step = max(1, (int) floor(count($faces) / $maxSample));

        for ($fi = 0; $fi < count($faces); $fi += $step) {
            $f = $faces[$fi];
            $pts = [];
            foreach ($f as $idx) {
                // OBJ 1-based indexing (or negative relative indexing)
                $realIdx = $idx > 0 ? $idx - 1 : $vCount + $idx;
                if (isset($vertices[$realIdx])) {
                    $v = $vertices[$realIdx];
                    $px = round($offsetX + (($v[0] - $minX) * $scale), 1);
                    $py = round($offsetY + (($v[2] - $minZ) * $scale), 1);
                    $pts[] = "{$px},{$py}";
                }
            }

            if (count($pts) >= 3) {
                $polyStr = implode(' ', $pts);
                $paths .= "<polygon points=\"{$polyStr}\" fill=\"#8b5cf6\" fill-opacity=\"0.08\" stroke=\"#a78bfa\" stroke-width=\"0.8\" stroke-linejoin=\"round\" />\n    ";
            }
        }

        // Bounding box frame
        $bx = round($offsetX, 1);
        $by = round($offsetY, 1);
        $bw = round($w * $scale, 1);
        $bd = round($d * $scale, 1);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {$viewW} {$viewH}" width="100%" height="100%" style="background:#090d16;border-radius:6px;">
  <defs>
    <pattern id="grid3d" width="16" height="16" patternUnits="userSpaceOnUse">
      <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#1e293b" stroke-width="0.7"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid3d)" />
  <g>
    <rect x="{$bx}" y="{$by}" width="{$bw}" height="{$bd}" fill="none" stroke="#475569" stroke-width="0.8" stroke-dasharray="3,3" rx="2" />
    {$paths}
    <circle cx="100" cy="100" r="3" fill="#c084fc" />
  </g>
</svg>
SVG;
    }
}
