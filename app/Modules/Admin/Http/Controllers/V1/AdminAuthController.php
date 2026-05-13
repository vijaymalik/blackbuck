<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use App\Modules\Admin\Http\Requests\V1\AdminLoginRequest;
use App\Modules\Admin\Services\AdminAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuthController extends ApiController
{
    public function __construct(private readonly AdminAuthService $authService) {}

    public function login(AdminLoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            email: $request->validated('email'),
            password: $request->validated('password'),
            deviceName: $request->validated('device_name', 'admin-panel'),
        );

        return $this->ok($result, 'Admin logged in');
    }

    public function profile(Request $request): JsonResponse
    {
        return $this->ok([
            'user' => $request->user()->loadMissing('admin'),
            'admin' => $request->user()->admin,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request);

        return $this->ok(null, 'Admin logged out');
    }
}

