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
import Checkbox from 'primevue/checkbox';
import Calendar from 'primevue/calendar';

const props = defineProps({
    models: Object,
});

const toast = useToast();

const form = useForm({
    from: null,
    to: null,
    number: null,
    restyling: null,
    model_id: null,
});

const store = () => {
    form.transform((data) => ({
        ...data,
        model_id: data.model_id ? data.model_id.id : null,
        from: data.from ? moment(data.from).format("YYYY-MM-DD") : null,
        to: data.to ? moment(data.to).format("YYYY-MM-DD") : null,
        restyling: data.restyling ? !!data.restyling[0] : false,
    }))
        .post(route('crm.generations.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Поколение создано', life: 3000 });
            form.reset();
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Поколения">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Создание поколения
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.model_id : ''">
                                            <Dropdown v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.model_id}" v-model="form.model_id" :options="models" filter optionLabel="name" :filterFields="['name', 'brand.name']" :virtualScrollerOptions="{ itemSize: 50 }">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{ slotProps.value.name }}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{ slotProps.option.name + ' | ' + slotProps.option.brand.name }}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <label>Модель</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.number : ''">
                                            <InputNumber :useGrouping="false" v-model.trim="form.number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.number}" />
                                            <label>Номер поколения</label>
                                        </span>
                                    </div>
                                    <span class="flex items-center" v-tooltip="form.hasErrors ? form.errors.restyling : ''">
                                        <Checkbox v-model="form.restyling" :value="true" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.restyling}" />
                                        <label class="ml-2">Рестайлинг</label>
                                    </span>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.from : ''">
                                            <Calendar v-model="form.from" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.from}" view="year" dateFormat="yy" />
                                            <label>С</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.to : ''">
                                            <Calendar v-model="form.to" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.to}" view="year" dateFormat="yy" showButtonBar />
                                            <label>По</label>
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
