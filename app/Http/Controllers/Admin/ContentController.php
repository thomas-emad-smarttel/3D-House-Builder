<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ContentSanitizer;
use App\Support\PortfolioStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    public function __construct(private readonly PortfolioStore $store)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json($this->payload($this->store->content()));
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->input('content');
        if (! is_array($input)) {
            return response()->json(['message' => 'No content was sent.', 'errors' => ['content' => 'No content was sent.']], 422);
        }

        ['content' => $content, 'errors' => $errors] = ContentSanitizer::run($input);
        if ($errors !== []) {
            return response()->json(['message' => 'Some fields need attention.', 'errors' => $errors], 422);
        }

        $this->store->save($content, $request->user()?->id, 'Before save by ' . ($request->user()?->email ?? 'unknown'));

        return response()->json($this->payload($content) + ['saved_at' => now()->toIso8601String()]);
    }

    public function reset(Request $request): JsonResponse
    {
        return response()->json($this->payload($this->store->reset($request->user()?->id)));
    }

    public function revisions(): JsonResponse
    {
        return response()->json(['revisions' => $this->store->revisions()]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $content = $this->store->restore($id, $request->user()?->id);
        abort_if($content === null, 404);

        return response()->json($this->payload($content));
    }

    private function payload(array $content): array
    {
        return [
            'content' => $content,
            'meta'    => [
                'scenes'      => ContentSanitizer::SCENES,
                'statuses'    => ContentSanitizer::STATUSES,
                'kinds'       => ContentSanitizer::KINDS,
                'max'         => ContentSanitizer::MAX,
                'customised'  => $this->store->isCustomised(),
                'game_url'    => route('game'),
                'cv_url'      => route('cv'),
            ],
        ];
    }
}
