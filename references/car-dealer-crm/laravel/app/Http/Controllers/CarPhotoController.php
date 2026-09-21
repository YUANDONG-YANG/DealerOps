<?php

namespace App\Http\Controllers;

use App\Models\CarPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CarPhotoController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'photo' => 'required|base64mimes:jpg,png,jpeg,gif|base64max:2048',
            'car_id' => 'required|exists:cars,id'
        ]);
        $fileName = md5(microtime()) . '.jpg';
        $image = base64_decode(explode(',', $validated['photo'])[1]);
        Storage::disk('public')->put($fileName, $image);
        $validated['photo'] = $fileName;
        CarPhoto::create($validated);

        return redirect()->back();
    }

    public function delete(string $id)
    {
        $car = CarPhoto::findOrFail($id);
        Storage::disk('public')->delete($car->photo);
        $car->delete();

        return redirect()->back();
    }
}
