<?php

namespace App\Enums;

enum CarStatus: string
{
    use EnumToArray;

    case WAITING = 'Ожидание';
    case PRESENT = 'В наличии';
    case SELLING = 'В продаже';
    case SOLD = 'Продано';
}
