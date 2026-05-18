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
            'speed' => 'nullable|numeric',
            'heading' => 'nullable|numeric',
            'accuracy' => 'nullable|numeric',
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

        $speed_kmh = $request->speed ? (int)round($request->speed * 3.6) : 0; // m/s to km/h conversion
        $heading = (int)round($request->heading ?? 0);
        $accuracy = (int)round($request->accuracy ?? 0);

        // Also store in driver_locations table for history
        $user->driverLocation()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'speed_kmh' => $speed_kmh,
                'heading_degrees' => $heading,
                'accuracy_meters' => $accuracy,
                'coordinates' => \Illuminate\Support\Facades\DB::raw("ST_SetSRID(ST_MakePoint(" . (float)$request->longitude . ", " . (float)$request->latitude . "), 4326)"),
                'recorded_at' => now(),
            ]
        );

        $matchingEnquiries = \Illuminate\Support\Facades\DB::select("
            WITH ref AS (
                SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS driver_point
            )
            SELECT
                e.id,
                e.pickup_location,
                e.pickup_instruction,
                e.dropoff_location,
                e.pickup_latitude,
                e.pickup_longitude,
                e.dropoff_latitude,
                e.dropoff_longitude,
                e.radius_km,
                ST_Distance(ST_SetSRID(ST_MakePoint(e.pickup_longitude, e.pickup_latitude), 4326)::geography, ref.driver_point) / 1000.0 AS distance_km
            FROM enquiries e
            CROSS JOIN ref
            WHERE e.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM enquiry_responses er 
                  WHERE er.enquiry_id = e.id AND er.driver_id = ?
              )
              AND ST_DWithin(ST_SetSRID(ST_MakePoint(e.pickup_longitude, e.pickup_latitude), 4326)::geography, ref.driver_point, e.radius_km * 1000)
            ORDER BY distance_km ASC
        ", [$request->longitude, $request->latitude, $user->id]);

        return $this->ok([
            'enquiries' => $matchingEnquiries
        ], 'Location updated successfully');
    }

    public function toggleStatus(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'is_online' => 'required|boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'speed' => 'nullable|numeric',
            'heading' => 'nullable|numeric',
            'accuracy' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $user = $request->user();
        $user->update(['is_online' => $request->is_online]);

        $matchingEnquiries = [];

        if ($request->filled(['latitude', 'longitude'])) {
            $user->update([
                'current_latitude' => $request->latitude,
                'current_longitude' => $request->longitude,
                'last_seen_at' => now(),
            ]);

            $speed_kmh = $request->speed ? (int)round($request->speed * 3.6) : 0;
            $heading = (int)round($request->heading ?? 0);
            $accuracy = (int)round($request->accuracy ?? 0);

            $user->driverLocation()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'speed_kmh' => $speed_kmh,
                    'heading_degrees' => $heading,
                    'accuracy_meters' => $accuracy,
                    'coordinates' => \Illuminate\Support\Facades\DB::raw("ST_SetSRID(ST_MakePoint(" . (float)$request->longitude . ", " . (float)$request->latitude . "), 4326)"),
                    'recorded_at' => now(),
                ]
            );

             $matchingEnquiries = \Illuminate\Support\Facades\DB::select("
                WITH ref AS (
                    SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS driver_point
                )
                SELECT
                    e.id,
                    e.pickup_location,
                    e.pickup_instruction,
                    e.dropoff_location,
                    e.pickup_latitude,
                    e.pickup_longitude,
                    e.dropoff_latitude,
                    e.dropoff_longitude,
                    e.radius_km,
                    ST_Distance(ST_SetSRID(ST_MakePoint(e.pickup_longitude, e.pickup_latitude), 4326)::geography, ref.driver_point) / 1000.0 AS distance_km,
                    EXISTS (
                        SELECT 1 FROM enquiry_responses er 
                        WHERE er.enquiry_id = e.id AND er.driver_id = ? AND er.status = 'pending'
                    ) AS has_pending_bid
                FROM enquiries e
                CROSS JOIN ref
                WHERE e.is_active = true
                  AND NOT EXISTS (
                      SELECT 1 FROM enquiry_responses er 
                      WHERE er.enquiry_id = e.id 
                        AND er.driver_id = ? 
                        AND er.status IN ('accepted', 'dispatched', 'completed')
                  )
                  AND ST_DWithin(ST_SetSRID(ST_MakePoint(e.pickup_longitude, e.pickup_latitude), 4326)::geography, ref.driver_point, e.radius_km * 1000)
                ORDER BY distance_km ASC
            ", [$request->longitude, $request->latitude, $user->id, $user->id]);
        }

        return $this->ok([
            'is_online' => $user->is_online,
            'enquiries' => $matchingEnquiries
        ], 'Status updated');
    }

    public function respondToEnquiry(Request $request, \App\Models\Enquiry $enquiry): JsonResponse
    {
        $user = $request->user();

        $response = \App\Models\EnquiryResponse::updateOrCreate(
            [
                'enquiry_id' => $enquiry->id,
                'driver_id' => $user->id,
            ],
            [
                'status' => 'pending',
            ]
        );

        \App\Models\AdminNotification::create([
            'message' => "Driver {$user->name} placed a bid for Load #ENQ-{$enquiry->id} (" . explode(',', $enquiry->pickup_location)[0] . " ➔ " . explode(',', $enquiry->dropoff_location)[0] . ")",
            'type' => 'info',
            'read' => false
        ]);

        return $this->ok($response, 'Bid response submitted successfully.');
    }

    public function getAcceptedEnquiries(Request $request): JsonResponse
    {
        $user = $request->user();

        $acceptedEnquiries = \App\Models\Enquiry::whereHas('responses', function ($query) use ($user) {
            $query->where('driver_id', $user->id)
                  ->whereIn('status', ['accepted', 'dispatched', 'completed']);
        })
        ->with(['responses' => function ($query) use ($user) {
            $query->where('driver_id', $user->id);
        }])
        ->latest()
        ->get();

        return $this->ok($acceptedEnquiries);
    }

    public function updateResponseStatus(Request $request, \App\Models\Enquiry $enquiry): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:dispatched,completed',
        ]);

        $user = $request->user();
        
        $response = \App\Models\EnquiryResponse::where('enquiry_id', $enquiry->id)
            ->where('driver_id', $user->id)
            ->first();

        if (!$response) {
            return $this->error('No response bid found for this enquiry.', 404);
        }

        $status = $request->input('status');
        $response->update([
            'status' => $status
        ]);

        $routeStr = explode(',', $enquiry->pickup_location)[0] . " ➔ " . explode(',', $enquiry->dropoff_location)[0];
        if ($status === 'dispatched') {
            \App\Models\AdminNotification::create([
                'message' => "🚚 Load Dispatched: Driver {$user->name} is in transit for #ENQ-{$enquiry->id} ({$routeStr})!",
                'type' => 'success',
                'read' => false
            ]);
        } elseif ($status === 'completed') {
            \App\Models\AdminNotification::create([
                'message' => "🏁 Consignment Delivered: Driver {$user->name} completed delivery for #ENQ-{$enquiry->id} ({$routeStr})!",
                'type' => 'success',
                'read' => false
            ]);
        }

        return $this->ok(null, 'Load status updated successfully to ' . $status);
    }
}
