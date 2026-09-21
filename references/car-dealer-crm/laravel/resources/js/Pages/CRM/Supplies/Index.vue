<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import {Link, router} from "@inertiajs/vue3";
import Toast from 'primevue/toast';
import SearchField from "../../../Components/SearchField.vue";
import {ref, watch} from "vue";
import {debounce} from "lodash";
import Dropdown from 'primevue/dropdown';

const props = defineProps({
    supplies: Object,
});
const loading = ref(false);
let dropdownStatuses = ref([
    {option: 'Согласование', value: 'OPEN'},
    {option: 'Ожидание', value: 'WAITING'},
    {option: 'Завершено', value: 'DONE'},
]);
const filter = ref({
    status: null,
});

function getUrlParams() {
    const result = {}
    for(const [key, value] of new URLSearchParams(window.location.search)) {
        result[key] = value;
    }
    return result;
}
const initSearch = debounce(() => {
    loading.value = true;
    let params = getUrlParams();
    router.get(
        route(route().current()),
        {
            ...params,
            status: filter.value.status,
        },
        {
            preserveState: true,
            onSuccess: params => {
                loading.value = false;
            }
        },
    );
}, 500)

watch([filter.value], () =>
    initSearch()
)
</script>

<template>
    <AppLayout title="Поставки">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <SearchField/>
                                        <Link :href="route('crm.supplies.create')">
                                            <Button label="Создать" icon="pi pi-plus"/>
                                        </Link>
                                        <Toast />
                                    </div>
                                </template>
                                <template #end>
                                    <div class="p-inputgroup flex-1">
                                        <Dropdown :disabled="loading" v-model="filter.status" :options="dropdownStatuses" optionLabel="option" optionValue="value" placeholder="Статус"/>
                                        <Button v-if="filter.status" icon="pi pi-times" severity="danger" @click="filter.status = null"/>
                                    </div>
                                </template>
                            </Toolbar>
                        </template>
                        <template #content>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="supplies" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.supplies.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="model_id" header="Комплектация">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.equipments.show', [slotProps.data.equipment_id])" v-text="slotProps.data.equipment.name" />
                                        </template>
                                    </Column>
                                    <Column field="supplier_id" header="Поставщик">
                                        <template #body="slotProps">
                                            <a v-if="slotProps.data.supplier_id" class="text-blue-600" :href="route('crm.suppliers.show', [slotProps.data.supplier_id])" v-text="slotProps.data.supplier.name" />
                                        </template>
                                    </Column>
                                    <Column field="user_id" header="Сотрудник">
                                        <template #body="slotProps">
                                            {{slotProps.data.user.name}}
                                        </template>
                                    </Column>
                                    <Column field="user_id" header="Цена">
                                        <template #body="slotProps">
                                            {{slotProps.data.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(slotProps.data.price) : ''}}
                                        </template>
                                    </Column>
                                    <Column field="status" header="Статус">
                                        <template #body="slotProps">
                                            <i v-if="slotProps.data.supplied_at" style="color: green;" class="pi pi-check-circle" v-tooltip="'Автомобиль прибыл'"></i>
                                            <i v-else-if="slotProps.data.supplier_id" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Автомобиль поставляется'"></i>
                                            <i v-else class="pi pi-exclamation-triangle" style="color: orange;" v-tooltip="'Поставка не согласована с поставщиком'" ></i>
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
