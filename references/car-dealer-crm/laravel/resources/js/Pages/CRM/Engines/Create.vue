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
    fuels: Object,
});

const toast = useToast();
let dropdownFuels = ref();

const form = useForm({
    name: null,
    capacity: null,
    cylinders_count: null,
    max_power: null,
    max_torque: null,
    fuel: null,
});

onMounted(() => {
    dropdownFuels.value = [];
    Object.entries(props.fuels).forEach(entry => {
        const [key, value] = entry;
        dropdownFuels.value.push({option: value, value: key})
    })
});

const store = () => {
    form.post(route('crm.engines.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Двигатель создан', life: 3000 });
            form.reset();
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
                            Создание двигателя
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
                                            <Dropdown id="type" v-model="form.fuel" :options="dropdownFuels" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.fuel}" optionLabel="option" optionValue="value" class="w-full md:w-14rem" />
                                            <label>Используемый вид топлива</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.cylinders_count : ''">
                                            <InputNumber id="cylinders_count" :useGrouping="false" v-model.trim="form.cylinders_count" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.cylinders_count}" />
                                            <label>Количество цилиндров</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.capacity : ''">
                                            <InputNumber id="engine_capacity" :useGrouping="false" suffix=" см3" v-model.trim="form.capacity" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.capacity}" />
                                            <label>Рабочий объем</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.max_power : ''">
                                            <InputNumber id="engine_power" :useGrouping="false" suffix=" л.с." v-model.trim="form.max_power" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.max_power}" />
                                            <label>Максимальная мощность</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.max_torque : ''">
                                            <InputNumber id="max_torque" :useGrouping="false" suffix=" Нм" v-model.trim="form.max_torque" v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.max_torque}" />
                                            <label>Максимальный крутящий момент</label>
                                        </span>
                                    </div>
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
