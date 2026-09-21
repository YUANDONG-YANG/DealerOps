<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {ref} from 'vue';
import Toolbar from 'primevue/toolbar';
import {Link, router} from "@inertiajs/vue3";
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from 'primevue/toast';

const props = defineProps({
    order: Object,
});

const submitted = ref(false);
const confirm = useConfirm();
const toast = useToast();

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
    router.visit(route('crm.orders.destroy', [props.order.id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Заказ удален', life: 3000 });
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Заказы">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-y-2 sm:space-x-2 flex-col">
                                        <Link :href="route('crm.orders.edit', [order.id])">
                                            <Button label="Редактировать" icon="pi pi-pencil"/>
                                        </Link>
                                        <a :href="route('crm.orders.download.contract', [order.id])">
                                            <Button label="Сформировать договор" icon="pi pi-file-o" class="mt-2"/>
                                        </a>
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
                                                    <i v-if="order.contract_signed_at === null" style="color: dodgerblue;" class="pi pi-file" v-tooltip="'Необходимо подписать договор'"></i>
                                                    <i v-if="order.contract_signed_at !== null && order.car_transferred_at === null" style="color: dodgerblue;" class="pi pi-car" v-tooltip="'Необходимо передать авто клиенту'"></i>
                                                    <i v-if="order.contract_signed_at !== null && order.payment_received_at === null" style="color: dodgerblue;" class="pi pi-wallet" v-tooltip="'Необходимо принять оплату полностью'"></i>
                                                    <i v-if="order.car_transferred_at !== null && order.payment_received_at !== null" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Сделка завершена'"></i>
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Авто
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600" :href="route('crm.cars.show', [order.car.id])" v-text="order.car.state_number + ' | ' + order.car.supply.equipment.name + ' | ' + order.car.supply.equipment.generation.model.name + ' | ' + order.car.supply.equipment.generation.model.brand.name" />
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Клиент
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600" :href="route('crm.customers.show', [order.customer.id])" v-text="order.customer.name" />
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Сотрудник
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{order.user.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Создано в
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{order.created_at}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Договор подписан в
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{order.contract_signed_at}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Авто передано в
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{order.car_transferred_at}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Оплата принята полностью в
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{order.payment_received_at}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap align-top">
                                                    Комментарий
                                                </th>
                                                <td class="px-6 py-3 whitespace-pre-wrap">
                                                    {{order.comment}}
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
