<?php

namespace App\Http\Requests;

use App\Enums\CarStatus;
use Illuminate\Foundation\Http\FormRequest;

class CarRequest extends FormRequest
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
            'price' => 'nullable|numeric|between:0,9999999999.99',
            'status' => 'required|in:'.implode(',', CarStatus::names()),
            'vin' => 'nullable|string|max:17',
            'chassis_number' => 'nullable|string|max:255',
            'body_number'=> 'nullable|string|max:12',
            'mileage'=> 'nullable|numeric|max:4294967295',
            'color'=> 'nullable|string|max:255',
            'state_number'=> 'nullable|string|max:10',
            'pts_series'=> 'nullable|string|max:4',
            'pts_number'=> 'nullable|numeric|max:16777215',
            'pts_issued_by'=> 'nullable|string|max:255',
            'pts_issued_at'=> 'nullable|date',
            'sts_series'=> 'nullable|string|max:4',
            'sts_number'=> 'nullable|numeric|max:16777215',
            'sts_issued_by'=> 'nullable|string|max:255',
            'sts_issued_at'=> 'nullable|date',
            'release_date'=> 'nullable|date',
        ];
    }
}
