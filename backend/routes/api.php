<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get(
        '/appointments/available-slots',
        [AppointmentController::class, 'availableSlots']
    );

    Route::get(
        '/appointments',
        [AppointmentController::class, 'index']
    );

    Route::post(
        '/appointments',
        [AppointmentController::class, 'store']
    );

    Route::patch(
        '/appointments/{appointment}/cancel',
        [AppointmentController::class, 'cancel']
    );
});