<?php

use App\Http\Controllers\Api\AppointmentBlockController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DailyExceptionsController;
use App\Http\Controllers\Api\DepartmentQueueController;
use App\Http\Controllers\Api\PatientQueueController;
use App\Http\Controllers\Api\PatientVisitController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StaffAccountController;
use App\Http\Controllers\Api\StaffApprovalController;
use App\Http\Controllers\Api\StaffDashboardController;
use App\Http\Controllers\Api\StaffVisitController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureReceptionOrAdmin;
use App\Http\Middleware\LockClinicSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DepartmentController;

// Public authentication.
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// Public queue board.
Route::get('/queues/live-board', [QueueController::class, 'liveBoard'])
    ->middleware('throttle:60,1');

// Signed-in accounts and appointments.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/profile', [ProfileController::class, 'show']);

    Route::post('/profile', [ProfileController::class, 'update']);

    Route::get('/settings', [SettingsController::class, 'show']);

    Route::patch('/settings', [SettingsController::class, 'update'])
        ->middleware('throttle:20,1');

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
    )->middleware(LockClinicSchedule::class);

    Route::patch(
        '/appointments/{appointment}/reschedule',
        [AppointmentController::class, 'reschedule']
    )->middleware(LockClinicSchedule::class);

    Route::patch(
        '/appointments/{appointment}/cancel',
        [AppointmentController::class, 'cancel']
    );

    Route::post(
        '/appointments/{appointment}/check-in',
        [AppointmentController::class, 'checkIn']
    );
});

// Administrator staff management.
Route::middleware(['auth:sanctum', EnsureAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get(
            '/departments',
            [DepartmentController::class, 'adminIndex']
        );

        Route::post(
            '/departments',
            [DepartmentController::class, 'store']
        );

        Route::patch(
            '/departments/{department}',
            [DepartmentController::class, 'update']
        );
        Route::get(
            '/staff',
            [StaffApprovalController::class, 'index']
        );

        Route::post(
            '/staff',
            [StaffAccountController::class, 'store']
        );

        Route::patch(
            '/staff/{staff}',
            [StaffApprovalController::class, 'update']
        );
    });

// Reception and administrator walk-in registration.
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

// Patient queues, summaries, and ratings.
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

        Route::get(
            '/visit-summaries',
            [PatientVisitController::class, 'summaries']
        );

        Route::post(
            '/visits/{visit}/rating',
            [PatientVisitController::class, 'rate']
        )->middleware('throttle:10,1');
    });

// Staff tools. Controllers enforce role, department, and privacy access.
Route::middleware('auth:sanctum')
    ->prefix('staff')
    ->group(function () {
        // Department queue controls.
        Route::get(
            '/queue',
            [DepartmentQueueController::class, 'index']
        );

        Route::post(
            '/queue/call-next',
            [DepartmentQueueController::class, 'callNext']
        );

        Route::patch(
            '/queue/{queue}/arrive',
            [DepartmentQueueController::class, 'arrive']
        );

        Route::patch(
            '/queue/{queue}/no-show',
            [DepartmentQueueController::class, 'noShow']
        );

        // Visit records.
        Route::get(
            '/visit-candidates',
            [StaffVisitController::class, 'candidates']
        );

        Route::get(
            '/visits',
            [StaffVisitController::class, 'index']
        );

        Route::post(
            '/visits',
            [StaffVisitController::class, 'store']
        );

        Route::get(
            '/visits/{visit}/history',
            [StaffVisitController::class, 'history']
        );

        Route::get(
            '/visits/{visit}/slip',
            [StaffVisitController::class, 'slip']
        );

        Route::post(
            '/visits/{visit}/reports',
            [StaffVisitController::class, 'report']
        )->middleware('throttle:10,1');

        // Appointment blocks.
        Route::get(
            '/appointment-blocks',
            [AppointmentBlockController::class, 'index']
        );

        Route::post(
            '/appointment-blocks',
            [AppointmentBlockController::class, 'store']
        )->middleware(LockClinicSchedule::class);

        Route::delete(
            '/appointment-blocks/{block}',
            [AppointmentBlockController::class, 'destroy']
        )->middleware(LockClinicSchedule::class);

        // Dashboard and daily reports.
        Route::get(
            '/dashboard',
            [StaffDashboardController::class, 'index']
        );

        Route::get(
            '/daily-exceptions',
            [DailyExceptionsController::class, 'index']
        );

        Route::get(
            '/daily-visit-sheet',
            [StaffVisitController::class, 'dailySheet']
        );
    });