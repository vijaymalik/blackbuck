<?php

use App\Modules\Admin\Http\Controllers\V1\AdminController;
use App\Modules\Admin\Http\Controllers\V1\AdminAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')
    ->name('admin.')
    ->group(function (): void {
        Route::post('login', [AdminAuthController::class, 'login'])->middleware('force.json');

        Route::middleware(['auth:sanctum', 'admin.access', 'force.json'])->group(function (): void {
            Route::post('logout', [AdminAuthController::class, 'logout']);
            Route::get('profile', [AdminAuthController::class, 'profile']);
            Route::get('health', [AdminController::class, 'health']);

            Route::prefix('drivers')->name('drivers.')->group(function (): void {
                Route::get('/', [App\Modules\Admin\Http\Controllers\V1\AdminDriverController::class, 'index']);
                Route::get('nearby', [App\Modules\Admin\Http\Controllers\V1\AdminDriverController::class, 'nearby']);
            });
        });
    });

