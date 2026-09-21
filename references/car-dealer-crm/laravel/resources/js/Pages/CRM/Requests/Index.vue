<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Toolbar from 'primevue/toolbar';
import SearchField from "../../../Components/SearchField.vue";
import {onMounted, ref, watch} from "vue";
import Dropdown from 'primevue/dropdown';
import {debounce} from "lodash";
import {router} from "@inertiajs/vue3";
import Button from 'primevue/button';

const props = defineProps({
    carRequests: Object,
    statuses: Object,
});

const loading = ref(false);
let dropdownStatuses = ref();
const filter = ref({
    status: null,
});
onMounted(() => {
    dropdownStatuses.value = [];
    Object.entries(props.statuses).forEach(entry => {
        const [key, value] = entry;
        dropdownStatuses.value.push({option: value, value: key})
    })
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
    <AppLayout title="Заявки">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <SearchField/>
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
                                <DataTable paginator :rows="15" :value="carRequests" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.requests.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="name" header="Имя"/>
                                    <Column field="phone" header="Телефон"/>
                                    <Column field="car" header="Авто">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.cars.show', [slotProps.data.car.id])" v-text="slotProps.data.car.supply.equipment.name + ' | ' + slotProps.data.car.supply.equipment.generation.model.name + ' | '  + slotProps.data.car.supply.equipment.generation.model.brand.name" />
                                        </template>
                                    </Column>
                                    <Column field="status" header="Статус">
                                        <template #body="slotProps">
                                            <i v-if="slotProps.data.status === 'OPEN'" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Открыта: необходимо взять в работу'"></i>
                                            <i v-else-if="slotProps.data.status === 'IN_PROGRESS'" style="color: dodgerblue;" class="pi pi-phone" v-tooltip="'В работе'"></i>
                                            <i v-else-if="slotProps.data.status === 'CLOSED'" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Закрыта'"></i>
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
