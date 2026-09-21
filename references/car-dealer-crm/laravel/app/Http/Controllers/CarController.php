<?php

namespace App\Http\Controllers;

use App\Enums\CarStatus;
use App\Exports\SellingCarsExport;
use App\Http\Requests\CarRequest;
use App\Models\Brand;
use App\Models\Car;
use App\Models\Generation;
use App\Models\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CarController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $cars = Car::search($request->search, [
            '' => ['id', 'state_number', 'vin', 'release_date'],
            'supply.equipment' => ['name'],
            'supply.equipment.generation' => ['number'],
            'supply.equipment.generation.model' => ['name'],
            'supply.equipment.generation.model.brand' => ['name'],
        ])
            ->filter($request->all())
            ->with('supply.equipment.generation.model.brand')
            ->orderByDesc('id')
            ->get();
        $brands = Brand::orderBy('name')->get();
        $models = Model::where('brand_id', '=', $request->brand)->orderBy('name')->get();
        $generations = Generation::where('model_id', '=', $request->model)->orderBy('number')->get();
        $statuses = CarStatus::array();

        return Inertia::render('CRM/Cars/Index', compact('cars', 'brands', 'models', 'generations', 'statuses'));
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $car = Car::with('supply.equipment.generation.model.brand', 'photos')->findOrFail($id);
        $statuses = CarStatus::array();

        return Inertia::render('CRM/Cars/Show', compact('car', 'statuses'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $car = Car::findOrFail($id);
        $statuses = CarStatus::array();

        return Inertia::render('CRM/Cars/Edit', compact('car', 'statuses'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(CarRequest $request, string $id)
    {
        $car = Car::findOrFail($id);
        $car->update($request->validated());

        return redirect()->route('crm.cars.show', ['id' => $car->id]);
    }

    public function downloadSellingCarsReport() {
        return Excel::download(new SellingCarsExport, 'Номенклатура.xlsx');
    }
}
