<?php

use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\PortfolioController;
use Illuminate\Support\Facades\Route;

/* ---------------------------------------------------------------- public */
Route::get('/', [PortfolioController::class, 'game'])->name('game');
Route::get('/cv', [PortfolioController::class, 'cv'])->name('cv');
Route::get('/cv/download', [PortfolioController::class, 'downloadCv'])->name('cv.download');

Route::post('/contact', [ContactController::class, 'send'])
    ->middleware('throttle:5,1')
    ->name('contact.send');

/* ------------------------------------------------------------- dashboard */
// The route must be called "login": Laravel redirects unauthenticated users there.
Route::get('/admin/login', [AdminAuthController::class, 'show'])->middleware('guest')->name('login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware(['guest', 'throttle:6,1'])->name('admin.login');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->middleware('auth')->name('admin.logout');

Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/content', [ContentController::class, 'show'])->name('content.show');
    Route::put('/content', [ContentController::class, 'update'])->name('content.update');
    Route::post('/content/reset', [ContentController::class, 'reset'])->name('content.reset');
    Route::get('/revisions', [ContentController::class, 'revisions'])->name('revisions');
    Route::post('/revisions/{id}/restore', [ContentController::class, 'restore'])->whereNumber('id')->name('revisions.restore');

    Route::get('/media', [MediaController::class, 'index'])->name('media.index');
    Route::post('/media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('/media', [MediaController::class, 'destroy'])->name('media.destroy');
});
