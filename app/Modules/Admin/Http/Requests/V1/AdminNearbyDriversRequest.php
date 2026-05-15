<?php

namespace App\Modules\Admin\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class AdminNearbyDriversRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Middleware handles admin check
    }

    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['sometimes', 'integer', 'min:100', 'max:500000'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'capacity' => ['sometimes', 'numeric', 'min:0'],
        ];
    }
}
