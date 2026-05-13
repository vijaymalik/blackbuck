<?php

namespace App\Modules\Drivers\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Drivers\Http\Requests\V1\NearbyDriversRequest;
use App\Modules\Drivers\Services\NearbyDriverService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class DriversController extends ApiController
{
    public function __construct(private readonly NearbyDriverService $nearbyDriverService) {}

    public function index(): JsonResponse
    {
        // Placeholder: in a real app, scope to driver role + dedicated Driver model.
        $drivers = User::query()->latest()->paginate(15);

        return $this->paginated($drivers, [
            'drivers' => $drivers->items(),
        ]);
    }

    public function show(User $driver): JsonResponse
    {
        return $this->ok([
            'driver' => $driver,
        ]);
    }

    public function nearby(NearbyDriversRequest $request): JsonResponse
    {
        try {
            $drivers = $this->nearbyDriverService->search($request->validated());
        } catch (RuntimeException $exception) {
            return $this->fail($exception->getMessage(), 422);
        }

        return $this->ok([
            'drivers' => $drivers,
        ], 'Nearby drivers fetched');
    }
}

