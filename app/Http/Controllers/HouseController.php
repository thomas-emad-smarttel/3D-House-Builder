<?php

namespace App\Http\Controllers;

use App\Models\House;
use App\Support\LibraryStore;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;

class HouseController extends Controller
{
    public function __construct(
        private readonly LibraryStore $library
    ) {}

    /**
     * Display the 3D House Builder & architectural viewer.
     */
    public function show(?string $slug = null): View
    {
        $query = House::query()->where('status', 'published');

        if ($slug) {
            $house = $query->where('slug', $slug)->first();
        } else {
            $house = $query->where('is_default', true)->first() ?? House::query()->first();
        }

        if (! $house) {
            $house = House::create([
                'title' => 'Modern Luxury Villa',
                'slug' => 'modern-luxury-villa',
                'description' => 'A multi-floor contemporary architectural house with open-plan living, custom rooms, ceilings, and finishes.',
                'status' => 'published',
                'is_default' => true,
                'plot_width' => 28,
                'plot_depth' => 24,
                'floors_data' => House::defaultFloors(),
            ]);
        }

        $allHouses = House::query()
            ->select(['id', 'title', 'slug', 'description', 'thumbnail', 'is_default'])
            ->where('status', 'published')
            ->orderByDesc('is_default')
            ->orderBy('title')
            ->get();

        return view('house', [
            'house' => $house,
            'allHouses' => $allHouses,
            'library' => $this->library->all(),
        ]);
    }

    /**
     * Get JSON representation of a house project.
     */
    public function apiShow(int $id): JsonResponse
    {
        $house = House::findOrFail($id);

        return response()->json([
            'house' => $house,
            'floors' => $house->getFloors(),
            'library' => $this->library->all(),
        ]);
    }

    /**
     * List all published houses.
     */
    public function apiList(): JsonResponse
    {
        $houses = House::query()
            ->select(['id', 'title', 'slug', 'description', 'thumbnail', 'is_default', 'created_at'])
            ->where('status', 'published')
            ->orderByDesc('is_default')
            ->orderBy('title')
            ->get();

        return response()->json(['houses' => $houses]);
    }
}
