<?php

namespace App\Actions\Fortify;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;

class AttemptToAuthenticate extends \Laravel\Fortify\Actions\AttemptToAuthenticate
{
    /**
     * Throw a failed authentication validation exception.
     *
     * @param  Request  $request
     * @return void
     *
     * @throws ValidationException
     */
    protected function throwFailedAuthenticationException($request): void
    {
        $this->limiter->increment($request);

        throw ValidationException::withMessages([
            Fortify::username() => 'Неверное имя пользователя или пароль.',
        ]);
    }
}
