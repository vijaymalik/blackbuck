<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class AdminUserController extends Controller
{
    /**
     * Create a new user account.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,customer,user,hr',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Create the user
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'email_verified_at' => now(),
        ]);

        // 1. Spatie Role Integration
        $roleName = $request->role;
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $user->assignRole($role);

        // 2. User Profile Integration (Previously Admin Table)
        // We always create a profile for every user now
        UserProfile::create([
            'user_id' => $user->id,
            'role' => $roleName,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['roles', 'profile']),
        ], 201);
    }

    /**
     * Get list of users.
     */
    public function index(): JsonResponse
    {
        $users = User::with(['roles', 'profile'])->latest()->paginate(10);
        return response()->json($users);
    }
}
