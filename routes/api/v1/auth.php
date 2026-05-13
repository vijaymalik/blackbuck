<?php

use App\Modules\Auth\Http\Controllers\V1\AuthController;
use App\Modules\Drivers\Http\Controllers\V1\DriverAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')
    ->name('auth.')
    ->group(function (): void {
        Route::prefix('driver')
            ->name('driver.')
            ->group(function (): void {
                Route::post('request-otp', [DriverAuthController::class, 'requestOtp'])->middleware('force.json');
                Route::post('verify-otp', [DriverAuthController::class, 'verifyOtp'])->middleware('force.json');

                Route::middleware(['auth:sanctum', 'force.json'])->group(function (): void {
                    Route::get('me', [DriverAuthController::class, 'me']);
                    Route::post('logout', [DriverAuthController::class, 'logout']);
                });
            });

        Route::post('register', [AuthController::class, 'register'])->middleware('force.json');
        Route::post('login', [AuthController::class, 'login'])->middleware('force.json');

        Route::middleware(['auth:sanctum', 'force.json'])->group(function (): void {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

