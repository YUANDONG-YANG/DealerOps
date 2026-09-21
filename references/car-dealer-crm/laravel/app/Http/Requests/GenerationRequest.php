<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerationRequest extends FormRequest
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
            'from' => 'required|date',
            'to' => 'nullable|after_or_equal:from',
            'number' => 'required|integer',
            'restyling' => 'nullable|boolean',
            'model_id' => 'required|integer|exists:models,id',
        ];
    }
}
