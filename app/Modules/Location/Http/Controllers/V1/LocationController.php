<?php

namespace App\Modules\Location\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Location\Http\Requests\V1\StoreLocationRequest;
use App\Modules\Location\Services\LocationService;
use Illuminate\Http\JsonResponse;

class LocationController extends ApiController
{
    public function __construct(private readonly LocationService $locationService) {}

    public function update(StoreLocationRequest $request): JsonResponse
    {
        $location = $this->locationService->updateLatest(
            $request->user(),
            $request->validated()
        );

        return $this->ok([
            'location' => $location,
        ], 'Location updated');
    }

    public function store(StoreLocationRequest $request): JsonResponse
    {
        return $this->update($request);
    }
}

