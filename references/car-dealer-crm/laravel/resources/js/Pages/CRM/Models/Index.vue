<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import {useForm} from "@inertiajs/vue3";
import Toast from 'primevue/toast';
import {ref} from "vue";
import {useToast} from "primevue/usetoast";
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import SearchField from "../../../Components/SearchField.vue";

const props = defineProps({
    models: Object,
    brands: Object,
});

const formDialog = ref(false);
const toast = useToast();

const form = useForm({
    name: null,
    brand_id: null
});
const openForm = () => {
    formDialog.value = true;
};

const store = () => {
    form.transform((data) => ({
        ...data,
        brand_id: data.brand_id ? data.brand_id.id : null,
    }))
        .post(route('crm.models.store'), {
            onSuccess: () => {
                toast.add({ severity: 'success', summary: 'Успешно', detail: 'Модель создана', life: 3000 });
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
    <AppLayout title="Модели">
        <template #header>
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                Модели
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
                            <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Создать модель" :modal="true" class="p-fluid">
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
                                    <Button v-bind:disabled="form.processing" label="Сохранить" icon="pi pi-check" text @click="store" />
                                    <ProgressBar class="mt-2" v-if="form.processing" mode="indeterminate" style="height: 3px"></ProgressBar>
                                </template>
                            </Dialog>
                            <Toast />
                        </template>
                        <template #content>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="models" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.models.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="name" header="Наименование"></Column>
                                    <Column field="brand" header="Марка">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.brands.show', [slotProps.data.brand.id])" v-text="slotProps.data.brand.name" />
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
