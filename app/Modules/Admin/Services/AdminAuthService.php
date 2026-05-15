<?php

namespace App\Modules\Admin\Services;

use App\Modules\Admin\Repositories\AdminRepository;
use App\Support\Services\BaseService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthService extends BaseService
{
    public function __construct(private readonly AdminRepository $admins) {}

    public function login(string $email, string $password, string $deviceName = 'admin-panel'): array
    {
        $user = $this->admins->findActiveAdminUserByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw new AuthenticationException('Invalid admin credentials.');
        }

        $tokenName = sprintf('admin:%s', $deviceName);

        return [
            'admin' => $user->profile,
            'user' => $user,
            'token' => $user->createToken($tokenName, ['admin'])->plainTextToken,
        ];
    }

    public function logout(Request $request): void
    {
        $request->user()?->currentAccessToken()?->delete();
    }
}
