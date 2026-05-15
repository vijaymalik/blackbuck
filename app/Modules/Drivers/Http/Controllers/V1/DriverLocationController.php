<?php

namespace App\Modules\Drivers\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DriverLocationController extends ApiController
{
    public function update(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $user = $request->user();
        
        // Update user's current location and heartbeat
        $user->update([
            'current_latitude' => $request->latitude,
            'current_longitude' => $request->longitude,
            'last_seen_at' => now(),
            'is_online' => true,
        ]);

        // Also store in driver_locations table for history
        $user->driverLocation()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'recorded_at' => now(),
            ]
        );

        return $this->ok(null, 'Location updated successfully');
    }

    public function toggleStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'is_online' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $user = $request->user();
        $user->update(['is_online' => $request->is_online]);

        return $this->ok(['is_online' => $user->is_online], 'Status updated');
    }
}
