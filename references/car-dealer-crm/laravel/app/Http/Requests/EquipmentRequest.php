<?php

namespace App\Http\Requests;

use App\Enums\Body;
use App\Enums\Type;
use Illuminate\Foundation\Http\FormRequest;

class EquipmentRequest extends FormRequest
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
            'type' => 'required|in:'.implode(',', Type::names()),
            'max_speed' => 'required|integer',
            'acceleration_time' => 'required|numeric',
            'doors_count' => 'required|integer|max:255',
            'seats_count' => 'required|integer|max:255',
            'length' => 'required|integer',
            'width' => 'required|integer',
            'height' => 'required|integer',
            'fuel_consumption_90' => 'required|numeric',
            'fuel_consumption_120' => 'required|numeric',
            'fuel_consumption_city' => 'required|numeric',
            'body' => 'required|in:'.implode(',', Body::names()),
            'tires_name' => 'required|max:20',
            'generation_id' => 'required|integer|exists:generations,id',
            'engine_id' => 'required|integer|exists:engines,id',
        ];
    }
}
