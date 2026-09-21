<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import moment from "moment";
import SearchField from "../../../Components/SearchField.vue";
import Dropdown from 'primevue/dropdown';
import {onMounted, ref, watch} from "vue";
import {debounce} from "lodash";
import {router} from "@inertiajs/vue3";
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

const props = defineProps({
    cars: Object,
    statuses: Object,
    brands: Object,
    models: Object,
    generations: Object,
});

const loading = ref(false);
let dropdownStatuses = ref();
const filter = ref({
    brand: null,
    model: null,
    generaton: null,
    yearFrom: null,
    yearTo: null,
    priceFrom: null,
    priceTo: null,
    status: null
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
            brand: filter.value.brand?.id,
            model: filter.value.model?.id,
            generation: filter.value.generation?.id,
            yearFrom: filter.value.yearFrom ? moment(filter.value.yearFrom).format("YYYY-MM-DD") : null,
            yearTo: filter.value.yearTo ? moment(filter.value.yearTo).format("YYYY-MM-DD") : null,
            priceFrom: filter.value.priceFrom,
            priceTo: filter.value.priceTo,
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
    <AppLayout title="Авто">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #content>
                            <div class="card mb-5 bg-gray-50 border-gray-200 border rounded p-4">
                                <div class="space-y-3">
                                    <SearchField class="w-full"/>
                                    <div class="card flex flex-column md:flex-row gap-3">
                                        <div class="p-inputgroup flex-1">
                                            <Dropdown :disabled="loading" v-model="filter.brand" :options="brands" filter optionLabel="name" placeholder="Марка" @change="filter.model = null; filter.generation = null">
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
                                            <Button v-if="filter.brand" icon="pi pi-times" severity="danger" @click="filter.brand = null; filter.model = null; filter.generation = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <Dropdown :disabled="!filter.brand || models.length === 0 || loading" v-model="filter.model" :options="models" filter optionLabel="name" placeholder="Модель" @change="filter.generation = null">
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
                                            <Button v-if="filter.model" icon="pi pi-times" severity="danger" @click="filter.model = null; filter.generation = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <Dropdown :disabled="!filter.model || generations.length === 0 || loading" v-model="filter.generation" :options="generations" filter optionLabel="name" placeholder="Поколение">
                                                <template #value="slotProps">
                                                    <div v-if="slotProps.value" class="flex align-items-center">
                                                        <div>{{slotProps.value.number}} поколение{{slotProps.value.restyling ? ', рестайлинг' : ''}} {{moment(slotProps.value.from).format('YYYY')}}-{{slotProps.value.to ? moment(slotProps.value.to).format('YYYY') : 'н.в.'}}</div>
                                                    </div>
                                                </template>
                                                <template #option="slotProps">
                                                    <div class="flex align-items-center">
                                                        <div>{{slotProps.option.number}} поколение{{slotProps.option.restyling ? ', рестайлинг' : ''}} {{moment(slotProps.option.from).format('YYYY')}}-{{slotProps.option.to ? moment(slotProps.option.to).format('YYYY') : 'н.в.'}}</div>
                                                    </div>
                                                </template>
                                            </Dropdown>
                                            <Button v-if="filter.generation" icon="pi pi-times" severity="danger" @click="filter.generation = null"/>
                                        </div>
                                    </div>
                                    <div class="card flex flex-column md:flex-row gap-3">
                                        <div class="p-inputgroup flex-1">
                                            <Calendar v-model="filter.yearFrom" :disabled="loading" :maxDate="filter.yearTo" view="year" dateFormat="yy" placeholder="Год от"/>
                                            <Button v-if="filter.yearFrom" icon="pi pi-times" severity="danger" @click="filter.yearFrom = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <Calendar v-model="filter.yearTo" :disabled="loading" :minDate="filter.yearFrom" view="year" dateFormat="yy" placeholder="до"/>
                                            <Button v-if="filter.yearTo" icon="pi pi-times" severity="danger" @click="filter.yearTo = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <InputNumber v-model="filter.priceFrom" :disabled="loading" :max="9999999999.99" mode="currency" currency="RUB" locale="ru-RU" placeholder="Цена от"/>
                                            <Button v-if="filter.priceFrom" icon="pi pi-times" severity="danger" @click="filter.priceFrom = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <InputNumber v-model="filter.priceTo" :disabled="loading" :max="9999999999.99" mode="currency" currency="RUB" locale="ru-RU" placeholder="до"/>
                                            <Button v-if="filter.priceTo" icon="pi pi-times" severity="danger" @click="filter.priceTo = null"/>
                                        </div>
                                        <div class="p-inputgroup flex-1">
                                            <Dropdown :disabled="loading" v-model="filter.status" :options="dropdownStatuses" optionLabel="option" optionValue="value" placeholder="Статус"/>
                                            <Button v-if="filter.status" icon="pi pi-times" severity="danger" @click="filter.status = null"/>
                                        </div>
                                    </div>
                                    <a :href="route('crm.cars.download')">
                                        <Button label="Скачать номенклатуру" icon="pi pi-file-excel" class="mt-2"/>
                                    </a>
                                </div>
                            </div>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="cars" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.cars.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="equipment" header="Комплектация">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.equipments.show', [slotProps.data.supply.equipment.id])" v-text="slotProps.data.supply.equipment.name" />
                                        </template>
                                    </Column>
                                    <Column field="equipment" header="Модель">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.models.show', [slotProps.data.supply.equipment.generation.model.id])" v-text="slotProps.data.supply.equipment.generation.model.name" />
                                        </template>
                                    </Column>
                                    <Column field="equipment" header="Марка">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.brands.show', [slotProps.data.supply.equipment.generation.model.brand.id])" v-text="slotProps.data.supply.equipment.generation.model.brand.name" />
                                        </template>
                                    </Column>
                                    <Column field="price" header="Цена" sortable>
                                        <template #body="slotProps">
                                            {{slotProps.data.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(slotProps.data.price) : ''}}
                                        </template>
                                    </Column>
                                    <Column field="release_date" header="Год выпуска" sortable>
                                        <template #body="slotProps">
                                            {{slotProps.data.release_date ? moment(slotProps.data.release_date).format("YYYY") : ''}}
                                        </template>
                                    </Column>
                                    <Column field="status" header="Статус">
                                        <template #body="slotProps">
                                            <i v-if="slotProps.data.status === 'WAITING'" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Ожидание завершения поставки'"></i>
                                            <i v-else-if="slotProps.data.status === 'PRESENT'" style="color: dodgerblue;" class="pi pi-eye-slash" v-tooltip="'В наличии: не отображается в каталоге'"></i>
                                            <i v-else-if="slotProps.data.status === 'SELLING'" style="color: dodgerblue;" class="pi pi-eye" v-tooltip="'В продаже: отображается в каталоге'"></i>
                                            <i v-else-if="slotProps.data.status === 'SOLD'" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Продано'"></i>
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
