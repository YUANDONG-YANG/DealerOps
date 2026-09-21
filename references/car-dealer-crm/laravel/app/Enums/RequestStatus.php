<?php

namespace App\Enums;

enum RequestStatus: string
{
    use EnumToArray;

    case OPEN = 'Открыта';
    case IN_PROGRESS = 'В работе';
    case CLOSED = 'Закрыта';
}
