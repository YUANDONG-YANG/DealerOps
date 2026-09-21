<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderRequest extends FormRequest
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
            'price' => 'required|numeric|between:0,9999999999.99',
            'car_id' => 'required|integer|exists:cars,id',
            'customer_id' => 'required|integer|exists:customers,id',
            'contract_signed_at' => 'nullable|date',
            'car_transferred_at' => 'nullable|date',
            'payment_received_at' => 'nullable|date',
            'comment' => 'nullable|string|max:65535',
        ];
    }
}
