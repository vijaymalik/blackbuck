<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;

class AdminController extends ApiController
{
    public function health(): JsonResponse
    {
        return $this->ok([
            'status' => 'ok',
            'service' => config('app.name'),
        ], 'Admin OK');
    }

    public function dashboardStats(): JsonResponse
    {
        $totalDrivers = \App\Models\User::where('is_driver', true)->count();
        $activeDrivers = \App\Models\User::where('is_driver', true)->where('is_online', true)->count();
        $totalUsers = \App\Models\User::count();
        $totalRoles = \Spatie\Permission\Models\Role::count();

        return $this->ok([
            'total_drivers' => $totalDrivers,
            'active_drivers' => $activeDrivers,
            'total_users' => $totalUsers,
            'total_roles' => $totalRoles,
            'system_health' => '99.9%'
        ], 'Dashboard stats fetched successfully');
    }
}

