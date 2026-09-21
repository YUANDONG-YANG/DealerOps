<?php

namespace App\Http\Requests;

use App\Enums\Fuel;
use Illuminate\Foundation\Http\FormRequest;

class EngineRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|max:255',
            'capacity' => 'required|numeric',
            'cylinders_count' => 'required|integer|max:255',
            'max_power' => 'required|integer',
            'max_torque' => 'required|integer',
            'fuel' => 'required|in:'.implode(',', Fuel::names()),
        ];
    }
}
