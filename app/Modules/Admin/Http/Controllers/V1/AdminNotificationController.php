<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends ApiController
{
    public function index(): JsonResponse
    {
        $notifications = AdminNotification::latest()
            ->limit(50)
            ->get();
        return $this->ok($notifications);
    }

    public function markRead(AdminNotification $notification): JsonResponse
    {
        $notification->update(['read' => true]);
        return $this->ok(null, 'Notification marked as read.');
    }

    public function markAllRead(): JsonResponse
    {
        AdminNotification::where('read', false)->update(['read' => true]);
        return $this->ok(null, 'All notifications marked as read.');
    }

    public function clearAll(): JsonResponse
    {
        AdminNotification::truncate();
        return $this->ok(null, 'All notifications cleared successfully.');
    }
}
