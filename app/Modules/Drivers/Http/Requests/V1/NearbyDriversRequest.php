<?php

namespace App\Modules\Drivers\Http\Requests\V1;

use Illuminate\Foundation\Http\FormRequest;

class NearbyDriversRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['sometimes', 'integer', 'min:100', 'max:100000'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'online_only' => ['sometimes', 'boolean'],
        ];
    }
}

