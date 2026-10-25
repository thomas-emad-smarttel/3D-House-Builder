<?php

namespace App\Support;

/**
 * Turns ANY input (dashboard payload, database row, config file) into the one canonical
 * content structure the game and CV render, and reports problems by path
 * (e.g. "rooms.2.modules.1.name" => "This field is required.").
 *
 *  - whitelist only: unknown keys are dropped, types are coerced
 *  - URLs are limited to http(s) (and site-relative paths for media)
 *  - lengths and counts are capped so a typo can never make the 3D scene unplayable
 *  - pure PHP with no framework dependencies, so it is unit-testable on its own
 *
 * Saving from the dashboard is refused when `errors` is not empty. Reading is lenient:
 * the best-effort `content` is always usable.
 */
final class ContentSanitizer
{
    public const STATUSES = ['completed', 'in_development', 'planned'];

    public const SCENES = ['erp', 'shipping', 'gym', 'installments', 'profile', 'skills', 'timeline', 'contact', 'generic', 'custom'];

    public const KINDS = ['project', 'cv'];

    public const MAX = ['rooms' => 14, 'modules' => 10, 'skills' => 10, 'timeline' => 12, 'list' => 20, 'media' => 12];

    public const DEFAULT_LEAD = 'This CV is a house. Walk through it, open the doors, and see what I have built. The big door at the end of the hall is the project I am proudest of.';

    /** @var array<string,string> */
    private array $errors = [];

    private static ?array $catalog = null;

    /** @return array{content: array, errors: array<string,string>} */
    public static function run(mixed $input): array
    {
        $s = new self;
        $content = $s->content(is_array($input) ? $input : []);

        return ['content' => $content, 'errors' => $s->errors];
    }

    /* ------------------------------------------------------------ structure */

    private function content(array $in): array
    {
        return [
            'owner' => $this->owner($this->arr($in['owner'] ?? null)),
            'cv_file' => $this->cvFile($in['cv_file'] ?? null),
            'contact' => $this->contact($this->arr($in['contact'] ?? null)),
            'profile' => $this->profile($this->arr($in['profile'] ?? null)),
            'skills' => $this->skills($in['skills'] ?? []),
            'timeline' => $this->timeline($in['timeline'] ?? []),
            'rooms' => $this->rooms($in['rooms'] ?? []),
            'settings' => $this->settings($this->arr($in['settings'] ?? null)),
        ];
    }

    private function owner(array $o): array
    {
        return [
            'name' => $this->str($o['name'] ?? '', 'owner.name', 120, true),
            'title' => $this->str($o['title'] ?? '', 'owner.title', 160),
            'tagline' => $this->str($o['tagline'] ?? '', 'owner.tagline', 300),
            'location' => $this->nstr($o['location'] ?? null, 'owner.location', 120),
            'placeholder' => $this->bool($o['placeholder'] ?? false),
        ];
    }

    private function cvFile(mixed $v): ?string
    {
        $v = $this->nstr($v, 'cv_file', 255);
        if ($v === null) {
            return null;
        }
        if (! preg_match('~^[A-Za-z0-9_\-./]+\.pdf$~i', $v) || str_contains($v, '..') || str_starts_with($v, '/')) {
            $this->err('cv_file', 'Must be a path to a PDF inside the public folder, e.g. storage/portfolio/cv.pdf.');

            return null;
        }

        return $v;
    }

    private function contact(array $c): array
    {
        return [
            'email' => $this->email($c['email'] ?? null, 'contact.email'),
            'linkedin' => $this->url($c['linkedin'] ?? null, 'contact.linkedin'),
            'github' => $this->url($c['github'] ?? null, 'contact.github'),
            'form_enabled' => $this->bool($c['form_enabled'] ?? true),
            'receive_email' => $this->email($c['receive_email'] ?? null, 'contact.receive_email'),
            'placeholder' => $this->bool($c['placeholder'] ?? false),
        ];
    }

    private function profile(array $p): array
    {
        return [
            'headline' => $this->str($p['headline'] ?? 'Developer profile', 'profile.headline', 120),
            'intro' => $this->str($p['intro'] ?? '', 'profile.intro', 2000),
            'philosophy' => $this->str($p['philosophy'] ?? '', 'profile.philosophy', 2000),
            'expertise' => $this->strings($p['expertise'] ?? [], 'profile.expertise', 200),
            'goals' => $this->strings($p['goals'] ?? [], 'profile.goals', 200),
            'placeholder' => $this->bool($p['placeholder'] ?? false),
        ];
    }

    private function skills(mixed $v): array
    {
        $out = [];
        $seen = [];
        foreach ($this->items($v, 'skills', self::MAX['skills']) as $i => $s) {
            $p = "skills.$i";
            $out[] = [
                'id' => $this->id($s['id'] ?? '', "$p.id", $seen),
                'name' => $this->str($s['name'] ?? '', "$p.name", 80, true),
                'items' => $this->strings($s['items'] ?? [], "$p.items", 80),
                'placeholder' => $this->bool($s['placeholder'] ?? false),
            ];
        }

        return $out;
    }

    private function timeline(mixed $v): array
    {
        $out = [];
        $seen = [];
        foreach ($this->items($v, 'timeline', self::MAX['timeline']) as $i => $t) {
            $p = "timeline.$i";
            $out[] = [
                'id' => $this->id($t['id'] ?? '', "$p.id", $seen),
                'organization' => $this->str($t['organization'] ?? '', "$p.organization", 120, true),
                'role' => $this->str($t['role'] ?? '', "$p.role", 120),
                'dates' => $this->str($t['dates'] ?? '', "$p.dates", 60),
                'responsibilities' => $this->strings($t['responsibilities'] ?? [], "$p.responsibilities", 300),
                'achievements' => $this->strings($t['achievements'] ?? [], "$p.achievements", 300),
                'placeholder' => $this->bool($t['placeholder'] ?? false),
            ];
        }

        return $out;
    }

    private function rooms(mixed $v): array
    {
        $out = [];
        $seen = ['hub' => true];
        $flagship = false;
        $list = $this->items($v, 'rooms', self::MAX['rooms']);
        if ($list === []) {
            $this->err('rooms', 'Add at least one room.');
        }
        foreach ($list as $i => $r) {
            $p = "rooms.$i";
            $isFlagship = $this->bool($r['flagship'] ?? false);
            if ($isFlagship && $flagship) {
                $this->err("$p.flagship", 'Only one room can be the flagship.');
                $isFlagship = false;
            }
            $flagship = $flagship || $isFlagship;

            if (($r['id'] ?? '') === 'hub') {
                $this->err("$p.id", 'The id "hub" is reserved.');
            }
            $id = $this->id($r['id'] ?? '', "$p.id", $seen);

            $modules = [];
            $mseen = [];
            foreach ($this->items($r['modules'] ?? [], "$p.modules", self::MAX['modules']) as $j => $m) {
                $modules[] = $this->module($m, "$p.modules.$j", true, $mseen);
            }

            $overview = $r['overview'] ?? null;
            $noIds = [];
            $scene = $this->enum($r['scene'] ?? 'generic', "$p.scene", self::SCENES, 'generic');
            $layout = (is_array($r['layout'] ?? null) || $scene === 'custom')
                ? $this->layout($r['layout'] ?? null, "$p.layout", array_column($modules, 'id'))
                : null;
            $out[] = [
                'id' => $id,
                'scene' => $scene,
                'kind' => $this->enum($r['kind'] ?? 'project', "$p.kind", self::KINDS, 'project'),
                'name' => $this->str($r['name'] ?? '', "$p.name", 80, true),
                'tagline' => $this->str($r['tagline'] ?? '', "$p.tagline", 240),
                'accent' => $this->color($r['accent'] ?? '#d9a85f', "$p.accent"),
                'flagship' => $isFlagship,
                'overview' => is_array($overview) ? $this->module($overview, "$p.overview", false, $noIds) : null,
                'modules' => $modules,
                'layout' => $layout,
            ];
        }

        return $out;
    }

    /** @param array<string,bool> $seen ids already used in this room; $withId is false for an overview */
    private function module(mixed $m, string $p, bool $withId, array &$seen): array
    {
        $m = $this->arr($m);
        $links = $this->arr($m['links'] ?? null);
        $id = $withId ? $this->id($m['id'] ?? '', "$p.id", $seen) : null;

        return [
            'id' => $id,
            'name' => $this->str($m['name'] ?? '', "$p.name", 120, true),
            'status' => $this->enum($m['status'] ?? 'planned', "$p.status", self::STATUSES, 'planned'),
            'placeholder' => $this->bool($m['placeholder'] ?? false),
            'problem' => $this->nstr($m['problem'] ?? null, "$p.problem", 1500),
            'features' => $this->features($m['features'] ?? [], "$p.features"),
            'tech' => $this->strings($m['tech'] ?? [], "$p.tech", 60),
            'role' => $this->nstr($m['role'] ?? null, "$p.role", 1000),
            'architecture' => $this->nstr($m['architecture'] ?? null, "$p.architecture", 2000),
            'media' => $this->media($m['media'] ?? [], "$p.media"),
            'links' => [
                'demo' => $this->url($links['demo'] ?? null, "$p.links.demo"),
                'source' => $this->url($links['source'] ?? null, "$p.links.source"),
                'docs' => $this->url($links['docs'] ?? null, "$p.links.docs"),
            ],
        ];
    }

    private function features(mixed $v, string $p): array
    {
        $out = [];
        foreach ($this->items($v, $p, self::MAX['list']) as $i => $f) {
            if (is_array($f)) {
                $name = $this->str($f['name'] ?? '', "$p.$i.name", 160, true);
                $status = ($f['status'] ?? '') === '' || ($f['status'] ?? null) === null
                    ? null : $this->enum($f['status'], "$p.$i.status", self::STATUSES, 'planned');
                $out[] = $status === null ? $name : ['name' => $name, 'status' => $status];
            } else {
                $s = $this->str($f, "$p.$i", 160);
                if ($s !== '') {
                    $out[] = $s;
                }
            }
        }

        return array_values(array_filter($out, fn ($x) => $x !== ''));
    }

    private function media(mixed $v, string $p): array
    {
        $out = [];
        foreach ($this->items($v, $p, self::MAX['media']) as $i => $m) {
            $m = $this->arr($m);
            $src = $this->src($m['src'] ?? '', "$p.$i.src");
            if ($src === null) {
                continue;
            }
            $out[] = [
                'type' => $this->enum($m['type'] ?? 'image', "$p.$i.type", ['image', 'video'], 'image'),
                'src' => $src,
                'caption' => $this->nstr($m['caption'] ?? null, "$p.$i.caption", 200),
            ];
        }

        return $out;
    }

    /* ----------------------------------------------------- custom room layout */

    /** The object catalogue shared with the game and the dashboard designer. */
    public static function catalog(): array
    {
        if (self::$catalog === null) {
            if (function_exists('app') && app()->bound(LibraryStore::class)) {
                self::$catalog = app(LibraryStore::class)->catalog();
            } else {
                require_once __DIR__.'/LibraryStore.php';
                $types = [];
                foreach (LibraryStore::BUILTIN_TYPES as $k => $def) {
                    $types[$k] = $def;
                }
                self::$catalog = [
                    'version' => 2,
                    'room' => LibraryStore::ROOM,
                    'themes' => LibraryStore::THEMES,
                    'materials' => LibraryStore::MATERIALS,
                    'groups' => LibraryStore::GROUPS,
                    'limits' => LibraryStore::LIMITS,
                    'types' => $types,
                ];
            }
        }

        return self::$catalog;
    }

    /** Clear cached catalog (e.g. after adding or deleting library objects). */
    public static function flushCatalog(): void
    {
        self::$catalog = null;
    }

    /** @param list<string> $moduleIds ids of this room's modules (module displays must point at one) */
    private function layout(mixed $v, string $p, array $moduleIds): array
    {
        $cat = self::catalog();
        $v = $this->arr($v);
        $size = $this->arr($v['size'] ?? null);
        $room = $cat['room'];
        $w = $this->num($size['w'] ?? ($room['w']['default'] ?? 20), "$p.size.w", (float) ($room['w']['min'] ?? 10), (float) ($room['w']['max'] ?? 40));
        $d = $this->num($size['d'] ?? ($room['d']['default'] ?? 16), "$p.size.d", (float) ($room['d']['min'] ?? 10), (float) ($room['d']['max'] ?? 40));
        $h = $this->num($size['h'] ?? ($room['h']['default'] ?? 5), "$p.size.h", (float) ($room['h']['min'] ?? 3.5), (float) ($room['h']['max'] ?? 10));

        $t = $this->arr($v['theme'] ?? null);
        $themes = $cat['themes'];
        $theme = [
            'floor' => $this->enum($t['floor'] ?? 'wood', "$p.theme.floor", $themes['floor'] ?? ['wood'], 'wood'),
            'wall' => $this->enum($t['wall'] ?? 'plaster', "$p.theme.wall", $themes['wall'] ?? ['plaster'], 'plaster'),
            'ceiling' => $this->enum($t['ceiling'] ?? 'plaster', "$p.theme.ceiling", $themes['ceiling'] ?? ['plaster'], 'plaster'),
            'light' => $this->enum($t['light'] ?? 'warm', "$p.theme.light", $themes['light'] ?? ['warm'], 'warm'),
            'brightness' => $this->num($t['brightness'] ?? 1, "$p.theme.brightness", 0.4, 1.8),
            'bg' => $this->color($t['bg'] ?? '#0b0d11', "$p.theme.bg"),
            'fog' => $this->bool($t['fog'] ?? true),
            'lightbars' => $this->bool($t['lightbars'] ?? true),
            'accent_strip' => $this->bool($t['accent_strip'] ?? true),
            'ambient_hz' => (int) round($this->num($t['ambient_hz'] ?? 105, "$p.theme.ambient_hz", 60, 220)),
            'ambient_bright' => $this->num($t['ambient_bright'] ?? 0.5, "$p.theme.ambient_bright", 0, 1),
            'floor_sound' => $this->enum($t['floor_sound'] ?? 'wood', "$p.theme.floor_sound", $themes['floor_sound'] ?? ['wood'], 'wood'),
        ];

        $objects = [];
        $seen = [];
        $lights = 0;
        foreach ($this->items($v['objects'] ?? [], "$p.objects", (int) ($cat['limits']['objects'] ?? 120)) as $i => $o) {
            $o = $this->arr($o);
            $op = "$p.objects.$i";
            $type = is_string($o['type'] ?? null) ? $o['type'] : '';
            $libraryId = is_string($o['library_id'] ?? null) ? $o['library_id'] : $type;
            if (! isset($cat['types'][$type]) && isset($cat['types'][$libraryId])) {
                $type = $libraryId;
            }
            if (! isset($cat['types'][$type])) {
                $this->err("$op.type", 'Unknown object type.');

                continue;
            }
            $def = $cat['types'][$type];

            $id = $o['id'] ?? '';
            $id = is_string($id) ? strtolower(trim($id)) : '';
            if (! preg_match('/^[a-z0-9][a-z0-9_-]{0,39}$/', $id)) {
                $this->err("$op.id", 'Use lowercase letters, numbers, - or _ (max 40).');
            } elseif (isset($seen[$id])) {
                $this->err("$op.id", 'Must be unique.');
            }
            $seen[$id] = true;

            $rot = (int) ($o['rot'] ?? 0);
            if (! in_array($rot, [0, 90, 180, 270], true)) {
                $this->err("$op.rot", 'Rotation must be 0, 90, 180 or 270.');
                $rot = 0;
            }
            $x = $this->num($o['x'] ?? 0, "$op.x", -$w / 2 + 0.15, $w / 2 - 0.15);
            $z = $this->num($o['z'] ?? 0, "$op.z", -$d / 2 + 0.15, $d / 2 - 0.15);

            $in = $this->arr($o['p'] ?? null);
            $params = [];
            foreach ($def['params'] as $key => $pd) {
                $params[$key] = $this->param($pd, $in[$key] ?? null, "$op.p.$key", $moduleIds, $cat);
            }

            if ($type === 'light' && ++$lights > (int) ($cat['limits']['lights'] ?? 6)) {
                $this->err($op, 'At most '.($cat['limits']['lights'] ?? 6).' lights per room.');
            }
            if ($this->collides($def, $params)) {
                [$fw, $fd] = $this->footprint($def, $params, $rot);
                if ($x - $fw / 2 < 1.7 && $x + $fw / 2 > -1.7 && $z - $fd / 2 < $d / 2 && $z + $fd / 2 > $d / 2 - 3.6) {
                    $this->err($op, 'Keep the entrance clear: move this away from the door.');
                }
            }

            $objData = ['id' => $id, 'type' => $type, 'x' => $x, 'z' => $z, 'rot' => $rot, 'p' => $params];
            if (isset($o['library_id']) && is_string($o['library_id'])) {
                $objData['library_id'] = $o['library_id'];
            }
            $objects[] = $objData;
        }

        return ['size' => ['w' => $w, 'd' => $d, 'h' => $h], 'theme' => $theme, 'objects' => $objects];
    }

    private function param(array $def, mixed $v, string $path, array $moduleIds, array $cat): mixed
    {
        $default = $def['default'] ?? null;
        switch ($def['kind']) {
            case 'number':
                return $this->num($v ?? $default, $path, (float) $def['min'], (float) $def['max']);
            case 'int':
                return (int) round($this->num($v ?? $default, $path, (float) $def['min'], (float) $def['max']));
            case 'bool':
                return $this->bool($v ?? $default ?? false);
            case 'color':
                return $this->color($v ?? $default ?? '#ffffff', $path);
            case 'string':
            case 'text':
                return $this->str($v ?? $default ?? '', $path, (int) ($def['max'] ?? 200));
            case 'enum':
                $opts = is_array($def['options'] ?? null) ? $def['options'] : ($cat['materials'] ?? []);

                return $this->enum($v ?? $default, $path, $opts, (string) $default);
            case 'url':
                return $this->url($v, $path) ?? '';
            case 'src':
                return $this->src($v, $path) ?? '';
            case 'module':
                $id = is_string($v) ? $v : '';
                if ($id === '') {
                    $this->err($path, 'Choose which module this display shows.');
                } elseif (! in_array($id, $moduleIds, true)) {
                    $this->err($path, 'This room has no module with that id.');
                }

                return $id;
        }

        return null;
    }

    /** @return array{0: float, 1: float} floor footprint after rotation */
    private function footprint(array $def, array $p, int $rot): array
    {
        $f = $def['footprint'];
        $val = fn ($x) => is_numeric($x) ? (float) $x : (float) ($p[$x] ?? 0);
        $w = $val($f['w']);
        $d = $val($f['d']);
        if (isset($f['mult'])) {
            $m = $val($f['mult']);
            $w *= $m;
            $d *= $m;
        }

        return ($rot === 90 || $rot === 270) ? [$d, $w] : [$w, $d];
    }

    private function collides(array $def, array $p): bool
    {
        $c = $def['collide'] ?? false;
        if ($c === 'param') {
            return ! empty($p['collide']) && ! ((float) ($p['y'] ?? 0) >= 2.2);
        }

        return (bool) $c;
    }

    private function settings(array $s): array
    {
        return [
            'welcome_lead' => $this->str($s['welcome_lead'] ?? self::DEFAULT_LEAD, 'settings.welcome_lead', 400) ?: self::DEFAULT_LEAD,
            'exposure' => $this->num($s['exposure'] ?? 1.15, 'settings.exposure', 0.5, 2.5),
            'shadows' => $this->bool($s['shadows'] ?? true),
            'max_pixel_ratio' => $this->num($s['max_pixel_ratio'] ?? 1.75, 'settings.max_pixel_ratio', 1.0, 3.0),
        ];
    }

    /* -------------------------------------------------------------- scalars */

    private function err(string $path, string $msg): void
    {
        $this->errors[$path] ??= $msg;
    }

    private function arr(mixed $v): array
    {
        return is_array($v) ? $v : [];
    }

    /** @return list<mixed> */
    private function items(mixed $v, string $path, int $max): array
    {
        if ($v === null || $v === '') {
            return [];
        }
        if (! is_array($v)) {
            $this->err($path, 'Must be a list.');

            return [];
        }
        $v = array_values($v);
        if (count($v) > $max) {
            $this->err($path, "At most $max entries are supported.");
            $v = array_slice($v, 0, $max);
        }

        return $v;
    }

    private function str(mixed $v, string $path, int $max, bool $required = false): string
    {
        if ($v === null) {
            $v = '';
        }
        if (! is_scalar($v)) {
            $this->err($path, 'Must be text.');
            $v = '';
        }
        $v = trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $v));
        if (mb_strlen($v) > $max) {
            $this->err($path, "Must be at most $max characters.");
            $v = mb_substr($v, 0, $max);
        }
        if ($required && $v === '') {
            $this->err($path, 'This field is required.');
        }

        return $v;
    }

    private function nstr(mixed $v, string $path, int $max): ?string
    {
        $s = $this->str($v, $path, $max);

        return $s === '' ? null : $s;
    }

    /** @return list<string> */
    private function strings(mixed $v, string $path, int $maxLen): array
    {
        $out = [];
        foreach ($this->items($v, $path, self::MAX['list']) as $i => $s) {
            $s = $this->str($s, "$path.$i", $maxLen);
            if ($s !== '') {
                $out[] = $s;
            }
        }

        return $out;
    }

    private function bool(mixed $v): bool
    {
        return filter_var($v, FILTER_VALIDATE_BOOLEAN);
    }

    private function num(mixed $v, string $path, float $min, float $max): float
    {
        if (! is_numeric($v)) {
            $this->err($path, 'Must be a number.');

            return $min;
        }
        $n = (float) $v;
        if ($n < $min || $n > $max) {
            $this->err($path, "Must be between $min and $max.");
        }

        return round(min($max, max($min, $n)), 2);
    }

    private function enum(mixed $v, string $path, array $allowed, string $default): string
    {
        if (in_array($v, $allowed, true)) {
            return $v;
        }
        $this->err($path, 'Choose one of: '.implode(', ', $allowed).'.');

        return $default;
    }

    private function color(mixed $v, string $path): string
    {
        if (is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/', $v)) {
            return strtolower($v);
        }
        $this->err($path, 'Must be a colour like #d9a85f.');

        return '#d9a85f';
    }

    /** @param array<string,bool> $seen */
    private function id(mixed $v, string $path, array &$seen): string
    {
        $v = is_string($v) ? strtolower(trim($v)) : '';
        if (! preg_match('/^[a-z0-9][a-z0-9_-]{0,59}$/', $v)) {
            $this->err($path, 'Use lowercase letters, numbers, - or _ (max 60).');
        } elseif (isset($seen[$v])) {
            $this->err($path, 'Must be unique.');
        }
        $seen[$v] = true;

        return $v;
    }

    private function url(mixed $v, string $path): ?string
    {
        $v = $this->nstr($v, $path, 500);
        if ($v === null) {
            return null;
        }
        if (! preg_match('~^https?://[^\s<>"\']+$~i', $v) || filter_var($v, FILTER_VALIDATE_URL) === false) {
            $this->err($path, 'Must be a full web address starting with http:// or https://.');

            return null;
        }

        return $v;
    }

    /** Media source: a site-relative path ("/storage/portfolio/a.png") or an http(s) URL. */
    private function src(mixed $v, string $path): ?string
    {
        $v = $this->nstr($v, $path, 500);
        if ($v === null) {
            return null;
        }
        if (preg_match('~^/(?!/)[A-Za-z0-9_\-./%]+$~', $v) && ! str_contains($v, '..')) {
            return $v;
        }

        return $this->url($v, $path);
    }

    private function email(mixed $v, string $path): ?string
    {
        $v = $this->nstr($v, $path, 150);
        if ($v === null) {
            return null;
        }
        if (filter_var($v, FILTER_VALIDATE_EMAIL) === false) {
            $this->err($path, 'Must be a valid email address.');

            return null;
        }

        return $v;
    }
}
