<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import {Link} from "@inertiajs/vue3";
import Toast from 'primevue/toast';
import SearchField from "../../../Components/SearchField.vue";

const props = defineProps({
    customers: Object,
});
</script>

<template>
    <AppLayout title="Клиенты">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #content>
                            <div class="card mb-5 bg-gray-50 border-gray-200 border rounded p-4">
                                <div class="flex sm:flex-row flex-col justify-between space-y-2 sm:space-y-0">
                                    <div class="sm:space-x-2 flex sm:flex-row flex-col space-y-2 sm:space-y-0">
                                        <SearchField/>
                                        <Link :href="route('crm.customers.create')">
                                            <Button label="Создать" icon="pi pi-plus"/>
                                        </Link>
                                        <a :href="route('crm.customers.download')">
                                            <Button label="Скачать клиентов" icon="pi pi-file-excel"/>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="customers" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.customers.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="name" header="ФИО"></Column>
                                    <Column field="phone" header="Телефон"></Column>
                                    <Column field="email" header="Почта"></Column>
                                </DataTable>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
