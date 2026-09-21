<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {ref} from 'vue';
import ProgressBar from 'primevue/progressbar';
import Toolbar from 'primevue/toolbar';
import {router, useForm} from "@inertiajs/vue3";
import ConfirmDialog from 'primevue/confirmdialog';
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import Toast from 'primevue/toast';

const props = defineProps({
    country: Object,
});

const formDialog = ref(false);
const submitted = ref(false);
const confirm = useConfirm();
const toast = useToast();

const form = useForm({
    _method: 'PUT',
    name: props.country.name,
});

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

const openForm = () => {
    submitted.value = false;
    formDialog.value = true;
};

const hideDialog = () => {
    formDialog.value = false;
    submitted.value = false;
};

const update = () => {
    form.put(route('crm.countries.update', [props.country.id]), {
        onSuccess: () => {
            submitted.value = true;
            formDialog.value = false;
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Страна обновлена', life: 3000 });
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};

const destroy = () => {
    router.visit(route('crm.countries.destroy', [props.country.id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Страна удалена', life: 3000 });
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Страны">
        <template #header>
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                Страны
            </h2>
        </template>
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <Button label="Редактировать" icon="pi pi-pencil" @click="openForm"/>
                                        <Button @click="confirmDelete()" label="Удалить" severity="danger" icon="pi pi-trash"/>
                                        <ConfirmDialog></ConfirmDialog>
                                    </div>
                                </template>
                            </Toolbar>
                            <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Редактирование страны" :modal="true" class="p-fluid">
                                <div class="field">
                                    <label for="name">Наименование</label>
                                    <InputText id="name" v-model.trim="form.name" v-bind:disabled="form.processing" required="true" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}" />
                                    <small v-if="form.hasErrors" class="p-error">{{form.errors.name}}</small>
                                </div>
                                <template #footer>
                                    <Button  label="Отмена" icon="pi pi-times" text @click="hideDialog"/>
                                    <Button v-bind:disabled="form.processing" label="Сохранить" icon="pi pi-check" text @click="update" />
                                    <ProgressBar class="mt-2" v-if="form.processing" mode="indeterminate" style="height: 3px"></ProgressBar>
                                </template>
                            </Dialog>
                            <Toast />
                        </template>

                        <template #content>
                            <div class="card flex flex-col space-y-4">
                                <div class="mx-1">
                                    <label class="font-bold">Наименование</label>
                                    <p class="text-gray-600">{{country.name}}</p>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
