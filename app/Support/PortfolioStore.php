<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Where the portfolio content lives.
 *
 *  - the dashboard saves to the `portfolio_contents` table (one JSON document)
 *  - until something is saved, config/portfolio.php provides the defaults
 *  - every save keeps the previous version in `portfolio_revisions` (restorable)
 *  - everything read here has been through ContentSanitizer, so the game can trust it
 *
 * If the tables do not exist yet (migrations not run) the site still works from the config file.
 */
class PortfolioStore
{
    public const KEY = 'content';

    public const MAX_REVISIONS = 40;

    private const CACHE = 'portfolio.content.v1';

    private ?array $memo = null;

    public function content(): array
    {
        if ($this->memo !== null) {
            return $this->memo;
        }
        try {
            $content = Cache::remember(self::CACHE, 600, fn () => $this->load());
        } catch (\Throwable) {
            $content = $this->load();
        }

        return $this->memo = $content;
    }

    /** The defaults from config/portfolio.php, sanitised. */
    public function defaults(): array
    {
        return ContentSanitizer::run(config('portfolio'))['content'];
    }

    public function isCustomised(): bool
    {
        try {
            return DB::table('portfolio_contents')->where('key', self::KEY)->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    /** @param array $content already sanitised and error-free */
    public function save(array $content, ?int $userId = null, ?string $note = null): void
    {
        $json = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($json, $userId, $note) {
            $row = DB::table('portfolio_contents')->where('key', self::KEY)->first();

            if ($row) {
                DB::table('portfolio_revisions')->insert([
                    'data' => $row->data, 'note' => $note, 'created_by' => $userId, 'created_at' => now(),
                ]);
                DB::table('portfolio_contents')->where('key', self::KEY)->update([
                    'data' => $json, 'updated_by' => $userId, 'updated_at' => now(),
                ]);
            } else {
                DB::table('portfolio_contents')->insert([
                    'key' => self::KEY, 'data' => $json, 'updated_by' => $userId,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            $keep = DB::table('portfolio_revisions')->orderByDesc('id')->limit(self::MAX_REVISIONS)->pluck('id');
            if ($keep->count() === self::MAX_REVISIONS) {
                DB::table('portfolio_revisions')->where('id', '<', $keep->min())->delete();
            }
        });

        $this->flush();
    }

    /** Replace everything with the defaults from the config file (the old version stays in history). */
    public function reset(?int $userId = null): array
    {
        $content = $this->defaults();
        $this->save($content, $userId, 'Before reset to defaults');

        return $content;
    }

    /** @return list<array{id:int,note:?string,created_at:string}> newest first */
    public function revisions(): array
    {
        try {
            return DB::table('portfolio_revisions')->orderByDesc('id')->limit(self::MAX_REVISIONS)
                ->get(['id', 'note', 'created_at'])
                ->map(fn ($r) => ['id' => (int) $r->id, 'note' => $r->note, 'created_at' => (string) $r->created_at])
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    public function restore(int $id, ?int $userId = null): ?array
    {
        $row = DB::table('portfolio_revisions')->where('id', $id)->first();
        $raw = $row ? json_decode($row->data, true) : null;
        if (! is_array($raw)) {
            return null;
        }
        $content = ContentSanitizer::run($raw)['content'];
        $this->save($content, $userId, "Before restoring version #{$id}");

        return $content;
    }

    public function flush(): void
    {
        $this->memo = null;
        try {
            Cache::forget(self::CACHE);
        } catch (\Throwable) {
            // cache store unavailable: nothing to flush
        }
    }

    private function load(): array
    {
        $raw = null;
        try {
            $row = DB::table('portfolio_contents')->where('key', self::KEY)->first();
            $raw = $row ? json_decode($row->data, true) : null;
        } catch (\Throwable) {
            // tables missing: fall back to the config file
        }

        return ContentSanitizer::run(is_array($raw) ? $raw : config('portfolio'))['content'];
    }
}
