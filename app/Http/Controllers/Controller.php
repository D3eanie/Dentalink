<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController; // Import the framework's base controller

// The local Controller now extends the framework's BaseController
abstract class Controller extends BaseController 
{
    // These traits provide methods like $this->middleware()
    use AuthorizesRequests, ValidatesRequests; 
}