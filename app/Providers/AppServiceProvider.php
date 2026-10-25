<?php

namespace App\Providers;

use App\Support\LibraryStore;
use App\Support\PortfolioStore;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(PortfolioStore::class);
        $this->app->singleton(LibraryStore::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
