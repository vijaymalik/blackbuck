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
            'role' => 'required|string|exists:roles,name',
            'phone' => 'nullable|string|max:20',
            // Driver specific fields
            'truck_type' => 'nullable|string|max:100',
            'truck_number' => 'nullable|string|max:50|unique:driver_profiles',
            'truck_capacity' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'is_driver' => $request->role === 'driver',
            'email_verified_at' => now(),
        ]);

        $roleName = $request->role;
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        $user->assignRole($role);

        if ($user->is_driver) {
            \App\Models\DriverProfile::create([
                'user_id' => $user->id,
                'truck_type' => $request->truck_type,
                'truck_number' => $request->truck_number,
                'truck_capacity' => $request->truck_capacity,
            ]);
        } else {
            UserProfile::create([
                'user_id' => $user->id,
                'is_active' => true,
                'created_by' => auth()->id(),
            ]);
        }

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['roles', 'profile']),
        ], 201);
    }

    public function index(): JsonResponse
    {
        $users = User::with(['roles', 'profile'])
            ->where('is_driver', false)
            ->latest()
            ->paginate(10);
        return response()->json($users);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'truck_type' => 'nullable|string|max:100',
            'truck_number' => 'nullable|string|max:50|unique:driver_profiles,truck_number,' . ($user->driverProfile ? $user->driverProfile->id : 'NULL'),
            'truck_capacity' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation error', 'errors' => $validator->errors()], 422);
        }

        $user->update($request->only('name', 'email', 'phone'));

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        if ($user->is_driver) {
            $user->driverProfile()->updateOrCreate(
                ['user_id' => $user->id],
                $request->only('truck_type', 'truck_number', 'truck_capacity')
            );
        }

        return response()->json(['message' => 'User updated successfully']);
    }

    public function destroy($id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }
}
