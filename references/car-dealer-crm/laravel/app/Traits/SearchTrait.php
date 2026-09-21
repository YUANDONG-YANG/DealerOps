<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait SearchTrait
{
    public static function getModelQuery(): Builder {
        return static::class::query();
    }

    public static function search(string|null $search, array $searchParams): Builder {
        $query = self::getModelQuery();
        foreach (explode(' ', $search) as $word) {
            $query->where(function ($query) use ($word, $searchParams) {
                foreach ($searchParams as $relation => $columns) {
                    foreach ($columns as $column) {
                        if ($relation === '') {
                            $query->orWhere($column, 'like', "%$word%");
                        }
                        else {
                            $query->orWhereHas($relation, function ($q) use ($word, $column) {
                                $q->where($column, 'like', "%$word%");
                            });
                        }
                    }
                }
            });
        }

        return $query;
    }
}
