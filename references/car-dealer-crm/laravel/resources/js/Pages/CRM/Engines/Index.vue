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
    engines: Object,
    fuels: Object,
});
</script>

<template>
    <AppLayout title="Двигатели">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <SearchField/>
                                        <Link :href="route('crm.engines.create')">
                                            <Button label="Создать" icon="pi pi-plus"/>
                                        </Link>
                                        <Toast />
                                    </div>
                                </template>
                            </Toolbar>
                        </template>
                        <template #content>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="engines" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.engines.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="name" header="Наименование"></Column>
                                    <Column field="fuel" header="Топливо">
                                        <template #body="slotProps">
                                            {{fuels[slotProps.data.fuel]}}
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
