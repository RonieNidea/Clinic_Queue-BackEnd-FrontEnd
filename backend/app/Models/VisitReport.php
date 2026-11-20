<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'visit_id',
    'reported_by',
    'field',
    'details',
    'suggested_correction',
    'status',
])]
class VisitReport extends Model
{
    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}