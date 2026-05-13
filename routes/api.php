<?php

use App\Modules\Location\Http\Controllers\V1\LocationController;
use Illuminate\Support\Facades\Route;

Route::post('location/update', [LocationController::class, 'update'])
    ->middleware(['auth:sanctum', 'force.json'])
    ->name('api.location.update');

Route::prefix('v1')
    ->name('api.v1.')
    ->group(function (): void {
        require base_path('routes/api/v1/auth.php');
        require base_path('routes/api/v1/admin.php');
        require base_path('routes/api/v1/drivers.php');
        require base_path('routes/api/v1/location.php');
    });

