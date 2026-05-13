<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Admin\Http\Requests\V1\AdminNearbyDriversRequest;
use App\Modules\Admin\Services\AdminDriverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDriverController extends ApiController
{
    public function __construct(private readonly AdminDriverService $driverService) {}

    public function index(Request $request): JsonResponse
    {
        $drivers = $this->driverService->getPaginatedDrivers(
            perPage: (int) $request->query('per_page', 15)
        );

        return $this->paginated($drivers, [
            'drivers' => $drivers->items(),
        ], 'Drivers list fetched');
    }

    public function nearby(AdminNearbyDriversRequest $request): JsonResponse
    {
        $drivers = $this->driverService->searchNearbyDrivers($request->validated());

        return $this->ok([
            'drivers' => $drivers,
        ], 'Nearby drivers fetched for admin');
    }
}
