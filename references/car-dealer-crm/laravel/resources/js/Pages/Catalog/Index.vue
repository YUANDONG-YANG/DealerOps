<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import DataView from 'primevue/dataview';
import moment from "moment/moment";
import SearchField from "../../Components/SearchField.vue";
import Dropdown from 'primevue/dropdown';
import {ref, watch} from "vue";
import {debounce} from "lodash";
import {router} from "@inertiajs/vue3";
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

const props = defineProps({
    cars: Object,
    brands: Object,
    models: Object,
    generations: Object,
});
const loading = ref(false);
const filter = ref({
    brand: null,
    model: null,
    generaton: null,
    yearFrom: null,
    yearTo: null,
    priceFrom: null,
    priceTo: null,
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
    <AppLayout title="Каталог">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #content>
                            <div class="card mb-5 bg-gray-50 border-gray-200 border rounded p-4">
                                <div class="space-y-2">
                                    <SearchField class="w-full"/>
                                    <div class="card flex flex-column md:flex-row gap-3 sm:mt-2 mt-3">
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
                                    </div>
                                </div>
                            </div>
                            <div class="card">
                                <DataView :value="cars" paginator :rows="20">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <template #list="slotProps">
                                        <a :href="route('catalog.show', [slotProps.data.id])" class="col-12">
                                            <div class="flex flex-column xl:flex-row xl:align-items-start p-4 gap-4 hover:bg-black-alpha-10 transition ease-in-out duration-150 border-b">
                                                <img class="w-11 sm:w-16rem xl:w-16rem shadow-2 block xl:block mx-auto border-round" :src="'/storage/' + slotProps.data.photos[0].photo" :alt="slotProps.data.photos[0].photo" style="object-fit: cover;" />
                                                <div class="flex flex-column sm:flex-row justify-content-between align-items-center xl:align-items-start flex-1 gap-4">
                                                    <div class="flex flex-column align-items-center sm:align-items-start md:gap-3 gap-0">
                                                        <div class="md:text-2xl text-xl font-bold text-900">
                                                            <div>{{slotProps.data.supply.equipment.generation.model.brand.name}} {{slotProps.data.supply.equipment.generation.model.name}} {{slotProps.data.release_date ? moment(slotProps.data.release_date).format("YYYY") : ''}}</div>
                                                            <div class="font-semibold text-sm text-gray-600">{{slotProps.data.supply.equipment.name }}</div>
                                                            <div class="flex md:hidden text-sm font-semibold">{{slotProps.data.supply.equipment.engine.max_power}} л.с. {{slotProps.data.supply.equipment.max_speed}} км/ч {{slotProps.data.mileage}} км</div>
                                                        </div>
                                                        <div class="flex align-items-center gap-3">
                                                            <span class="flex align-items-center gap-2">
                                                                <span class="md:flex flex-col gap-2 hidden">
                                                                    <span class="font-semibold">Мощность: {{slotProps.data.supply.equipment.engine.max_power}} л.с.</span>
                                                                    <span class="font-semibold">Макс. скорость: {{slotProps.data.supply.equipment.max_speed}} км/ч</span>
                                                                    <span class="font-semibold">Пробег: {{slotProps.data.mileage}} км</span>
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div class="flex sm:flex-column align-items-center sm:align-items-end gap-3 sm:gap-2">
                                                        <span class="text-2xl font-semibold">{{slotProps.data.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0, minimumFractionDigits: 0, }).format(slotProps.data.price) : ''}}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    </template>
                                </DataView>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
