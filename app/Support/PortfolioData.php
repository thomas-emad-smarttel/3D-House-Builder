<?php

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * What the public pages receive: the stored content, minus anything private,
 * plus the URLs the front end needs. Content shape/validation lives in ContentSanitizer.
 */
class PortfolioData
{
    public function __construct(
        private readonly PortfolioStore $store,
        private readonly LibraryStore $library
    ) {}

    public function all(): array
    {
        $c = $this->store->content();

        return [
            'owner' => $c['owner'],
            'profile' => $c['profile'],
            'skills' => $c['skills'],
            'timeline' => $c['timeline'],
            // the address messages are mailed to never leaves the server
            'contact' => Arr::except($c['contact'], ['receive_email']),
            'rooms' => $c['rooms'],
            'settings' => $c['settings'],
            'library' => $this->library->all(),
            'cv' => [
                'page_url' => route('cv'),
                'download_url' => route('cv.download'),
                'has_pdf' => $this->cvPdfPath() !== null,
            ],
            'endpoints' => [
                'contact' => route('contact.send'),
            ],
        ];
    }

    public function cvPdfPath(): ?string
    {
        $file = $this->store->content()['cv_file'] ?? null;
        if (! $file) {
            return null;
        }
        $path = public_path(ltrim($file, '/'));

        return is_file($path) ? $path : null;
    }
}
