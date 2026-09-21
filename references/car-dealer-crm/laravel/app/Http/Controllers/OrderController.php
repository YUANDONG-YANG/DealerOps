<?php

namespace App\Http\Controllers;

use App\Exports\AnalysisOrdersExport;
use App\Exports\OrdersExport;
use App\Http\Requests\OrderRequest;
use App\Models\Car;
use App\Models\Customer;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpWord\TemplateProcessor;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $orders = Order::search($request->search, [
            '' => ['id', 'comment'],
            'car' => ['state_number'],
            'car.supply.equipment' => ['name'],
            'car.supply.equipment.generation.model' => ['name'],
            'car.supply.equipment.generation.model.brand' => ['name'],
            'user' => ['name'],
            'customer' => ['name', 'phone']
        ])
            ->filter($request->all())
            ->with('customer', 'user', 'car.supply.equipment.generation.model.brand')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('CRM/Orders/Index', compact('orders'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $customers = Customer::orderBy('name')->get();
        $cars = Car::with('supply.equipment.generation.model.brand')->whereIn('status', ['PRESENT', 'SELLING'])->get();

        return Inertia::render('CRM/Orders/Create', compact('customers', 'cars'));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(OrderRequest $request)
    {
        $order = Order::create($request->validated() + [
            'user_id' => $request->user()->id,
            'created_at' => now()
        ]);

        return redirect()->route('crm.orders.show', ['id' => $order->id]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $order = Order::with('customer', 'user', 'car.supply.equipment.generation.model.brand')->findOrFail($id);

        return Inertia::render('CRM/Orders/Show', compact('order'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $order = Order::with('customer', 'user', 'car.supply.equipment.generation.model.brand')->findOrFail($id);
        $customers = Customer::orderBy('name')->get();
        $cars = Car::with('supply.equipment.generation.model.brand')->whereIn('status', ['PRESENT', 'SELLING'])->get();

        return Inertia::render('CRM/Orders/Edit', compact('order', 'customers', 'cars'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(OrderRequest $request, string $id)
    {
        $order = Order::findOrFail($id);
        $order->update($request->validated());

        return redirect()->route('crm.orders.show', ['id' => $order->id]);
    }

    public function downloadContract(string $id)
    {
        $order = Order::with('user', 'car.supply.equipment.generation.model.brand', 'car.supply.equipment.engine', 'customer')->findOrFail($id);

        $templateProcessor = new TemplateProcessor(storage_path('app/templates/').'dkp.docx');
        $templateProcessor->setValues([
            'id' => $order->id,
            'day' => today()->day,
            'month' => today()->getTranslatedMonthName('Do MMMM'),
            'year' => today()->year,
            'user_name' => $order->user->name,
            'customer_name' => $order->customer->name,
            'state_number' => $order->car->state_number,
            'vin' => $order->car->vin,
            'brand' => $order->car->supply->equipment->generation->model->brand->name,
            'model' => $order->car->supply->equipment->generation->model->name,
            'type' => $order->car->supply->equipment->type,
            'release_date' => Carbon::parse($order->car->release_date)->format('Y'),
            'chassis_number' => $order->car->chassis_number,
            'body_number' => $order->car->body_number,
            'color' => $order->car->color,
            'engine_name' => $order->car->supply->equipment->engine->name,
            'max_power' => $order->car->supply->equipment->engine->max_power,
            'capacity' => $order->car->supply->equipment->engine->capacity,
            'pts_series' => $order->car->pts_series,
            'pts_number' => $order->car->pts_number,
            'pts_issued_by' => $order->car->pts_issued_by,
            'pts_issued_at_day' => Carbon::parse($order->car->pts_issued_at)->day,
            'pts_issued_at_month' => Carbon::parse($order->car->pts_issued_at)->getTranslatedMonthName('Do MMMM'),
            'pts_issued_at_year' => Carbon::parse($order->car->pts_issued_at)->year,
            'sts_series' => $order->car->sts_series,
            'sts_number' => $order->car->sts_number,
            'sts_issued_by' => $order->car->sts_issued_by,
            'sts_issued_at_day' => Carbon::parse($order->car->sts_issued_at)->day,
            'sts_issued_at_month' => Carbon::parse($order->car->sts_issued_at)->getTranslatedMonthName('Do MMMM'),
            'sts_issued_at_year' => Carbon::parse($order->car->sts_issued_at)->year,
            'price' => number_format($order->price, 2),
            'nds' => number_format(round($order->price/100*20), 2),
            'day_10' => today()->addDays(10)->day,
            'month_10' => today()->addDays(10)->getTranslatedMonthName('Do MMMM'),
            'year_10' => today()->addDays(10)->year,
        ]);
        $templateProcessor->setValue('lastname', null);
        $path = storage_path('app/temp/') . 'Договор КП №' . $order->id . ' ' . now()->format('Y-m-d') . '.docx';
        $templateProcessor->saveAs($path);

        return response()->download($path);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $order = Order::findOrFail($id);
        $order->delete();

        return redirect()->route('crm.orders.index');
    }

    public function downloadOrdersReport() {
        return Excel::download(new OrdersExport, 'Заказы.xlsx');
    }

    public function downloadAnalysisOrdersReport(Request $request) {
        $from = Carbon::parse($request->from);
        $to = Carbon::parse($request->to);

        return Excel::download(new AnalysisOrdersExport($from, $to), 'Анализ продаж.xlsx');
    }
}
