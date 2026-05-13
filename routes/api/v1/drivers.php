<?php

use App\Modules\Drivers\Http\Controllers\V1\DriversController;
use App\Modules\Drivers\Http\Controllers\V1\DriverProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('drivers')
    ->middleware(['auth:sanctum', 'force.json'])
    ->name('drivers.')
    ->group(function (): void {
        Route::get('nearby', [DriversController::class, 'nearby']);
        Route::get('profile', [DriverProfileController::class, 'show']);
        Route::put('profile', [DriverProfileController::class, 'update']);

        Route::get('/', [DriversController::class, 'index']);
        Route::get('{driver}', [DriversController::class, 'show']);
    });

