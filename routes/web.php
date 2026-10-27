<?php

use App\Http\Controllers\Admin\ContentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\HouseProjectController;
use App\Http\Controllers\Admin\LibraryController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\HouseController;
use Illuminate\Support\Facades\Route;

/* ---------------------------------------------------------------- public */
Route::get('/', [HouseController::class, 'show'])->name('game');
Route::get('/house/{slug}', [HouseController::class, 'show'])->name('house.show');

Route::get('/api/houses', [HouseController::class, 'apiList'])->name('api.houses.index');
Route::get('/api/houses/{id}', [HouseController::class, 'apiShow'])->name('api.houses.show');

/* ------------------------------------------------------------- dashboard */
// The route must be called "login": Laravel redirects unauthenticated users there.
Route::get('/admin/login', [AdminAuthController::class, 'show'])->middleware('guest')->name('login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware(['guest', 'throttle:6,1'])->name('admin.login');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->middleware('auth')->name('admin.logout');

Route::middleware('auth')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Legacy content endpoints (backwards-compatibility)
    Route::get('/content', [ContentController::class, 'show'])->name('content.show');
    Route::put('/content', [ContentController::class, 'update'])->name('content.update');
    Route::post('/content/reset', [ContentController::class, 'reset'])->name('content.reset');
    Route::get('/revisions', [ContentController::class, 'revisions'])->name('revisions');
    Route::post('/revisions/{id}/restore', [ContentController::class, 'restore'])->whereNumber('id')->name('revisions.restore');

    // House Projects API
    Route::get('/houses', [HouseProjectController::class, 'index'])->name('houses.index');
    Route::post('/houses', [HouseProjectController::class, 'store'])->name('houses.store');
    Route::post('/houses/import-cad', [HouseProjectController::class, 'importCad'])->name('houses.import_cad');
    Route::get('/houses/{id}', [HouseProjectController::class, 'show'])->whereNumber('id')->name('houses.show');
    Route::put('/houses/{id}', [HouseProjectController::class, 'update'])->whereNumber('id')->name('houses.update');
    Route::delete('/houses/{id}', [HouseProjectController::class, 'destroy'])->whereNumber('id')->name('houses.destroy');
    Route::post('/houses/{id}/clone', [HouseProjectController::class, 'clone'])->whereNumber('id')->name('houses.clone');
    Route::post('/houses/{id}/default', [HouseProjectController::class, 'setDefault'])->whereNumber('id')->name('houses.default');

    // Media Library
    Route::get('/media', [MediaController::class, 'index'])->name('media.index');
    Route::post('/media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('/media', [MediaController::class, 'destroy'])->name('media.destroy');

    // 3D Model / Object Library (OBJ, CAD, DXF, SVG)
    Route::get('/library', [LibraryController::class, 'index'])->name('library.index');
    Route::get('/library/{id}', [LibraryController::class, 'show'])->name('library.show');
    Route::post('/library/import', [LibraryController::class, 'store'])->name('library.store');
    Route::delete('/library/{id}', [LibraryController::class, 'destroy'])->name('library.destroy');
});
