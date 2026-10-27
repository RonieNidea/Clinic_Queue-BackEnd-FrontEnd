<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'patient_name',
    'department',
    'queue_date',
    'queue_number',
    'status',
    'registration_type',
    'registered_by',
    'started_at',
    'completed_at',
    'appointment_id',
    'user_id',
    'active_patient_key',
])]
class QueueEntry extends Model
{
    protected function casts(): array
    {
        return [
            'queue_date' => 'date:Y-m-d',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }
}