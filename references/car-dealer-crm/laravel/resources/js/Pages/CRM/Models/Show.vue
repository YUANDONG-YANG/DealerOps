<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {ref} from 'vue';
import Toolbar from 'primevue/toolbar';
import {router, useForm} from "@inertiajs/vue3";
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from 'primevue/toast';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';

const props = defineProps({
    model: Object,
    brands: Object,
});

const formDialog = ref(false);
const confirm = useConfirm();
const toast = useToast();

const form = useForm({
    _method: 'PUT',
    name: props.model.name,
    brand_id: props.model.brand,
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
    formDialog.value = true;
};

const hideDialog = () => {
    formDialog.value = false;
};

const update = () => {
    form.transform((data) => ({
        ...data,
        brand_id: data.brand_id ? data.brand_id.id : null,
    }))
        .put(route('crm.models.update', [props.model.id]), {
            onSuccess: () => {
                formDialog.value = false;
                toast.add({ severity: 'success', summary: 'Успешно', detail: 'Модель обновлена', life: 3000 });
            },
            onError: () => {
                toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
            },
        });
};

const destroy = () => {
    router.visit(route('crm.models.destroy', [props.model.id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Модель удалена', life: 3000 });
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Модели">
        <template #header>
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                Модели
            </h2>
        </template>
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
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
                            <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Редактирование модели" :modal="true" class="p-fluid">
                                <div class="space-y-2">
                                    <div class="field">
                                        <label for="name">Наименование</label>
                                        <InputText id="name" v-model.trim="form.name" v-bind:disabled="form.processing" required="true" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}" />
                                        <small v-if="form.hasErrors" class="p-error">{{form.errors.name}}</small>
                                    </div>
                                    <div class="field">
                                        <label>Марка</label>
                                        <Dropdown v-bind:disabled="form.processing" required="true" :class="{'p-invalid': form.hasErrors && form.errors.brand_id}" v-model="form.brand_id" :options="brands" filter optionLabel="name">
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
                                        <small v-if="form.hasErrors" class="p-error">{{form.errors.brand_id}}</small>
                                    </div>
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
                            <div class="card flex flex-col">
                                <div class="relative overflow-x-auto">
                                    <table class="w-full text-sm text-left">
                                        <tbody>
                                            <tr class="border-b">
                                                <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    Основное
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Наименование
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{model.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Марка
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600" :href="route('crm.brands.show', [model.brand.id])" v-text="model.brand.name" />
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
