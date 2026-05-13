<?php

namespace App\Modules\Admin\Http\Controllers\V1;

use App\Http\Controllers\Api\ApiController;
use Illuminate\Http\JsonResponse;

class AdminController extends ApiController
{
    public function health(): JsonResponse
    {
        return $this->ok([
            'status' => 'ok',
            'service' => config('app.name'),
        ], 'Admin OK');
    }
}

