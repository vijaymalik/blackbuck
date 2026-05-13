<?php

namespace App\Modules\Auth\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Auth\Http\Requests\V1\LoginRequest;
use App\Modules\Auth\Http\Requests\V1\RegisterRequest;
use App\Modules\Auth\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends ApiController
{
    public function __construct(private readonly AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register(
            name: $request->validated('name'),
            email: $request->validated('email'),
            password: $request->validated('password'),
            deviceName: $request->validated('device_name', 'mobile'),
        );

        return $this->created($result, 'Registered');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            email: $request->validated('email'),
            password: $request->validated('password'),
            deviceName: $request->validated('device_name', 'mobile'),
        );

        return $this->ok($result, 'Logged in');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok([
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request);

        return $this->ok(null, 'Logged out');
    }
}

