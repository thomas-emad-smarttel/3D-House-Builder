<?php

namespace App\Http\Controllers;

use App\Support\PortfolioData;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PortfolioController extends Controller
{
    public function __construct(private readonly PortfolioData $portfolio) {}

    /** The 3D game. */
    public function game(): View
    {
        return view('game', ['portfolio' => $this->portfolio->all()]);
    }

    /** Traditional, server-rendered CV. Works without JavaScript or WebGL. */
    public function cv(Request $request): View
    {
        return view('cv', [
            'p' => $this->portfolio->all(),
            'print' => $request->boolean('print'),
        ]);
    }

    /** Serves the configured PDF, or falls back to the printable CV page. */
    public function downloadCv(): BinaryFileResponse|RedirectResponse
    {
        $path = $this->portfolio->cvPdfPath();

        if ($path === null) {
            return redirect()->route('cv', ['print' => 1]);
        }

        return response()->download($path, 'cv.pdf');
    }
}
