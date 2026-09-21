<table>
    <thead>
        <tr>
            <th colspan="6">Продажи</th>
        </tr>
        <tr>
            <th>ID</th>
            <th>Комплектация</th>
            <th>Цена</th>
            <th>Клиент</th>
            <th>Сотрудник</th>
            <th>Договор подписан</th>
        </tr>
    </thead>
    <tbody>
        @foreach($orders as $order)
            <tr>
                <td>{{$order->id}}</td>
                <td>{{$order->car->supply->equipment->name . ' ' . $order->car->supply->equipment->generation->model->name . ' ' . $order->car->supply->equipment->generation->model->brand->name}}</td>
                <td>{{number_format($order->price, 2, ',', ' ') . '₽'}}</td>
                <td>{{$order->customer->name}}</td>
                <td>{{$order->user->name}}</td>
                <td>{{$order->contract_signed_at}}</td>
            </tr>
        @endforeach
        <tr>
            <th></th>
            <th></th>
            <th>{{number_format($counter['income'], 2, ',', ' ') . '₽'}}</th>
            <th></th>
            <th></th>
            <th></th>
        </tr>
    </tbody>
</table>
<table>
    <thead>
        <tr>
            <th colspan="6">Поставки</th>
        </tr>
        <tr>
            <th>ID</th>
            <th>Комплектация</th>
            <th>Цена</th>
            <th>Поставщик</th>
            <th>Сотрудник</th>
            <th>Прибыл</th>
        </tr>
    </thead>
    <tbody>
        @foreach($cars as $car)
            <tr>
                <td>{{$car->supply->id}}</td>
                <td>{{$car->supply->equipment->name . ' ' . $car->supply->equipment->generation->model->name . ' ' . $car->supply->equipment->generation->model->brand->name}}</td>
                <td>{{number_format($car->supply->price, 2, ',', ' ') . '₽'}}</td>
                <td>{{$car->supply->supplier->name}}</td>
                <td>{{$car->supply->user->name}}</td>
                <td>{{$car->supply->supplied_at}}</td>
            </tr>
        @endforeach
        <tr>
            <th></th>
            <th></th>
            <th>{{number_format($counter['consumption'], 2, ',', ' ') . '₽'}}</th>
            <th></th>
            <th></th>
            <th></th>
        </tr>
    </tbody>
</table>
