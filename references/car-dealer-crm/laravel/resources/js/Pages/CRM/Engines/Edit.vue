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

const props = defineProps({
    engine: Object,
    fuels: Object,
});

const toast = useToast();
let dropdownFuels = ref();

const form = useForm({
    name: props.engine.name,
    capacity: props.engine.capacity,
    cylinders_count: props.engine.cylinders_count,
    max_power: props.engine.max_power,
    max_torque: props.engine.max_torque,
    fuel: props.engine.fuel,
});

onMounted(() => {
    dropdownFuels.value = [];
    Object.entries(props.fuels).forEach(entry => {
        const [key, value] = entry;
        dropdownFuels.value.push({option: value, value: key})
    })
});

const update = () => {
    form.put(route('crm.engines.update', [props.engine.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Двигатель обновлен', life: 3000 });
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Двигатели">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Редактирование двигателя
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.name : ''" >
                                            <InputText v-model.trim="form.name" v-bind:disabled="form.processing" required="true" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}"/>
                                            <label>Наименование</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.fuel : ''">
                                            <Dropdown v-model="form.fuel" :options="dropdownFuels" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.fuel}" optionLabel="option" optionValue="value" class="w-full md:w-14rem" />
                                            <label>Используемый вид топлива</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.cylinders_count : ''">
                                            <InputNumber :useGrouping="false" v-model.trim="form.cylinders_count" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.cylinders_count}" />
                                            <label>Количество цилиндров</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.capacity : ''">
                                            <InputNumber :useGrouping="false" suffix=" см3" v-model.trim="form.capacity" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.capacity}" />
                                            <label>Рабочий объем</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.max_power : ''">
                                            <InputNumber :useGrouping="false" suffix=" л.с." v-model.trim="form.max_power" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.max_power}" />
                                            <label>Максимальная мощность</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.max_torque : ''">
                                            <InputNumber :useGrouping="false" suffix=" Нм" v-model.trim="form.max_torque" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.max_torque}" />
                                            <label>Максимальный крутящий момент</label>
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
