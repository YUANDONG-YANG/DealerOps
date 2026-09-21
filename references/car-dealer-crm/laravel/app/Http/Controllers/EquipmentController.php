<?php

namespace App\Http\Controllers;

use App\Enums\Body;
use App\Enums\Type;
use App\Http\Requests\EquipmentRequest;
use App\Models\Engine;
use App\Models\Equipment;
use App\Models\Generation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EquipmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $equipments = Equipment::search($request->search, [
            '' => ['id', 'name'],
            'generation' => ['number'],
            'generation.model' => ['name'],
            'generation.model.brand' => ['name'],
        ])
            ->with('generation.model.brand', 'engine')
            ->orderByDesc('id')
            ->get();
        $types = Type::array();
        $bodies = Body::array();

        return Inertia::render('CRM/Equipments/Index', compact('equipments', 'types', 'bodies'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $generations = Generation::with('model.brand')->get();
        $engines = Engine::orderBy('name')->get();
        $types = Type::array();
        $bodies = Body::array();

        return Inertia::render('CRM/Equipments/Create', compact('generations', 'engines', 'types', 'bodies'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(EquipmentRequest $request)
    {
        $equipment = Equipment::create($request->validated());

        return redirect()->route('crm.equipments.show', ['id' => $equipment->id]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $equipment = Equipment::with('generation.model.brand', 'engine')->findOrFail($id);
        $types = Type::array();
        $bodies = Body::array();

        return Inertia::render('CRM/Equipments/Show', compact('equipment', 'types', 'bodies'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $equipment = Equipment::with('generation.model.brand', 'engine')->findOrFail($id);
        $generations = Generation::with('model.brand')->get();
        $engines = Engine::orderBy('name')->get();
        $types = Type::array();
        $bodies = Body::array();

        return Inertia::render('CRM/Equipments/Edit', compact('equipment', 'generations', 'engines', 'types', 'bodies'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(EquipmentRequest $request, string $id)
    {
        $equipment = Equipment::findOrFail($id);
        $equipment->update($request->validated());

        return redirect()->route('crm.equipments.show', ['id' => $equipment->id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $equipment = Equipment::findOrFail($id);
        $equipment->delete();

        return redirect()->route('crm.equipments.index');
    }
}
