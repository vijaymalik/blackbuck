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

        $totalEnquiries = \App\Models\Enquiry::count();

        $assignedEnquiries = \App\Models\Enquiry::whereHas('responses', function ($query) {
            $query->where('status', 'accepted');
        })->count();

        $dispatchedEnquiries = \App\Models\Enquiry::whereHas('responses', function ($query) {
            $query->where('status', 'dispatched');
        })->count();

        $completedEnquiries = \App\Models\Enquiry::whereHas('responses', function ($query) {
            $query->where('status', 'completed');
        })->count();

        return $this->ok([
            'total_drivers' => $totalDrivers,
            'active_drivers' => $activeDrivers,
            'total_users' => $totalUsers,
            'total_roles' => $totalRoles,
            'total_enquiries' => $totalEnquiries,
            'assigned_enquiries' => $assignedEnquiries,
            'dispatched_enquiries' => $dispatchedEnquiries,
            'completed_enquiries' => $completedEnquiries,
            'system_health' => '99.9%'
        ], 'Dashboard stats fetched successfully');
    }
}

