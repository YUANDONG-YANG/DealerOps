<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import {Link, router, useForm} from "@inertiajs/vue3";
import Toast from 'primevue/toast';
import SearchField from "../../../Components/SearchField.vue";
import MultiSelect from 'primevue/multiselect';
import {ref, watch} from "vue";
import {debounce} from "lodash";
import Calendar from 'primevue/calendar';
import ProgressBar from 'primevue/progressbar';

const props = defineProps({
    orders: Object,
});
const formDialog = ref(false);
const loading = ref(false);
let dropdownStatuses = ref([
    {option: 'Подписание договора', value: 'CONTRACT'},
    {option: 'Передача авто', value: 'CAR'},
    {option: 'Оплата', value: 'PAYMENT'},
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
const openForm = () => {
    formDialog.value = true;
};
const form = useForm({
    from: null,
    to: null,
});

const hideDialog = () => {
    form.reset();
    formDialog.value = false;
};
</script>

<template>
    <AppLayout title="Заказы">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #content>
                            <div class="card mb-5 bg-gray-50 border-gray-200 border rounded p-4">
                                <div class="flex sm:flex-row flex-col justify-between space-y-2 sm:space-y-0">
                                    <div class="sm:space-x-2 flex sm:flex-row flex-col space-y-2 sm:space-y-0">
                                        <SearchField/>
                                        <Link :href="route('crm.orders.create')">
                                            <Button label="Создать" icon="pi pi-plus"/>
                                        </Link>
                                        <a :href="route('crm.orders.download')">
                                            <Button label="Скачать заказы" icon="pi pi-file-excel"/>
                                        </a>
                                        <span>
                                            <Button label="Анализ продаж" icon="pi pi-file-excel" @click="openForm"/>
                                        </span>
                                    </div>
                                    <div class="p-inputgroup w-fit">
                                        <MultiSelect v-model="filter.status" :options="dropdownStatuses" optionLabel="option" optionValue="value" placeholder="Статус"/>
                                        <Button v-if="filter.status" icon="pi pi-times" severity="danger" @click="filter.status = null"/>
                                    </div>
                                    <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Сформировать отчет" :modal="true" class="p-fluid">
                                        <div class="space-y-2">
                                            <div class="field">
                                                <label for="name">Дата от</label>
                                                <Calendar v-model="form.from" v-bind:disabled="form.processing" dateFormat="dd.mm.yy" />
                                            </div>
                                            <div class="field">
                                                <label>До</label>
                                                <Calendar v-model="form.to" v-bind:disabled="form.processing" dateFormat="dd.mm.yy" />
                                            </div>
                                        </div>
                                        <template #footer>
                                            <Button  label="Отмена" icon="pi pi-times" text @click="hideDialog"/>
                                            <a v-if="form.from && form.to" :href="route('crm.orders.download.analysis', {from: form.from, to: form.to})" @click="hideDialog">
                                                <Button label="Сформировать" icon="pi pi-check" text/>
                                            </a>
                                            <Button v-else :disabled="true" label="Сформировать" icon="pi pi-check" text/>
                                            <ProgressBar class="mt-2" v-if="form.processing" mode="indeterminate" style="height: 3px"></ProgressBar>
                                        </template>
                                    </Dialog>
                                    <Toast />
                                </div>
                            </div>
                            <div class="card">
                                <DataTable paginator :rows="15" :value="orders" removableSort sortMode="multiple" tableStyle="min-width: 50rem">
                                    <template #empty>
                                        <div class="text-base text-center">По вашему запросу ничего не нашлось</div>
                                    </template>
                                    <Column field="id" header="ID" sortable>
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.orders.show', [slotProps.data.id])" v-text="slotProps.data.id" />
                                        </template>
                                    </Column>
                                    <Column field="customer" header="Клиент">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.customers.show', [slotProps.data.customer_id])" v-text="slotProps.data.customer.name" />
                                        </template>
                                    </Column>
                                    <Column field="car" header="Авто">
                                        <template #body="slotProps">
                                            <a class="text-blue-600" :href="route('crm.cars.show', [slotProps.data.car.id])" v-text="slotProps.data.car.supply.equipment.name + ' | ' + slotProps.data.car.supply.equipment.generation.model.name + ' | '  + slotProps.data.car.supply.equipment.generation.model.brand.name" />
                                        </template>
                                    </Column>
                                    <Column field="user.name" header="Сотрудник"></Column>
                                    <Column field="status" header="Статус">
                                        <template #body="slotProps">
                                            <div class="space-x-1">
                                                <i v-if="slotProps.data.contract_signed_at === null" style="color: dodgerblue;" class="pi pi-file" v-tooltip="'Необходимо подписать договор'"></i>
                                                <i v-if="slotProps.data.contract_signed_at !== null && slotProps.data.car_transferred_at === null" style="color: dodgerblue;" class="pi pi-car" v-tooltip="'Необходимо передать авто клиенту'"></i>
                                                <i v-if="slotProps.data.contract_signed_at !== null && slotProps.data.payment_received_at === null" style="color: dodgerblue;" class="pi pi-wallet" v-tooltip="'Необходимо принять оплату полностью'"></i>
                                                <i v-if="slotProps.data.car_transferred_at !== null && slotProps.data.payment_received_at !== null" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Сделка завершена'"></i>
                                            </div>
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
