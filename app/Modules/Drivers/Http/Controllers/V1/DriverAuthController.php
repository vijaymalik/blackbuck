<?php

namespace App\Modules\Drivers\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Drivers\Http\Requests\V1\RequestOtpRequest;
use App\Modules\Drivers\Http\Requests\V1\VerifyOtpRequest;
use App\Modules\Drivers\Services\DriverOtpAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverAuthController extends ApiController
{
    public function __construct(private readonly DriverOtpAuthService $otpAuthService) {}

    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        $result = $this->otpAuthService->requestOtp(
            phone: $request->validated('phone')
        );

        return $this->ok($result, 'OTP sent to driver phone number');
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $result = $this->otpAuthService->verifyOtp(
            phone: $request->validated('phone'),
            otp: $request->validated('otp'),
            deviceName: $request->validated('device_name', 'driver-mobile'),
        );

        if (! $result) {
            return $this->fail('Invalid or expired OTP', 422);
        }

        return $this->ok($result, 'Driver logged in');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok([
            'driver' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $this->otpAuthService->logout($user);
        }

        return $this->ok(null, 'Driver logged out');
    }
}

