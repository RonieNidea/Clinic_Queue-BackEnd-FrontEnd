<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['visit_id', 'user_id', 'score', 'comment'])]
class VisitRating extends Model
{
    protected function casts(): array
    {
        return [
            'score' => 'integer',
        ];
    }
}