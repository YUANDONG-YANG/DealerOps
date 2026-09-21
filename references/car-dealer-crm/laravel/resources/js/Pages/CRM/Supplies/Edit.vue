<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import ProgressBar from 'primevue/progressbar';
import Toast from 'primevue/toast';
import moment from "moment/moment";
import Checkbox from '@/Components/Checkbox.vue';

const props = defineProps({
    supply: Object,
    equipments: Object,
    suppliers: Object,
});

const toast = useToast();

const form = useForm({
    price: props.supply.price === null ? null : Number(props.supply.price),
    equipment_id: props.supply.equipment,
    supplier_id: props.supply.supplier,
    supplied: props.supply.supplied_at !== null
});

const update = () => {
    form.transform((data) => ({
        ...data,
        equipment_id: data.equipment_id ? data.equipment_id.id : null,
        supplier_id: data.supplier_id ? data.supplier_id.id : null,
        supplied_at: data.supplied && props.supply.supplied_at === null ? moment().format('YYYY-MM-DD H:m:s') : props.supply.supplied_at
    }))
        .put(route('crm.supplies.update', [props.supply.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Поставка обновлена', life: 3000 });
        },
        onError: (e) => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Поставки">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Редактирование поставки
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.equipment_id : ''">
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.equipment_id}" v-model="form.equipment_id" :options="equipments" filter :filterFields="['name', 'generation.model.name', 'generation.model.brand.name']">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{slotProps.value.name}} | {{slotProps.value.generation.model.name}} | {{slotProps.value.generation.model.brand.name}}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{slotProps.option.name}} | {{slotProps.option.generation.model.name}} | {{slotProps.option.generation.model.brand.name}}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Комплектация</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.supplier_id : ''" >
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.supplier_id}" v-model="form.supplier_id" :options="[{id: null, name: ' - '}, ...props.suppliers]" filter optionLabel="name">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{ slotProps.value.name }}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{ slotProps.option.name }}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Поставщик</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.price : ''">
                                            <InputNumber :max="9999999999.99" mode="currency" currency="RUB" locale="ru-RU" id="price" v-model.trim="form.price" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.price}" />
                                            <label>Цена</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="block mt-4">
                                    <label class="flex items-center">
                                        <Checkbox v-model:checked="form.supplied" :disabled="props.supply.supplied_at !== null" name="supplied" />
                                        <span class="ml-2 text-sm text-gray-600">Прибыл</span>
                                    </label>
                                </div>
                                <div class="card flex justify-end mx-4">
                                    <Button v-bind:disabled="form.processing" @click="update" label="Обновить" />
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
