<?php

namespace App\Modules\Drivers\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Drivers\Http\Requests\V1\UpdateDriverProfileRequest;
use App\Modules\Drivers\Services\DriverProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverProfileController extends ApiController
{
    public function __construct(private readonly DriverProfileService $driverProfileService) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->ok([
            'driver_profile' => $this->driverProfileService->getProfile($user),
        ]);
    }

    public function update(UpdateDriverProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $profile = $this->driverProfileService->updateProfile($user, $request->validated());

        return $this->ok([
            'driver_profile' => $profile,
        ], 'Driver profile updated');
    }
}

