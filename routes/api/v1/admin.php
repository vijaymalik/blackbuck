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

            Route::prefix('enquiries')->name('enquiries.')->group(function (): void {
                Route::get('/', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'index']);
                Route::post('/', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'store']);
                Route::get('nearby-drivers-count', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'getNearbyDriversCount']);
                Route::post('/{enquiry}/toggle-status', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'toggleStatus']);
                
                // Bid & Assignment Management
                Route::get('/{enquiry}/responses', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'getEnquiryResponses']);
                Route::post('/{enquiry}/responses/{response}/accept', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'acceptEnquiryResponse']);
                Route::post('/{enquiry}/reopen', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'reopenEnquiry']);
                Route::post('/{enquiry}/status', [\App\Modules\Admin\Http\Controllers\V1\AdminEnquiryController::class, 'updateResponseStatus']);
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

            Route::prefix('notifications')->name('notifications.')->group(function (): void {
                Route::get('/', [\App\Modules\Admin\Http\Controllers\V1\AdminNotificationController::class, 'index']);
                Route::post('/read-all', [\App\Modules\Admin\Http\Controllers\V1\AdminNotificationController::class, 'markAllRead']);
                Route::post('/{notification}/read', [\App\Modules\Admin\Http\Controllers\V1\AdminNotificationController::class, 'markRead']);
                Route::delete('/clear-all', [\App\Modules\Admin\Http\Controllers\V1\AdminNotificationController::class, 'clearAll']);
            });
        });
    });
