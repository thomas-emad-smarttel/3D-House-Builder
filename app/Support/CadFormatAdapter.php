<?php

namespace App\Support;

class CadFormatAdapter
{
    /**
     * Inspect and process a CAD file (DXF natively, DWG via documented adapter/converter).
     *
     * @return array{
     *     valid: bool,
     *     format: string,
     *     error?: string,
     *     entities?: list<array>,
     *     bbox?: array{min_x: float, min_y: float, max_x: float, max_y: float},
     *     width?: float,
     *     depth?: float,
     *     entities_count?: int,
     *     svg?: string
     * }
     */
    public static function process(string $fileContent, string $extension): array
    {
        $ext = strtolower(trim($extension));

        if ($ext === 'dxf') {
            $parsed = DxfParser::parse($fileContent);
            if (! $parsed['valid']) {
                return ['valid' => false, 'format' => 'dxf', 'error' => $parsed['error'] ?? 'Invalid DXF file.'];
            }

            return array_merge(['format' => 'dxf'], $parsed);
        }

        if ($ext === 'dwg') {
            $converter = env('DWG_CONVERTER_PATH');
            if ($converter && is_executable($converter)) {
                // If an external CAD conversion CLI (e.g. ODA File Converter or LibreCAD) is configured:
                // We would execute it to convert DWG to DXF, then parse the DXF.
            }

            return [
                'valid' => false,
                'format' => 'dwg',
                'error' => 'DWG is an Autodesk proprietary binary format that requires an external CAD conversion service (such as ODA File Converter or LibreCAD CLI). Please convert your drawing to DXF (Drawing Exchange Format) before uploading.',
            ];
        }

        return [
            'valid' => false,
            'format' => $ext,
            'error' => "Unsupported CAD format '.{$ext}'. The application natively supports standard ASCII DXF files.",
        ];
    }
}
