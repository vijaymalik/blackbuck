<?php

namespace App\Modules\Drivers\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Drivers\Services\DriverAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class DriverAuthController extends ApiController
{
    public function __construct(private readonly DriverAuthService $authService) {}

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'identity' => 'required|string',
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        try {
            $result = $this->authService->login(
                identity: $request->identity,
                password: $request->password,
                deviceName: $request->get('device_name', 'driver-mobile')
            );

            return $this->ok($result, 'Login successful');
        } catch (ValidationException $e) {
            return $this->fail($e->getMessage(), 422);
        }
    }

    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'truck_type' => 'nullable|string',
            'truck_number' => 'nullable|string',
            'truck_capacity' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $result = $this->authService->register(
            data: $validator->validated(),
            deviceName: $request->get('device_name', 'driver-mobile')
        );

        return $this->ok($result, 'Registration successful');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok([
            'driver' => $request->user()->load('driverProfile'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $this->authService->logout($user);
        }

        return $this->ok(null, 'Logged out successfully');
    }

    public function saveFcmToken(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'fcm_token' => 'required|string',
            'device_type' => 'nullable|string|in:android,ios',
        ]);

        if ($validator->fails()) {
            return $this->fail($validator->errors()->first(), 422);
        }

        $request->user()->update([
            'fcm_token' => $request->fcm_token,
            'device_type' => $request->device_type,
        ]);

        return $this->ok(null, 'FCM token and device type saved successfully.');
    }
}
