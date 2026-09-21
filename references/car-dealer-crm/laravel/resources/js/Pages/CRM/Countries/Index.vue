<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {ref} from 'vue';
import ProgressBar from 'primevue/progressbar';
import Toast from 'primevue/toast';
import Toolbar from 'primevue/toolbar';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import SearchField from "../../../Components/SearchField.vue";

const props = defineProps({
    countries: Object,
});

const formDialog = ref(false);
const toast = useToast();

const form = useForm({
    name: '',
});
const openForm = () => {
    formDialog.value = true;
};

const store = () => {
    form.post(route('crm.countries.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Страна создана', life: 3000 });
            form.reset();
            formDialog.value = false;
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};

const hideDialog = () => {
    formDialog.value = false;
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
                                        <SearchField/>
                                        <Button label="Создать" icon="pi pi-plus" @click="openForm"/>
                                    </div>
                                </template>
                            </Toolbar>
                            <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Создать страну" :modal="true" class="p-fluid">
                                <template #empty>
                                    <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                </template>
                                <div class="field">
                                    <label for="name">Наименование</label>
                                    <InputText id="name" v-model.trim="form.name" v-bind:disabled="form.processing" required="true" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}" />
                                    <small v-if="form.hasErrors" class="p-error">{{form.errors.name}}</small>
                                </div>
                                <template #footer>
                                    <Button  label="Отмена" icon="pi pi-times" text @click="hideDialog"/>
                                    <Button v-bind:disabled="form.processing" label="Сохранить" icon="pi pi-check" text @click="store" />
                                    <ProgressBar class="mt-2" v-if="form.processing" mode="indeterminate" style="height: 3px"></ProgressBar>
                                </template>
                            </Dialog>
                            <Toast />
                        </template>

                        <template #content>
                                <div class="card">
                                    <DataTable paginator :rows="15" :value="countries" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                        <Column field="id" header="ID" sortable>
                                            <template #body="slotProps">
                                                <a class="text-blue-600" :href="route('crm.countries.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                            </template>
                                        </Column>
                                        <Column field="name" header="Наименование"></Column>
                                    </DataTable>
                                </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
