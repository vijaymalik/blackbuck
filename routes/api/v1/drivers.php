<?php

use App\Modules\Drivers\Http\Controllers\V1\DriversController;
use App\Modules\Drivers\Http\Controllers\V1\DriverProfileController;
use App\Modules\Drivers\Http\Controllers\V1\DriverAuthController;
use Illuminate\Support\Facades\Route;

// Public Routes
Route::prefix('driver')->group(function () {
    Route::post('login', [DriverAuthController::class, 'login']);
    Route::post('register', [DriverAuthController::class, 'register']);
});

// Protected Driver Routes
Route::prefix('driver')
    ->middleware(['auth:sanctum', 'force.json'])
    ->group(function (): void {
        Route::get('me', [DriverAuthController::class, 'me']);
        Route::post('logout', [DriverAuthController::class, 'logout']);
        
        Route::get('profile', [DriverProfileController::class, 'show']);
        Route::put('profile', [DriverProfileController::class, 'update']);
        
        // Tracking Routes
        Route::post('location', [\App\Modules\Drivers\Http\Controllers\V1\DriverLocationController::class, 'update']);
        Route::post('toggle-status', [\App\Modules\Drivers\Http\Controllers\V1\DriverLocationController::class, 'toggleStatus']);
        
        // Nearby drivers for the app (if needed)
        Route::get('nearby', [DriversController::class, 'nearby']);
    });

// Admin-facing driver routes (already mapped in admin.php usually, but keeping legacy compatibility if any)
Route::prefix('drivers')
    ->middleware(['auth:sanctum', 'force.json'])
    ->group(function (): void {
        Route::get('/', [DriversController::class, 'index']);
        Route::get('{driver}', [DriversController::class, 'show']);
    });
