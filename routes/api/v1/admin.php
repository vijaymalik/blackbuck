<?php

use App\Modules\Admin\Http\Controllers\V1\AdminController;
use App\Modules\Admin\Http\Controllers\V1\AdminAuthController;
use App\Modules\Admin\Http\Controllers\V1\AdminDriverController;
use App\Modules\Admin\Http\Controllers\V1\AdminUserController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')
    ->name('admin.')
    ->group(function (): void {
        Route::post('login', [AdminAuthController::class, 'login'])->middleware('force.json');

        Route::middleware(['auth:sanctum', 'force.json'])->group(function (): void {
            Route::post('logout', [AdminAuthController::class, 'logout']);
            Route::get('profile', [AdminAuthController::class, 'profile']);
            Route::post('change-password', [AdminAuthController::class, 'changePassword']);
            Route::get('health', [AdminController::class, 'health']);
            Route::get('dashboard-stats', [AdminController::class, 'dashboardStats']);

            Route::prefix('drivers')->name('drivers.')->group(function (): void {
                Route::get('/', [AdminDriverController::class, 'index']);
                Route::get('nearby', [AdminDriverController::class, 'nearby']);
            });

            Route::prefix('users')->name('users.')->group(function (): void {
                Route::get('/', [AdminUserController::class, 'index']);
                Route::post('/', [AdminUserController::class, 'store']);
                Route::put('/{user}', [AdminUserController::class, 'update']);
                Route::delete('/{user}', [AdminUserController::class, 'destroy']);
            });

            Route::prefix('roles')->name('roles.')->group(function (): void {
                Route::get('/', [\App\Modules\Admin\Http\Controllers\V1\AdminRoleController::class, 'index']);
                Route::post('/', [\App\Modules\Admin\Http\Controllers\V1\AdminRoleController::class, 'store']);
                Route::put('/{role}', [\App\Modules\Admin\Http\Controllers\V1\AdminRoleController::class, 'update']);
                Route::delete('/{role}', [\App\Modules\Admin\Http\Controllers\V1\AdminRoleController::class, 'destroy']);
            });
        });
    });
