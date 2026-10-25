<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Screenshots, demo videos and the CV PDF live on the "public" disk under portfolio/.
 * (Run `php artisan storage:link` once so /storage/... is served.)
 */
class MediaController extends Controller
{
    private const DIR = 'portfolio';

    private const TYPES = [
        'jpg' => 'image', 'jpeg' => 'image', 'png' => 'image', 'webp' => 'image', 'gif' => 'image',
        'mp4' => 'video', 'webm' => 'video', 'pdf' => 'pdf',
    ];

    public function index(): JsonResponse
    {
        $disk = Storage::disk('public');
        $files = collect($disk->files(self::DIR))
            ->map(fn (string $path) => $this->describe($path))
            ->filter()
            ->sortByDesc('modified')
            ->values();

        return response()->json(['files' => $files]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'max:10'],
            'files.*' => ['file', 'max:51200', 'mimes:'.implode(',', array_keys(self::TYPES))],
        ]);

        $saved = [];
        foreach ($request->file('files') as $file) {
            $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension());
            if (! isset(self::TYPES[$ext])) {
                continue;
            }
            $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'file';
            $name = Str::lower(Str::random(6)).'-'.Str::limit($base, 60, '').'.'.$ext;
            $path = $file->storeAs(self::DIR, $name, 'public');
            $saved[] = $this->describe($path);
        }

        return response()->json(['files' => array_values(array_filter($saved))], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'regex:/^[A-Za-z0-9._-]+$/', 'max:200']]);
        Storage::disk('public')->delete(self::DIR.'/'.$data['name']);

        return response()->json(['deleted' => $data['name']]);
    }

    private function describe(string $path): ?array
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (! isset(self::TYPES[$ext])) {
            return null;
        }
        $disk = Storage::disk('public');

        return [
            'name' => basename($path),
            'type' => self::TYPES[$ext],
            'url' => '/storage/'.$path,          // site-relative on purpose
            'path' => 'storage/'.$path,           // what cv_file expects
            'size' => $disk->size($path),
            'modified' => $disk->lastModified($path),
        ];
    }
}
