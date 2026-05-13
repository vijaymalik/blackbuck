<?php

namespace App\Modules\Location\Repositories;

use App\Models\DriverLocation;
use App\Support\Repositories\BaseRepository;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class DriverLocationRepository extends BaseRepository
{
    public function upsertLatest(int $userId, array $payload): DriverLocation
    {
        DriverLocation::query()->upsert([
            [
                'user_id' => $userId,
                'latitude' => $payload['latitude'],
                'longitude' => $payload['longitude'],
                'speed_kmh' => $payload['speed_kmh'] ?? null,
                'heading_degrees' => $payload['heading_degrees'] ?? null,
                'accuracy_meters' => $payload['accuracy_meters'] ?? null,
                'recorded_at' => $payload['recorded_at'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ], ['user_id'], [
            'latitude',
            'longitude',
            'speed_kmh',
            'heading_degrees',
            'accuracy_meters',
            'recorded_at',
            'updated_at',
        ]);

        if (Config::get('database.default') === 'pgsql') {
            $hasCoordinatesColumn = DB::selectOne("
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'driver_locations'
                      AND column_name = 'coordinates'
                ) AS exists
            ");

            if ((bool) ($hasCoordinatesColumn->exists ?? false)) {
                DB::statement(
                    'UPDATE driver_locations SET coordinates = ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography WHERE user_id = ?',
                    [$payload['longitude'], $payload['latitude'], $userId]
                );
            }
        }

        return DriverLocation::query()->where('user_id', $userId)->firstOrFail();
    }
}

