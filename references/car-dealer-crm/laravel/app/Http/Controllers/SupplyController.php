<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Supplier;
use App\Models\Supply;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $supplies = Supply::search($request->search, [
            '' => ['id'],
            'equipment' => ['name'],
            'equipment.generation.model' => ['name'],
            'equipment.generation.model.brand' => ['name'],
            'user' => ['name'],
            'supplier' => ['name', 'email'],
        ])
            ->filter($request->all())
            ->with('equipment', 'supplier', 'user')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('CRM/Supplies/Index', compact('supplies'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $equipments = Equipment::with('generation.model.brand')->orderBy('name')->get();
        $suppliers = Supplier::orderBy('name')->get();

        return Inertia::render('CRM/Supplies/Create', compact('equipments', 'suppliers'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'price' => 'nullable|numeric|between:0,9999999999.99',
            'equipment_id' => 'required|exists:equipments,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'supplied_at' => 'nullable|date',
        ]);
        $supply = Supply::create($validated +
            [
                'user_id' => $request->user()->id,
                'created_at' => now()
            ]);
        $supply->car()->create(['supply_id' => $supply->id]);

        return redirect()->route('crm.supplies.show', ['id' => $supply->id]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $supply = Supply::with('equipment', 'supplier', 'user', 'car')->findOrFail($id);

        return Inertia::render('CRM/Supplies/Show', compact('supply'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $supply = Supply::with('equipment.generation.model.brand', 'supplier')->findOrFail($id);
        $equipments = Equipment::with('generation.model.brand')->orderBy('name')->get();
        $suppliers = Supplier::orderBy('name')->get();

        return Inertia::render('CRM/Supplies/Edit', compact('supply', 'equipments', 'suppliers'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $supply = Supply::findOrFail($id);
        $validated = $request->validate([
            'price' => 'nullable|numeric|between:0,9999999999.99',
            'equipment_id' => 'required|exists:equipments,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'supplied_at' => 'nullable|date',
        ]);
        $supply->update($validated);

        return redirect()->route('crm.supplies.show', ['id' => $supply->id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $supply = Supply::with('car.photos')->findOrFail($id);
        $supply->car->photos->each(function ($photo) {
            $photo->delete();
        });
        $supply->car->delete();
        $supply->delete();

        return redirect()->route('crm.supplies.index');
    }
}
