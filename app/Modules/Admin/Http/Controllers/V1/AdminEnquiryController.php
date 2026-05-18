<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AdminEnquiryController extends ApiController
{
    public function index(): JsonResponse
    {
        $enquiries = Enquiry::withCount('responses')
            ->with(['responses' => function ($query) {
                $query->whereIn('status', ['accepted', 'dispatched', 'completed'])->with('driver');
            }])
            ->latest()
            ->get();
        return $this->ok($enquiries);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pickup_location' => 'required|string|max:255',
            'pickup_instruction' => 'nullable|string|max:255',
            'dropoff_location' => 'required|string|max:255',
            'pickup_latitude' => 'required|numeric|between:-90,90',
            'pickup_longitude' => 'required|numeric|between:-180,180',
            'dropoff_latitude' => 'nullable|numeric|between:-90,90',
            'dropoff_longitude' => 'nullable|numeric|between:-180,180',
            'radius_km' => 'required|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $enquiry = Enquiry::create([
            'pickup_location' => $request->pickup_location,
            'pickup_instruction' => $request->pickup_instruction,
            'dropoff_location' => $request->dropoff_location,
            'pickup_latitude' => $request->pickup_latitude,
            'pickup_longitude' => $request->pickup_longitude,
            'dropoff_latitude' => $request->dropoff_latitude,
            'dropoff_longitude' => $request->dropoff_longitude,
            'radius_km' => $request->radius_km,
        ]);

        \App\Models\AdminNotification::create([
            'message' => "New Enquiry Created (#ENQ-{$enquiry->id}): From: " . explode(',', $enquiry->pickup_location)[0] . " ➔ To: " . explode(',', $enquiry->dropoff_location)[0],
            'type' => 'new_enquiry',
            'read' => false
        ]);

        // Get count of drivers notified and trigger push notifications
        $radiusMeters = $request->radius_km * 1000;
        $drivers = DB::select("
            WITH ref AS (
                SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS point
            )
            SELECT u.fcm_token
            FROM driver_locations dl
            INNER JOIN users u ON u.id = dl.user_id
            CROSS JOIN ref
            WHERE dl.coordinates IS NOT NULL
              AND ST_DWithin(dl.coordinates, ref.point, ?)
              AND u.is_online = true
        ", [$request->pickup_longitude, $request->pickup_latitude, $radiusMeters]);

        $notifiedCount = count($drivers);

        // Send push notification to all matched drivers who have a token registered
        $tokens = array_filter(array_column($drivers, 'fcm_token'));
        if (!empty($tokens)) {
            $routeStr = explode(',', $enquiry->pickup_location)[0] . " ➔ " . explode(',', $enquiry->dropoff_location)[0];
            app(\App\Services\PushNotificationService::class)->send(
                $tokens,
                "📦 New Load Enquiry Available!",
                "New route: {$routeStr}. Tap to place your bid!",
                [
                    'type' => 'new_enquiry',
                    'enquiry_id' => (string)$enquiry->id,
                    'pickup_location' => $enquiry->pickup_location,
                    'dropoff_location' => $enquiry->dropoff_location,
                    'pickup_instruction' => $enquiry->pickup_instruction,
                ]
            );
        }

        return $this->ok([
            'enquiry' => $enquiry,
            'notified_count' => $notifiedCount
        ], "Enquiry created and broadcasted to {$notifiedCount} nearby drivers!");
    }

    public function getNearbyDriversCount(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pickup_latitude' => 'required|numeric|between:-90,90',
            'pickup_longitude' => 'required|numeric|between:-180,180',
            'radius_km' => 'required|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $radiusMeters = $request->radius_km * 1000;
        $notifiedCountQuery = DB::selectOne("
            WITH ref AS (
                SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS point
            )
            SELECT COUNT(*) AS count
            FROM driver_locations dl
            INNER JOIN users u ON u.id = dl.user_id
            CROSS JOIN ref
            WHERE dl.coordinates IS NOT NULL
              AND ST_DWithin(dl.coordinates, ref.point, ?)
              AND u.is_online = true
        ", [$request->pickup_longitude, $request->pickup_latitude, $radiusMeters]);

        return $this->ok([
            'count' => $notifiedCountQuery->count ?? 0
        ]);
    }

    public function toggleStatus(Enquiry $enquiry): JsonResponse
    {
        $enquiry->update([
            'is_active' => !$enquiry->is_active
        ]);

        return $this->ok($enquiry, 'Enquiry status updated successfully.');
    }

    public function getEnquiryResponses(Enquiry $enquiry): JsonResponse
    {
        $responses = DB::select("
            SELECT
                er.id AS response_id,
                er.status,
                er.created_at,
                u.id AS driver_id,
                u.name AS driver_name,
                u.phone AS driver_phone,
                COALESCE(
                    ST_Distance(
                        dl.coordinates,
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                    ) / 1000.0,
                    0.0
                ) AS distance_km
            FROM enquiry_responses er
            INNER JOIN users u ON u.id = er.driver_id
            LEFT JOIN driver_locations dl ON dl.user_id = u.id
            WHERE er.enquiry_id = ?
            ORDER BY distance_km ASC
        ", [$enquiry->pickup_longitude, $enquiry->pickup_latitude, $enquiry->id]);

        return $this->ok($responses);
    }

    public function acceptEnquiryResponse(Enquiry $enquiry, \App\Models\EnquiryResponse $response): JsonResponse
    {
        // 1. Mark this response as accepted
        $response->update(['status' => 'accepted']);

        // 2. Mark other responses for this enquiry as rejected
        \App\Models\EnquiryResponse::where('enquiry_id', $enquiry->id)
            ->where('id', '!=', $response->id)
            ->update(['status' => 'rejected']);

        // 3. Mark the enquiry as inactive (Load is closed / assigned)
        $enquiry->update(['is_active' => false]);

        $driver = \App\Models\User::find($response->driver_id);
        $driverName = $driver ? $driver->name : 'Driver';

        \App\Models\AdminNotification::create([
            'message' => "✓ Load #ENQ-{$enquiry->id} successfully ASSIGNED to driver {$driverName}!",
            'type' => 'success',
            'read' => false
        ]);

        // Notify driver of assignment
        if ($driver && !empty($driver->fcm_token)) {
            $routeStr = explode(',', $enquiry->pickup_location)[0] . " ➔ " . explode(',', $enquiry->dropoff_location)[0];
            app(\App\Services\PushNotificationService::class)->send(
                $driver->fcm_token,
                "🎉 Load Assigned Successfully!",
                "Congratulations! You have been assigned to Load #ENQ-{$enquiry->id} ({$routeStr}).",
                [
                    'type' => 'load_assigned',
                    'enquiry_id' => (string)$enquiry->id,
                    'pickup_location' => $enquiry->pickup_location,
                    'dropoff_location' => $enquiry->dropoff_location,
                    'pickup_instruction' => $enquiry->pickup_instruction,
                ]
            );
        }

        return $this->ok(null, 'Driver assigned successfully and load booking confirmed.');
    }

    public function reopenEnquiry(Enquiry $enquiry): JsonResponse
    {
        // Block reopening if the load is in transit or completed
        $hasActiveTransit = \App\Models\EnquiryResponse::where('enquiry_id', $enquiry->id)
            ->whereIn('status', ['dispatched', 'completed'])
            ->exists();

        if ($hasActiveTransit) {
            return $this->fail('Cannot reopen an enquiry that is currently in transit or completed.', 400);
        }

        // 1. Delete all responses for this enquiry to allow all drivers to bid fresh!
        \App\Models\EnquiryResponse::where('enquiry_id', $enquiry->id)
            ->delete();

        // 2. Set the enquiry back to active/open status
        $enquiry->update(['is_active' => true]);

        \App\Models\AdminNotification::create([
            'message' => "🔄 Load #ENQ-{$enquiry->id} has been RE-OPENED for fresh bids by Admin.",
            'type' => 'warning',
            'read' => false
        ]);

        return $this->ok(null, 'Enquiry re-opened successfully. Bidding is active again.');
    }

    public function updateResponseStatus(Request $request, Enquiry $enquiry): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:accepted,dispatched,completed',
        ]);

        $response = \App\Models\EnquiryResponse::where('enquiry_id', $enquiry->id)
            ->whereIn('status', ['accepted', 'dispatched', 'completed'])
            ->first();

        if (!$response) {
            return $this->fail('No active assigned driver found for this enquiry.', 404);
        }

        $status = $request->input('status');
        $response->update([
            'status' => $status
        ]);

        $driver = \App\Models\User::find($response->driver_id);
        $driverName = $driver ? $driver->name : 'Driver';
        $routeStr = explode(',', $enquiry->pickup_location)[0] . " ➔ " . explode(',', $enquiry->dropoff_location)[0];

        \App\Models\AdminNotification::create([
            'message' => "🔧 Load Status updated to {$status} for #ENQ-{$enquiry->id} (Driver: {$driverName}, Route: {$routeStr}) by Admin.",
            'type' => 'info',
            'read' => false
        ]);

        // Send push notification to the driver
        if ($driver && !empty($driver->fcm_token)) {
            $title = $status === 'dispatched' ? "🚚 Load Dispatched!" : ($status === 'completed' ? "🏁 Consignment Delivered!" : "🎉 Load Status Update");
            $body = $status === 'dispatched' 
                ? "Your load #ENQ-{$enquiry->id} has been marked as Dispatched by Admin. Drive safely!"
                : ($status === 'completed' 
                    ? "Your load #ENQ-{$enquiry->id} has been marked as Completed by Admin. Good job!"
                    : "Your assigned load #ENQ-{$enquiry->id} status has been updated to {$status} by Admin.");

            app(\App\Services\PushNotificationService::class)->send(
                $driver->fcm_token,
                $title,
                $body,
                [
                    'type' => 'status_update',
                    'status' => $status,
                    'enquiry_id' => (string)$enquiry->id,
                    'pickup_location' => $enquiry->pickup_location,
                    'dropoff_location' => $enquiry->dropoff_location,
                ]
            );
        }

        return $this->ok(null, 'Enquiry response status manually updated to ' . $status);
    }
}
