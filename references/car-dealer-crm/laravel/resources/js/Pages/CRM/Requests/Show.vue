<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import {Link, router, useForm} from "@inertiajs/vue3";
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from 'primevue/toast';

const props = defineProps({
    carRequest: Object,
    statuses: Object,
});

const toast = useToast();
const confirm = useConfirm();

const form = useForm({
    status: getNextStatus(props.carRequest.status),
});

function getNextStatus(status) {
    let index = props.statuses.indexOf(status);
    return index + 1 >= props.statuses.length || index === -1 ? null : props.statuses[index+1]
}

const nextStatus = () => {
    form.put(route('crm.requests.status.next', [props.carRequest.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Заявка обновлена', life: 3000 });
            form.status = getNextStatus(props.carRequest.status);
        },
        onError: (e) => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 10000 });
        },
    });
};

const confirmDelete = () => {
    confirm.require({
        message: 'Вы действительно хотите удалить запись?',
        header: 'Подтвердите удаление',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: () => {
            destroy()
        },
    });
};

const destroy = () => {
    router.visit(route('crm.requests.destroy', [props.carRequest.id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Заявка удалена', life: 3000 });
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Заявки">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <Link :href="route('crm.requests.edit', [carRequest.id])">
                                            <Button label="Редактировать" icon="pi pi-pencil"/>
                                        </Link>
                                        <Button v-if="form.status" @click="nextStatus()" :label="form.status === 'IN_PROGRESS' ? 'Взять в работу' : 'Закрыть'" icon="pi pi-caret-right"/>
                                        <Button @click="confirmDelete()" label="Удалить" severity="danger" icon="pi pi-trash"/>
                                        <ConfirmDialog></ConfirmDialog>
                                        <Toast />
                                    </div>
                                </template>
                            </Toolbar>
                        </template>
                        <template #content>
                            <div class="card flex flex-col">
                                <div class="relative overflow-x-auto">
                                    <table class="w-full text-sm text-left">
                                        <tbody>
                                        <tr class="border-b">
                                            <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap space-x-1">
                                                Основное
                                                <i v-if="carRequest.status === 'OPEN'" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Открыта: необходимо взять в работу'"></i>
                                                <i v-else-if="carRequest.status === 'IN_PROGRESS'" style="color: dodgerblue;" class="pi pi-phone" v-tooltip="'В работе'"></i>
                                                <i v-else-if="carRequest.status === 'CLOSED'" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Закрыта'"></i>
                                            </th>
                                        </tr>
                                        <tr class="border-b">
                                            <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                Имя
                                            </th>
                                            <td class="px-6 py-3">
                                                {{carRequest.name}}
                                            </td>
                                        </tr>
                                        <tr class="border-b">
                                            <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                Телефон
                                            </th>
                                            <td class="px-6 py-3">
                                                {{carRequest.phone}}
                                            </td>
                                        </tr>
                                        <tr class="border-b">
                                            <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                Авто
                                            </th>
                                            <td class="px-6 py-3">
                                                <a class="text-blue-600" :href="route('crm.cars.show', [carRequest.car.id])" v-text="carRequest.car.state_number + ' | ' + carRequest.car.supply.equipment.name + ' | ' + carRequest.car.supply.equipment.generation.model.name + ' | ' + carRequest.car.supply.equipment.generation.model.brand.name" />
                                            </td>
                                        </tr>
                                        <tr class="border-b">
                                            <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                Сотрудник
                                            </th>
                                            <td class="px-6 py-3">
                                                {{carRequest.user?.name}}
                                            </td>
                                        </tr>
                                        <tr class="border-b">
                                            <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap align-top">
                                                Комментарий
                                            </th>
                                            <td class="px-6 py-3 whitespace-pre-wrap">
                                                {{carRequest.comment}}
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
