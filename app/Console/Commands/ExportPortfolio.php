<?php

namespace App\Console\Commands;

use App\Support\PortfolioData;
use Illuminate\Console\Command;

class ExportPortfolio extends Command
{
    protected $signature = 'portfolio:export {path=storage/app/portfolio.json : File to write, relative to the project root}';

    protected $description = 'Write the normalised portfolio data as JSON (used by the checks in tools/)';

    public function handle(PortfolioData $data): int
    {
        $path = base_path($this->argument('path'));
        @mkdir(dirname($path), 0775, true);
        file_put_contents($path, json_encode($data->all(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $this->info("Wrote {$path}");

        return self::SUCCESS;
    }
}
