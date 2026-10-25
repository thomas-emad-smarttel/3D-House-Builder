<?php

namespace App\Support;

class DxfParser
{
    /**
     * Parse and extract geometry and vector preview from an ASCII DXF file.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     entities?: list<array>,
     *     bbox?: array{min_x: float, min_y: float, max_x: float, max_y: float},
     *     width?: float,
     *     depth?: float,
     *     entities_count?: int,
     *     svg?: string
     * }
     */
    public static function parse(string $content): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (! is_array($lines) || count($lines) < 4) {
            return ['valid' => false, 'error' => 'The file does not contain valid DXF data.'];
        }

        // Quick signature check
        $hasEntities = false;
        $hasSection = false;
        $maxCheck = min(count($lines), 1000);
        for ($i = 0; $i < $maxCheck; $i++) {
            $t = strtoupper(trim($lines[$i]));
            if ($t === 'SECTION') {
                $hasSection = true;
            }
            if ($t === 'ENTITIES' || $t === 'HEADER' || $t === 'BLOCKS') {
                $hasEntities = true;
            }
        }

        if (! $hasEntities && ! $hasSection) {
            return ['valid' => false, 'error' => 'File does not appear to be an ASCII DXF CAD file.'];
        }

        // Group into code => value pairs
        $pairs = [];
        $lineCount = count($lines);
        for ($i = 0; $i < $lineCount - 1; $i += 2) {
            $code = (int) trim($lines[$i]);
            $val = trim($lines[$i + 1]);
            $pairs[] = ['c' => $code, 'v' => $val];
        }

        $entities = [];
        $inEntities = false;
        $current = null;
        $vertices = [];

        $pCount = count($pairs);
        for ($i = 0; $i < $pCount; $i++) {
            $code = $pairs[$i]['c'];
            $val = $pairs[$i]['v'];

            if ($code === 2 && strtoupper($val) === 'ENTITIES') {
                $inEntities = true;

                continue;
            }

            if ($code === 0 && strtoupper($val) === 'ENDSEC' && $inEntities) {
                if ($current !== null) {
                    $entities[] = $current;
                    $current = null;
                }
                $inEntities = false;

                continue;
            }

            if (! $inEntities) {
                continue;
            }

            if ($code === 0) {
                // Starting a new entity
                if ($current !== null) {
                    if (! empty($vertices)) {
                        $current['vertices'] = $vertices;
                        $vertices = [];
                    }
                    $entities[] = $current;
                }

                $entityType = strtoupper($val);
                if (in_array($entityType, ['LINE', 'LWPOLYLINE', 'POLYLINE', 'VERTEX', 'CIRCLE', 'ARC', '3DFACE', 'SOLID'], true)) {
                    $current = ['type' => $entityType];
                } else {
                    $current = null;
                }

                continue;
            }

            if ($current === null) {
                continue;
            }

            // Entity attributes
            switch ($code) {
                case 10:
                    $current['x'] = (float) $val;
                    if ($current['type'] === 'LWPOLYLINE') {
                        $vertices[] = [(float) $val, 0.0];
                    }

                    break;
                case 20:
                    $current['y'] = (float) $val;
                    if ($current['type'] === 'LWPOLYLINE' && ! empty($vertices)) {
                        $vertices[count($vertices) - 1][1] = (float) $val;
                    }

                    break;
                case 30:
                    $current['z'] = (float) $val;

                    break;
                case 11:
                    $current['x2'] = (float) $val;

                    break;
                case 21:
                    $current['y2'] = (float) $val;

                    break;
                case 31:
                    $current['z2'] = (float) $val;

                    break;
                case 40:
                    $current['r'] = (float) $val; // Radius

                    break;
                case 50:
                    $current['start_angle'] = (float) $val; // Arc start angle

                    break;
                case 51:
                    $current['end_angle'] = (float) $val; // Arc end angle

                    break;
                case 70:
                    $current['closed'] = ((int) $val & 1) === 1;

                    break;
                case 8:
                    $current['layer'] = $val;

                    break;
            }
        }

        if ($current !== null) {
            if (! empty($vertices)) {
                $current['vertices'] = $vertices;
            }
            $entities[] = $current;
        }

        if (empty($entities)) {
            return ['valid' => false, 'error' => 'DXF file parsed successfully, but contains no supported 2D/3D entities.'];
        }

        // Calculate Bounding Box
        $minX = INF;
        $minY = INF;
        $maxX = -INF;
        $maxY = -INF;

        $updateBox = function (float $x, float $y) use (&$minX, &$minY, &$maxX, &$maxY) {
            $minX = min($minX, $x);
            $minY = min($minY, $y);
            $maxX = max($maxX, $x);
            $maxY = max($maxY, $y);
        };

        foreach ($entities as $e) {
            switch ($e['type']) {
                case 'LINE':
                    $updateBox((float) ($e['x'] ?? 0), (float) ($e['y'] ?? 0));
                    $updateBox((float) ($e['x2'] ?? 0), (float) ($e['y2'] ?? 0));

                    break;
                case 'CIRCLE':
                case 'ARC':
                    $r = (float) ($e['r'] ?? 1);
                    $cx = (float) ($e['x'] ?? 0);
                    $cy = (float) ($e['y'] ?? 0);
                    $updateBox($cx - $r, $cy - $r);
                    $updateBox($cx + $r, $cy + $r);

                    break;
                case 'LWPOLYLINE':
                    foreach ($e['vertices'] ?? [] as $v) {
                        $updateBox((float) $v[0], (float) $v[1]);
                    }

                    break;
            }
        }

        if ($minX === INF || $maxX === -INF) {
            $minX = 0;
            $minY = 0;
            $maxX = 10;
            $maxY = 10;
        }

        $w = max(0.2, round($maxX - $minX, 3));
        $d = max(0.2, round($maxY - $minY, 3));

        // Generate clean architectural vector SVG preview
        $pad = max($w, $d) * 0.05;
        $vbX = $minX - $pad;
        $vbY = $minY - $pad;
        $vbW = $w + $pad * 2;
        $vbH = $d + $pad * 2;

        $svgElements = [];
        $strokeWidth = max(0.02, round(max($vbW, $vbH) / 200, 3));

        foreach ($entities as $e) {
            switch ($e['type']) {
                case 'LINE':
                    $x1 = $e['x'] ?? 0;
                    $y1 = $e['y'] ?? 0;
                    $x2 = $e['x2'] ?? 0;
                    $y2 = $e['y2'] ?? 0;
                    $svgElements[] = sprintf(
                        '<line x1="%.3f" y1="%.3f" x2="%.3f" y2="%.3f" stroke="#38bdf8" stroke-width="%.3f" />',
                        $x1, $y1, $x2, $y2, $strokeWidth
                    );

                    break;
                case 'CIRCLE':
                    $cx = $e['x'] ?? 0;
                    $cy = $e['y'] ?? 0;
                    $r = $e['r'] ?? 1;
                    $svgElements[] = sprintf(
                        '<circle cx="%.3f" cy="%.3f" r="%.3f" fill="none" stroke="#38bdf8" stroke-width="%.3f" />',
                        $cx, $cy, $r, $strokeWidth
                    );

                    break;
                case 'LWPOLYLINE':
                    $pts = array_map(fn ($p) => sprintf('%.3f,%.3f', $p[0], $p[1]), $e['vertices'] ?? []);
                    if (! empty($pts)) {
                        $tag = ! empty($e['closed']) ? 'polygon' : 'polyline';
                        $svgElements[] = sprintf(
                            '<%s points="%s" fill="none" stroke="#38bdf8" stroke-width="%.3f" />',
                            $tag, implode(' ', $pts), $strokeWidth
                        );
                    }

                    break;
            }
        }

        $svgPreview = sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.3f %.3f %.3f %.3f" style="background:#0f172a;width:100%%;height:100%%;">'.
            '%s'.
            '</svg>',
            $vbX, $vbY, $vbW, $vbH, implode('', $svgElements)
        );

        return [
            'valid' => true,
            'entities_count' => count($entities),
            'entities' => array_slice($entities, 0, 500), // Cap to prevent huge payloads
            'bbox' => ['min_x' => $minX, 'min_y' => $minY, 'max_x' => $maxX, 'max_y' => $maxY],
            'width' => $w,
            'depth' => $d,
            'svg' => $svgPreview,
        ];
    }
}
