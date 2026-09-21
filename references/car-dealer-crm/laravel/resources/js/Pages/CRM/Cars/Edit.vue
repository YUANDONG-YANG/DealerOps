<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import InputNumber from 'primevue/inputnumber';
import ProgressBar from 'primevue/progressbar';
import {ref} from "vue";
import Toast from 'primevue/toast';
import moment from "moment/moment";
import SelectButton from 'primevue/selectbutton';
import Calendar from 'primevue/calendar';

const props = defineProps({
    car: Object,
    statuses: Object,
});

const toast = useToast();
const statusesOptions = ref(['WAITING', 'SOLD'].includes(props.car.status) ? [{name: props.statuses[props.car.status], value: props.car.status}] : [{name: 'В наличии', value: 'PRESENT'}, {name: 'В продаже', value: 'SELLING'}]);

const form = useForm({
    price: props.car.price ? Number(props.car.price) : null,
    status: {name: props.statuses[props.car.status], value: props.car.status},
    vin: props.car.vin,
    chassis_number: props.car.chassis_number,
    body_number: props.car.body_number,
    mileage: props.car.mileage,
    color: props.car.color,
    state_number: props.car.state_number,
    pts_series: props.car.pts_series,
    pts_number: props.car.pts_number,
    pts_issued_by: props.car.pts_issued_by,
    pts_issued_at: props.car.pts_issued_at,
    sts_series: props.car.sts_series,
    sts_number: props.car.sts_number,
    sts_issued_by: props.car.sts_issued_by,
    sts_issued_at: props.car.sts_issued_at,
    release_date: props.car.release_date,
});

const update = () => {
    form.transform((data) => ({
        ...data,
        release_date: data.release_date ? moment(data.release_date).format("YYYY-MM-DD") : null,
        pts_issued_at: data.pts_issued_at ? moment(data.pts_issued_at).format("YYYY-MM-DD") : null,
        sts_issued_at: data.sts_issued_at ? moment(data.sts_issued_at).format("YYYY-MM-DD") : null,
        status: data.status?.value !== null ? data.status.value : props.car.status,
    }))
        .put(route('crm.cars.update', [props.car.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Авто обновлено', life: 3000 });
        },
        onError: (e) => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Авто">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Редактирование авто
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.price : ''">
                                            <InputNumber :max="9999999999.99" mode="currency" currency="RUB" locale="ru-RU" id="price" v-model.trim="form.price" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.price}"/>
                                            <label>Цена</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.color : ''" >
                                            <InputText v-model.trim="form.color" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.color}"/>
                                            <label>Цвет</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.mileage : ''">
                                            <InputNumber :useGrouping="false" suffix=" км" v-model.trim="form.mileage" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.mileage}" />
                                            <label>Пробег</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.release_date : ''">
                                            <Calendar v-model="form.release_date" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.release_date}" view="year" dateFormat="yy" />
                                            <label>Год выпуска</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.vin : ''" >
                                            <InputText v-model.trim="form.vin" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.vin}"/>
                                            <label>VIN</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.chassis_number : ''">
                                            <InputText v-model.trim="form.chassis_number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.chassis_number}" />
                                            <label>Номер шасси</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.body_number : ''" >
                                            <InputText v-model.trim="form.body_number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.body_number}"/>
                                            <label>Номер кузова</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.state_number : ''" >
                                            <InputText v-model.trim="form.state_number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.state_number}"/>
                                            <label>Гос. номер</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.pts_series : ''" >
                                            <InputText v-model.trim="form.pts_series" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.pts_series}"/>
                                            <label>Серия ПТС</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.pts_number : ''">
                                            <InputNumber :useGrouping="false" :max="999999" v-model.trim="form.pts_number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.pts_number}" />
                                            <label>Номер ПТС</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.pts_issued_by : ''" >
                                            <InputText v-model.trim="form.pts_issued_by" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.pts_issued_by}"/>
                                            <label>ПТС выдан</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.pts_issued_at : ''">
                                            <Calendar v-model="form.pts_issued_at" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.pts_issued_at}" dateFormat="dd.mm.yy" />
                                            <label>Дата выдачи ПТС</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.sts_series : ''" >
                                            <InputText v-model.trim="form.sts_series" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.sts_series}"/>
                                            <label>Серия СТС</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.sts_number : ''">
                                            <InputNumber :useGrouping="false" :max="999999" v-model.trim="form.sts_number" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.sts_number}" />
                                            <label>Номер СТС</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.sts_issued_by : ''" >
                                            <InputText v-model.trim="form.sts_issued_by" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.sts_issued_by}"/>
                                            <label>СТС выдан</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.sts_issued_at : ''">
                                            <Calendar v-model="form.sts_issued_at" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.sts_issued_at}" dateFormat="dd.mm.yy" />
                                            <label>Дата выдачи СТС</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div v-if="!['WAITING', 'SOLD'].includes(props.car.status)" class="flex">
                                        <SelectButton v-bind:disabled="form.processing" v-model="form.status" :options="statusesOptions" optionLabel="name" aria-labelledby="basic" />
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
