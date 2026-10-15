<?php

namespace App\Support;

use Illuminate\Support\Arr;

/**
 * Reads config/portfolio.php and returns a normalised structure.
 *
 * - fills in defaults so the front end never has to guess
 * - validates statuses
 * - removes server-only values (e.g. the address contact messages are mailed to)
 */
class PortfolioData
{
    public const STATUSES = ['completed', 'in_development', 'planned'];

    public function all(): array
    {
        $c = config('portfolio');

        $contact = Arr::except($c['contact'] ?? [], ['receive_email']);
        $contact['form_enabled'] = (bool) ($c['contact']['form_enabled'] ?? false);

        return [
            'owner'    => $c['owner'] ?? [],
            'profile'  => $c['profile'] ?? [],
            'skills'   => array_values($c['skills'] ?? []),
            'timeline' => array_values($c['timeline'] ?? []),
            'contact'  => $contact,
            'rooms'    => array_values(array_map([$this, 'room'], $c['rooms'] ?? [])),
            'cv'       => [
                'page_url'     => route('cv'),
                'download_url' => route('cv.download'),
                'has_pdf'      => $this->cvPdfPath() !== null,
            ],
            'endpoints' => [
                'contact' => route('contact.send'),
            ],
        ];
    }

    public function cvPdfPath(): ?string
    {
        $file = config('portfolio.cv_file');
        if (! $file) {
            return null;
        }
        $path = public_path(ltrim($file, '/'));

        return is_file($path) ? $path : null;
    }

    private function room(array $room): array
    {
        $room += [
            'kind'     => 'project',
            'scene'    => 'generic',
            'accent'   => '#d9a85f',
            'flagship' => false,
            'tagline'  => '',
            'modules'  => [],
        ];

        if (isset($room['overview'])) {
            $room['overview'] = $this->module($room['overview']);
        }
        $room['modules'] = array_values(array_map([$this, 'module'], $room['modules']));

        return $room;
    }

    private function module(array $m): array
    {
        $status = $m['status'] ?? 'planned';
        if (! in_array($status, self::STATUSES, true)) {
            $status = 'planned';
        }

        $links = $m['links'] ?? [];

        return [
            'id'           => $m['id'] ?? null,
            'name'         => $m['name'] ?? 'Untitled',
            'status'       => $status,
            'placeholder'  => (bool) ($m['placeholder'] ?? false),
            'problem'      => $m['problem'] ?? null,
            'features'     => array_values($m['features'] ?? []),
            'tech'         => array_values($m['tech'] ?? []),
            'role'         => $m['role'] ?? null,
            'architecture' => $m['architecture'] ?? null,
            'media'        => array_values($m['media'] ?? []),
            'links'        => [
                'demo'   => $links['demo'] ?? null,
                'source' => $links['source'] ?? null,
                'docs'   => $links['docs'] ?? null,
            ],
        ];
    }
}
