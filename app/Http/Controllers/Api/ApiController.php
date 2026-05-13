<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Api\RespondsWithApi;

abstract class ApiController extends Controller
{
    use RespondsWithApi;
}

