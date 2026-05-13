<?php

use App\Modules\Location\Http\Controllers\V1\LocationController;
use Illuminate\Support\Facades\Route;

Route::prefix('location')
    ->middleware(['auth:sanctum', 'force.json'])
    ->name('location.')
    ->group(function (): void {
        Route::post('update', [LocationController::class, 'update']);
        Route::post('ping', [LocationController::class, 'store']);
    });

