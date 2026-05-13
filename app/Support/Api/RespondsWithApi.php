<?php

namespace App\Support\Api;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

trait RespondsWithApi
{
    protected function ok(mixed $data = null, string $message = 'OK', array $meta = []): JsonResponse
    {
        return ApiResponse::success($data, $message, 200, $meta);
    }

    protected function created(mixed $data = null, string $message = 'Created', array $meta = []): JsonResponse
    {
        return ApiResponse::success($data, $message, 201, $meta);
    }

    protected function fail(string $message = 'Error', int $status = 400, mixed $errors = null, array $meta = []): JsonResponse
    {
        return ApiResponse::error($message, $status, $errors, $meta);
    }

    protected function paginated(LengthAwarePaginator $paginator, mixed $data, string $message = 'OK', array $meta = []): JsonResponse
    {
        return ApiResponse::paginated($paginator, $data, $message, $meta);
    }
}

