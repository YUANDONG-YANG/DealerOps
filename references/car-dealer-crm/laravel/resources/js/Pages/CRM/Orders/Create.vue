<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import moment from "moment";
import ProgressBar from 'primevue/progressbar';
import Toast from 'primevue/toast';
import Textarea from 'primevue/textarea';
import Checkbox from '@/Components/Checkbox.vue';

const props = defineProps({
    cars: Object,
    customers: Object,
});

const toast = useToast();

const form = useForm({
    price: null,
    car_id: null,
    customer_id: null,
    contract_signed_at: null,
    car_transferred_at: null,
    payment_received_at: null,
    comment: null,
});

const store = () => {
    form.transform((data) => ({
        ...data,
        car_id: data.car_id ? data.car_id.id : null,
        customer_id: data.customer_id ? data.customer_id.id : null,
        contract_signed_at: data.contract_signed_at ? moment().format('YYYY-MM-DD H:m:s') : null,
        car_transferred_at: data.car_transferred_at ? moment().format('YYYY-MM-DD H:m:s') : null,
        payment_received_at: data.payment_received_at ? moment().format('YYYY-MM-DD H:m:s') : null
    }))
        .post(route('crm.orders.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Заказ создан', life: 3000 });
            form.reset();
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Заказы">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Создание заказа
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.car_id : ''">
                                            <Dropdown @change="form.price = Number(form.car_id.price)" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.car_id}" v-model="form.car_id" :options="cars" filter :filterFields="['id', 'vin', 'state_number', 'supply.equipment.name', 'supply.equipment.generation.model.name', 'supply.equipment.generation.model.brand.name']">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{slotProps.value.supply.equipment.name}} | {{slotProps.value.supply.equipment.generation.model.name}} | {{slotProps.value.supply.equipment.generation.model.brand.name}}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{slotProps.option.state_number}} | {{slotProps.option.supply.equipment.name}} | {{slotProps.option.supply.equipment.generation.model.name}} | {{slotProps.option.supply.equipment.generation.model.brand.name}}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Авто</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.customer_id : ''">
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.customer_id}" v-model="form.customer_id" :options="customers" filter :filterFields="['name', 'phone']">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{slotProps.value.name}}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{slotProps.option.name}} | {{slotProps.option.phone}}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Клиент</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.price : ''">
                                            <InputNumber :max="9999999999.99" mode="currency" currency="RUB" locale="ru-RU" id="price" v-model.trim="form.price" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.price}"/>
                                            <label>Цена</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="p-inputgroup">
                                    <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.comment : ''" >
                                        <Textarea v-model="form.comment" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.comment}" autoResize rows="5" cols="30" />
                                        <label>Комментарий</label>
                                    </span>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <label class="flex items-center">
                                        <Checkbox v-model:checked="form.contract_signed_at" name="contract_signed_at" />
                                        <span class="ml-2 text-sm text-gray-600">Договор подписан</span>
                                    </label>
                                    <label class="flex items-center">
                                        <Checkbox v-model:checked="form.car_transferred_at" name="car_transferred_at" />
                                        <span class="ml-2 text-sm text-gray-600">Авто передано</span>
                                    </label>
                                    <label class="flex items-center">
                                        <Checkbox v-model:checked="form.payment_received_at" name="payment_received_at" />
                                        <span class="ml-2 text-sm text-gray-600">Оплата принята полностью</span>
                                    </label>
                                </div>
                                <div class="card flex justify-end mx-4">
                                    <Button v-bind:disabled="form.processing" @click="store" label="Создать" />
                                </div>
                            </div>
                            <ProgressBar v-if="form.processing" class="mt-8" mode="indeterminate" style="height: 3px"></ProgressBar>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
