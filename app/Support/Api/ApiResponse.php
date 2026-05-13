<?php

namespace App\Support\Api;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function success(
        mixed $data = null,
        string $message = 'OK',
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        if (ob_get_length()) ob_clean();
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
            'meta' => array_merge($meta, [
                'request_id' => request()->header('X-Request-Id'),
            ]),
        ], $status);
    }

    public static function error(
        string $message = 'Error',
        int $status = 400,
        mixed $errors = null,
        array $meta = [],
    ): JsonResponse {
        if (ob_get_length()) ob_clean();
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
            'meta' => array_merge($meta, [
                'request_id' => request()->header('X-Request-Id'),
            ]),
        ], $status);
    }

    public static function paginated(
        LengthAwarePaginator $paginator,
        mixed $data,
        string $message = 'OK',
        array $meta = [],
    ): JsonResponse {
        return self::success($data, $message, 200, array_merge($meta, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]));
    }
}

