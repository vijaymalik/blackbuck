<?php

use Illuminate\Http\JsonResponse;

if (! function_exists('api_ok')) {
    function api_ok(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        return \App\Support\Api\ApiResponse::success($data, $message, $status, $meta);
    }
}

if (! function_exists('api_error')) {
    function api_error(string $message = 'Error', int $status = 400, mixed $errors = null, array $meta = []): JsonResponse
    {
        return \App\Support\Api\ApiResponse::error($message, $status, $errors, $meta);
    }
}

