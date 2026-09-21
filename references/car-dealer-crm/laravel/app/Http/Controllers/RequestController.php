<?php

namespace App\Http\Controllers;

use App\Enums\RequestStatus;
use App\Models\Request as CarRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $carRequests = CarRequest::search($request->search, [
            '' => ['id', 'name', 'phone', 'comment'],
            'car' => ['state_number'],
            'car.supply.equipment' => ['name'],
            'car.supply.equipment.generation.model' => ['name'],
            'car.supply.equipment.generation.model.brand' => ['name'],
            'user' => ['name']
        ])
            ->filter($request->all())
            ->with('car.supply.equipment.generation.model.brand', 'user')
            ->orderByDesc('id')
            ->get();
        $statuses = RequestStatus::array();

        return Inertia::render('CRM/Requests/Index', compact('carRequests', 'statuses'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|max:255',
            'phone' => 'required|string|max:11',
            'car_id' => 'required|integer|exists:cars,id',
        ]);
        CarRequest::create($validated);

        return redirect()->back();
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $carRequest = CarRequest::with('car.supply.equipment.generation.model.brand', 'user')->findOrFail($id);
        $statuses = RequestStatus::names();

        return Inertia::render('CRM/Requests/Show', compact('carRequest', 'statuses'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $carRequest = CarRequest::with('car.supply.equipment.generation.model.brand', 'user')->findOrFail($id);

        return Inertia::render('CRM/Requests/Edit', compact('carRequest'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $carRequest = CarRequest::findOrFail($id);
        $validated = $request->validate([
            'name' => 'required|max:255',
            'phone' => 'required|string|max:11',
            'comment' => 'nullable|string|max:65535',
        ]);
        $carRequest->update($validated);

        return redirect()->route('crm.requests.show', ['id' => $carRequest->id]);
    }

    public function nextStatus(Request $request, string $id)
    {
        $carRequest = CarRequest::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:'.implode(',', RequestStatus::names()),
        ]);
        if (!$carRequest->user_id) {
            $validated['user_id'] = $request->user()->id;
        }
        $carRequest->update($validated);

        return redirect()->route('crm.requests.show', ['id' => $carRequest->id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $carRequest = CarRequest::findOrFail($id);
        $carRequest->delete();

        return redirect()->route('crm.requests.index');
    }
}
