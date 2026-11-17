<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class LockClinicSchedule
{
    public function handle(Request $request, Closure $next): Response
    {
        return DB::transaction(function () use ($request, $next) {
            // A write also acquires a lock when using SQLite.
            DB::table('clinic_schedule_locks')
                ->where('id', 1)
                ->update(['id' => 1]);

            $lock = DB::table('clinic_schedule_locks')
                ->where('id', 1)
                ->lockForUpdate()
                ->first();

            if (! $lock) {
                abort(503, 'The appointment schedule is not configured.');
            }

            return $next($request);
        }, 3);
    }
}