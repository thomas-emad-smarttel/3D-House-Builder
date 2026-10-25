<?php

namespace App\Support;

class RarExtractor
{
    /**
     * Locate UnRAR binary on the system.
     */
    public static function binaryPath(): ?string
    {
        $custom = env('UNRAR_PATH');
        if ($custom && is_executable($custom)) {
            return $custom;
        }

        $candidates = [
            'C:\\Program Files\\WinRAR\\UnRAR.exe',
            'C:\\Program Files (x86)\\WinRAR\\UnRAR.exe',
            'C:\\Program Files\\WinRAR\\Rar.exe',
            '/usr/bin/unrar',
            '/usr/local/bin/unrar',
        ];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    public static function isSupported(): bool
    {
        return self::binaryPath() !== null;
    }

    /**
     * Extract a RAR archive to a temporary directory and inspect contained 3D assets.
     *
     * @return array{
     *     success: bool,
     *     error?: string,
     *     temp_dir?: string,
     *     obj_content?: string,
     *     obj_name?: string,
     *     mtl_content?: ?string,
     *     has_max?: bool,
     *     files: list<string>
     * }
     */
    public static function extract(string $archivePath): array
    {
        $unrar = self::binaryPath();
        if (! $unrar) {
            return [
                'success' => false,
                'error' => 'UnRAR utility is not available on this server to unpack .rar archives. Please upload your model as .zip or .obj.',
                'files' => [],
            ];
        }

        $tempDir = sys_get_temp_dir().DIRECTORY_SEPARATOR.'rar_'.uniqid('', true);
        if (! @mkdir($tempDir, 0777, true)) {
            return [
                'success' => false,
                'error' => 'Could not create temporary folder for RAR extraction.',
                'files' => [],
            ];
        }

        // Unpack without paths into tempDir
        $cmd = escapeshellarg($unrar).' e -y -o+ '.escapeshellarg($archivePath).' '.escapeshellarg($tempDir.DIRECTORY_SEPARATOR);
        exec($cmd, $output, $code);

        if ($code !== 0) {
            self::cleanTempDir($tempDir);

            return [
                'success' => false,
                'error' => 'Failed to unpack RAR archive. The archive may be corrupted or password-protected.',
                'files' => [],
            ];
        }

        $files = glob($tempDir.DIRECTORY_SEPARATOR.'*') ?: [];
        $objContent = null;
        $objName = null;
        $mtlContent = null;
        $hasMax = false;
        $foundNames = [];

        foreach ($files as $file) {
            if (! is_file($file)) {
                continue;
            }
            $base = basename($file);
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $foundNames[] = $base;

            if ($ext === 'obj' && $objContent === null) {
                $objContent = file_get_contents($file) ?: null;
                $objName = pathinfo($file, PATHINFO_FILENAME);
            } elseif ($ext === 'mtl' && $mtlContent === null) {
                $mtlContent = file_get_contents($file) ?: null;
            } elseif ($ext === 'max') {
                $hasMax = true;
            }
        }

        self::cleanTempDir($tempDir);

        return [
            'success' => true,
            'obj_content' => $objContent,
            'obj_name' => $objName,
            'mtl_content' => $mtlContent,
            'has_max' => $hasMax,
            'files' => $foundNames,
        ];
    }

    private static function cleanTempDir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $files = glob($dir.DIRECTORY_SEPARATOR.'*') ?: [];
        foreach ($files as $f) {
            if (is_file($f)) {
                @unlink($f);
            }
        }
        @rmdir($dir);
    }
}
