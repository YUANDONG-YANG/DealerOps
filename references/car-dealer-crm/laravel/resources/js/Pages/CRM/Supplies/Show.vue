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
    supply: Object,
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
    router.visit(route('crm.supplies.destroy', [props.supply.id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Поставка удалена', life: 3000 });
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Поставки">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <Link :href="route('crm.supplies.edit', [supply.id])">
                                            <Button label="Редактировать" icon="pi pi-pencil"/>
                                        </Link>
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
                                                <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    Основное
                                                    <i v-if="supply.supplied_at" style="color: green;" class="pi pi-check-circle" v-tooltip="'Автомобиль прибыл'"></i>
                                                    <i v-else-if="supply.supplier_id" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Автомобиль поставляется'"></i>
                                                    <i v-else class="pi pi-exclamation-triangle" style="color: orange;" v-tooltip="'Поставка не согласована с поставщиком'" ></i>
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Наименование
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{supply.equipment.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Поставщик
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{supply.supplier?.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Сотрудник
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{supply.user.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Цена
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{supply.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(supply.price) : ''}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Прибыл в
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{supply.supplied_at}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Авто
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600" :href="route('crm.cars.show', [supply.car.id])" v-text="supply.car.id" />
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
