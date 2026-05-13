<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'force.json' => \App\Http\Middleware\ForceJsonResponse::class,
            'request.id' => \App\Http\Middleware\AttachRequestId::class,
            'admin.access' => \App\Http\Middleware\EnsureAdminAccess::class,
        ]);

        $middleware->appendToGroup('api', [
            \App\Http\Middleware\AttachRequestId::class,
            \App\Http\Middleware\ForceJsonResponse::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
