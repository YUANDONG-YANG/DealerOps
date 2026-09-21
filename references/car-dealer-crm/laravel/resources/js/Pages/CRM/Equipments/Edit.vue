<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import ProgressBar from 'primevue/progressbar';
import {onMounted, ref} from "vue";
import Toast from 'primevue/toast';
import moment from "moment/moment";

const props = defineProps({
    equipment: Object,
    generations: Object,
    engines: Object,
    types: Object,
    bodies: Object,
});

const toast = useToast();
let dropdownBodies = ref();
let dropdownTypes = ref();

const form = useForm({
    name: props.equipment.name,
    type: props.equipment.type,
    max_speed: props.equipment.max_speed,
    acceleration_time: props.equipment.acceleration_time,
    doors_count: props.equipment.doors_count,
    seats_count: props.equipment.seats_count,
    length: props.equipment.length,
    width: props.equipment.width,
    height: props.equipment.height,
    fuel_consumption_90: props.equipment.fuel_consumption_90,
    fuel_consumption_120: props.equipment.fuel_consumption_120,
    fuel_consumption_city: props.equipment.fuel_consumption_city,
    body: props.equipment.body,
    generation_id: props.equipment.generation,
    tires_name: props.equipment.tires_name,
    engine_id: props.equipment.engine
});

onMounted(() => {
    dropdownBodies.value = [];
    dropdownTypes.value = [];
    Object.entries(props.bodies).forEach(entry => {
        const [key, value] = entry;
        dropdownBodies.value.push({option: value, value: key})
    })
    Object.entries(props.types).forEach(entry => {
        const [key, value] = entry;
        dropdownTypes.value.push({option: value, value: key})
    })
});

const update = () => {
    form.transform((data) => ({
        ...data,
        generation_id: data.generation_id ? data.generation_id.id : null,
        engine_id: data.engine_id ? data.engine_id.id : null,
    }))
        .put(route('crm.equipments.update', [props.equipment.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Комплектация обновлена', life: 3000 });
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Комплектации">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Редактирование комплектации
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-10">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.name : ''" >
                                            <InputText v-model.trim="form.name" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}"/>
                                            <label>Наименование</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.generation_id : ''">
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.generation_id}" v-model="form.generation_id" :options="generations" filter :filterFields="['number', 'from', 'to', 'model.name', 'model.brand.name']">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{slotProps.value.number}} поколение{{slotProps.value.restyling ? ', рестайлинг' : ''}}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{slotProps.option.number}} поколение{{slotProps.option.restyling ? ', рестайлинг' : ''}} {{moment(slotProps.option.from).format('YYYY')}}-{{slotProps.option.to ? moment(slotProps.option.to).format('YYYY') : 'н.в.'}} | {{slotProps.option.model.name}} | {{slotProps.option.model.brand.name}}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Поколение</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.type : ''">
                                            <Dropdown id="type" v-model="form.type" :options="dropdownTypes" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.type}" optionLabel="option" optionValue="value" class="w-full md:w-14rem" />
                                            <label>Тип</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.body : ''">
                                            <Dropdown id="type" v-model="form.body" :options="dropdownBodies" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.body}" optionLabel="option" optionValue="value" class="w-full md:w-14rem" />
                                            <label>Кузов</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.engine_id : ''">
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.engine_id}" v-model="form.engine_id" :options="engines" filter optionLabel="name">
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
                                            <label>Двигатель</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.doors_count : ''">
                                            <InputNumber :useGrouping="false" id="doors_count" v-model.trim="form.doors_count" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.doors_count}" />
                                            <label>Количество дверей</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.seats_count : ''">
                                            <InputNumber :useGrouping="false" id="seats_count" v-model.trim="form.seats_count" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.seats_count}" />
                                            <label>Количество сидений</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.length : ''">
                                            <InputNumber :useGrouping="false" suffix=" мм" id="length" v-model.trim="form.length" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.length}" />
                                            <label>Длина</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.width : ''">
                                            <InputNumber :useGrouping="false" suffix=" мм" id="length" v-model.trim="form.width" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.width}" />
                                            <label>Ширина</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.height : ''">
                                            <InputNumber :useGrouping="false" suffix=" мм" id="length" v-model.trim="form.height" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.height}" />
                                            <label>Высота</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.max_speed : ''">
                                            <InputNumber id="max_speed" :useGrouping="false" suffix=" км/ч" v-model.trim="form.max_speed" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.max_speed}" />
                                            <label>Максимальная скорость</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.acceleration_time : ''">
                                            <InputNumber :useGrouping="false" suffix=" с" :minFractionDigits="1" id="acceleration_time" v-model.trim="form.acceleration_time" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.acceleration_time}" />
                                            <label>Время разгона до 100км/ч</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.tires_name : ''" >
                                            <InputText v-model.trim="form.tires_name" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.tires_name}"/>
                                            <label>Наименование шин</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.fuel_consumption_90 : ''">
                                            <InputNumber :useGrouping="false" suffix=" л/100км" :minFractionDigits="1" id="fuel_consumption_90" v-model.trim="form.fuel_consumption_90" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.fuel_consumption_90}" />
                                            <label>Расход топлива при скорости 90 км/ч</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.fuel_consumption_120 : ''">
                                            <InputNumber :useGrouping="false" suffix=" л/100км" :minFractionDigits="1" id="fuel_consumption_120" v-model.trim="form.fuel_consumption_120" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.fuel_consumption_120}" />
                                            <label>Расход топлива при скорости 120 км/ч</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.fuel_consumption_city : ''">
                                            <InputNumber :useGrouping="false" suffix=" л/100км" :minFractionDigits="1" id="fuel_consumption_city" v-model.trim="form.fuel_consumption_city" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.fuel_consumption_city}" />
                                            <label>Расход топлива при городском цикле</label>
                                        </span>
                                    </div>
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
