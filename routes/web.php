<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\PortfolioController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PortfolioController::class, 'game'])->name('game');
Route::get('/cv', [PortfolioController::class, 'cv'])->name('cv');
Route::get('/cv/download', [PortfolioController::class, 'downloadCv'])->name('cv.download');

Route::post('/contact', [ContactController::class, 'send'])
    ->middleware('throttle:5,1')
    ->name('contact.send');
