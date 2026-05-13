<?php

namespace App\Modules\Auth\Services;

use App\Modules\Auth\Repositories\UserRepository;
use App\Support\Services\BaseService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthService extends BaseService
{
    public function __construct(private readonly UserRepository $users) {}

    public function register(string $name, string $email, string $password, string $deviceName = 'mobile'): array
    {
        $user = $this->users->create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);

        return [
            'user' => $user,
            'token' => $user->createToken($deviceName)->plainTextToken,
        ];
    }

    public function login(string $email, string $password, string $deviceName = 'mobile'): array
    {
        $user = $this->users->findByEmail($email);

        if (! $user || ! Hash::check($password, $user->password)) {
            throw new AuthenticationException('Invalid credentials.');
        }

        return [
            'user' => $user,
            'token' => $user->createToken($deviceName)->plainTextToken,
        ];
    }

    public function logout(Request $request): void
    {
        $request->user()?->currentAccessToken()?->delete();
    }
}

