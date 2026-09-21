<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import ProgressBar from 'primevue/progressbar';
import Toast from 'primevue/toast';
import Textarea from 'primevue/textarea';
import InputMask from 'primevue/inputmask';

const toast = useToast();

const form = useForm({
    name: null,
    phone: null,
    email: null,
    comment: null,
});

const store = () => {
    form.transform((data) => ({
        ...data,
        phone: data.phone.replace(/[^0-9,]/g,""),
    }))
        .post(route('crm.customers.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Клиент создан', life: 3000 });
            form.reset();
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Клиенты">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            Создание клиента
                            <Toast />
                        </template>
                        <template #content>
                            <div class="space-y-8">
                                <div class="card flex flex-column md:flex-row sm:gap-3 gap-5">
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.name : ''" >
                                            <InputText v-model.trim="form.name" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}"/>
                                            <label>ФИО</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.phone : ''" >
                                            <InputMask mask="8 (999) 999-99-99" v-model.trim="form.phone" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.phone}"/>
                                            <label>Телефон</label>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup">
                                        <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.email : ''" >
                                            <InputText v-model.trim="form.email" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.email}"/>
                                            <label>Почта</label>
                                        </span>
                                    </div>
                                </div>
                                <div class="p-inputgroup">
                                    <span class="p-float-label" v-tooltip="form.hasErrors ? form.errors.comment : ''" >
                                        <Textarea v-model="form.comment" v-bind:disabled="form.processing" :class="{'p-invalid': form.hasErrors && form.errors.comment}" autoResize rows="5" cols="30" />
                                        <label>Комментарий</label>
                                    </span>
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
