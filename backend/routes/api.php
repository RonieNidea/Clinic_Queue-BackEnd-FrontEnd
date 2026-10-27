<?php

use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\StaffApprovalController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Controllers\Api\StaffAccountController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Middleware\EnsureReceptionOrAdmin;
use App\Http\Controllers\Api\PatientQueueController;

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::get('/queues/live-board', [QueueController::class, 'liveBoard'])
    ->middleware('throttle:60,1');

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
        '/appointments/{appointment}/reschedule',
        [AppointmentController::class, 'reschedule']
    );

    Route::patch(
        '/appointments/{appointment}/cancel',
        [AppointmentController::class, 'cancel']
    );

    Route::post(
        '/appointments/{appointment}/check-in',
        [AppointmentController::class, 'checkIn']
    );
});

    Route::middleware(['auth:sanctum', EnsureAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get(
            '/staff',
            [StaffApprovalController::class, 'index']
        );

        Route::post(
            '/staff',
            [StaffAccountController::class, 'store']
        );

        // Keep this for reviewing any existing pending accounts.
        Route::patch(
            '/staff/{staff}',
            [StaffApprovalController::class, 'update']
        );
    });

    Route::middleware(['auth:sanctum', EnsureReceptionOrAdmin::class])
    ->prefix('reception')
    ->group(function () {
        Route::get(
            '/queues',
            [QueueController::class, 'receptionIndex']
        );

        Route::post(
            '/walk-ins',
            [QueueController::class, 'storeWalkIn']
        );
    });

    Route::middleware('auth:sanctum')
    ->prefix('patient')
    ->group(function () {
        Route::get(
            '/queues',
            [PatientQueueController::class, 'index']
        );

        Route::post(
            '/queues',
            [PatientQueueController::class, 'store']
        )->middleware('throttle:5,1');
    });