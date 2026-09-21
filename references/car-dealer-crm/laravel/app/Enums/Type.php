<?php

namespace App\Enums;

enum Type: string
{
    use EnumToArray;

    case A = 'A';
    case B = 'B';
    case C = 'C';
    case D = 'D';
    case E = 'E';
}
