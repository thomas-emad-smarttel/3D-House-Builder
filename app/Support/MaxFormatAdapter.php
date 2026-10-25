<?php

namespace App\Support;

class MaxFormatAdapter
{
    /**
     * Inspect and process an Autodesk 3ds Max (.max) file.
     *
     * @return array{
     *     valid: bool,
     *     format: string,
     *     error?: string,
     *     obj_content?: string,
     *     mtl_content?: ?string,
     *     advice?: string
     * }
     */
    public static function process(string $fileContent, ?string $filePath = null): array
    {
        $converter = env('MAX_CONVERTER_PATH');
        if ($converter && is_executable($converter) && $filePath && file_exists($filePath)) {
            $tempOut = sys_get_temp_dir().DIRECTORY_SEPARATOR.uniqid('max_conv_', true).'.obj';
            $cmd = escapeshellcmd($converter).' '.escapeshellarg($filePath).' '.escapeshellarg($tempOut);
            exec($cmd, $output, $returnCode);

            if ($returnCode === 0 && file_exists($tempOut)) {
                $objContent = file_get_contents($tempOut);
                @unlink($tempOut);
                $mtlOut = preg_replace('/\.obj$/i', '.mtl', $tempOut);
                $mtlContent = file_exists($mtlOut) ? file_get_contents($mtlOut) : null;
                if ($mtlContent) {
                    @unlink($mtlOut);
                }

                if ($objContent !== false) {
                    return [
                        'valid' => true,
                        'format' => 'max',
                        'obj_content' => $objContent,
                        'mtl_content' => $mtlContent,
                    ];
                }
            }
        }

        return [
            'valid' => false,
            'format' => 'max',
            'error' => 'Autodesk 3ds Max (.max) is a proprietary binary project format that cannot be rendered directly in WebGL without conversion. Export your model from 3ds Max as Wavefront OBJ (.obj + .mtl) via File -> Export -> Wavefront Object (*.OBJ), or configure an external MAX_CONVERTER_PATH on your server.',
            'advice' => "In 3ds Max: Select File -> Export -> Export..., choose type 'Wavefront Object (*.OBJ)', ensure 'Export materials' is checked to generate the companion .mtl file, then upload the couch.obj and couch.mtl files.",
        ];
    }
}
