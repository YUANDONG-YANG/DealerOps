<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {onMounted, ref} from 'vue';
import {useForm} from "@inertiajs/vue3";
import {useToast} from "primevue/usetoast";
import Toast from 'primevue/toast';
import Galleria from 'primevue/galleria';
import moment from "moment/moment";
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputMask from 'primevue/inputmask';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import ProgressBar from 'primevue/progressbar';

const props = defineProps({
    car: Object,
    fuels: Object,
    bodies: Object
});

let images = ref([]);

const formDialog = ref(false);
const toast = useToast();

const form = useForm({
    name: null,
    phone: null,
});

onMounted(() => {
    images.value = [];
    Object.entries(props.car.photos).forEach(entry => {
        const [key, value] = entry;
        images.value.push({id: value.id, itemImageSrc: '/storage/' + value.photo, thumbnailImageSrc: '/storage/' + value.photo})
    })
});

const displayCustom = ref(false);

const imageClick = (index) => {
    if (activeIndex.value === index) {
        displayCustom.value = true;
    }
    else {
        activeIndex.value = index;
    }
};
const openImage = () => {
    displayCustom.value = true;
};
const activeIndex = ref(0);
const openForm = () => {
    formDialog.value = true;
};

const hideDialog = () => {
    formDialog.value = false;
};

const store = () => {
    form.transform((data) => ({
        ...data,
        phone: data.phone.replace(/[^0-9,]/g,""),
        car_id: props.car.id,
    }))
        .post(route('requests.store'), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Ожидайте звонка', life: 3000 });
            form.reset();
            hideDialog();
        },
        onError: () => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    });
};
</script>

<template>
    <AppLayout title="Каталог">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #content>
                            <div class="card flex flex-col">
                                <div class="sm:ml-3 ml-2 text-2xl font-bold">{{car.supply.equipment.generation.model.brand.name}} {{car.supply.equipment.generation.model.name}} {{car.release_date ? moment(car.release_date).format("YYYY") : ''}}</div>
                                <Galleria v-model:activeIndex="activeIndex" v-model:visible="displayCustom" :value="images" :numVisible="7" containerStyle="max-width: 850px" :circular="true" :fullScreen="true" :showItemNavigators="true" :showThumbnails="false">
                                    <template #item="slotProps">
                                        <img :src="slotProps.item.itemImageSrc" :alt="slotProps.item.alt" style="width: 100%; display: block" />
                                    </template>
                                    <template #thumbnail="slotProps">
                                        <img :src="slotProps.item.thumbnailImageSrc" :alt="slotProps.item.alt" style="display: block" />
                                    </template>
                                </Galleria>
                                <div class="flex flex-column sm:flex-row">
                                    <div class="md:col-4 m-2 space-y-2">
                                        <img class="h-20rem w-30rem" :src="images[activeIndex]?.itemImageSrc" style="object-fit: cover; cursor: pointer" @click="openImage()">
                                        <div v-if="images" class="flex scroll overflow-x-auto sm:flex-wrap">
                                            <span v-for="(image, index) of images" :key="index" class="sm:col-4">
                                                <img class="border-2" style="object-fit: cover; cursor: pointer; min-width: 120px; min-height: 120px; max-width: 120px; max-height: 120px;" :src="image.itemImageSrc" @click="imageClick(index)">
                                            </span>
                                        </div>
                                    </div>
                                    <div class="sm:col-8">
                                        <div class="m-1 md:mt-0 space-y-2 items-center">
                                            <div class="text-2xl font-semibold">{{car.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0, minimumFractionDigits: 0}).format(car.price) : ''}}</div>
                                            <Button label="Хочу купить" icon="pi pi-shopping-cart" class="mr-2 h-10" @click="openForm"/>
                                        </div>
                                        <Dialog v-model:visible="formDialog" :style="{width: '450px'}" header="Отправить заявку" :modal="true" class="p-fluid">
                                            <div class="space-y-2">
                                                <div class="field">
                                                    <label for="name">Ваше имя</label>
                                                    <InputText id="name" v-model.trim="form.name" v-bind:disabled="form.processing" required="true" autofocus :class="{'p-invalid': form.hasErrors && form.errors.name}" />
                                                    <small v-if="form.hasErrors" class="p-error">{{form.errors.name}}</small>
                                                </div>
                                                <div class="field">
                                                    <label for="phone">Телефон</label>
                                                    <InputMask mask="8 (999) 999-99-99" v-model.trim="form.phone" v-bind:disabled="form.processing" autofocus :class="{'p-invalid': form.hasErrors && form.errors.phone}"/>
                                                    <small v-if="form.hasErrors" class="p-error">{{form.errors.phone}}</small>
                                                </div>
                                            </div>
                                            <template #footer>
                                                <Button  label="Отмена" icon="pi pi-times" text @click="hideDialog"/>
                                                <Button v-bind:disabled="form.processing" label="Сохранить" icon="pi pi-check" text @click="store" />
                                                <ProgressBar class="mt-2" v-if="form.processing" mode="indeterminate" style="height: 3px"></ProgressBar>
                                            </template>
                                        </Dialog>
                                        <Toast />
                                        <table class="w-full text-sm text-left">
                                            <tbody>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Поколение
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.supply.equipment.generation.number}} поколение{{car.supply.equipment.generation.restyling ? ', рестайлинг' : ''}} {{moment(car.supply.equipment.generation.from).format('YYYY')}}-{{car.supply.equipment.generation.to ? moment(car.supply.equipment.generation.to).format('YYYY') : 'н.в.'}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Комплектация
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.supply.equipment.name}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Кузов
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{bodies[car.supply.equipment.body]}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Цвет
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.color}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Пробег
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.mileage}} км
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Макс. скорость
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.supply.equipment.max_speed}} км/ч
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Разгон до 100км/ч
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.supply.equipment.acceleration_time}} с
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Шины
                                                </th>
                                                <td class="md:px-6 px-0 py-3">
                                                    {{car.supply.equipment.tires_name}}
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                        <Accordion class="m-1">
                                            <AccordionTab header="Двигатель и расход">
                                                <table class="w-full text-sm text-left">
                                                    <tbody>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Наименование
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.engine.name}}
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Используемый вид топлива
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{fuels[car.supply.equipment.engine.fuel]}}
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Количество цилиндров
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.engine.cylinders_count}}
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Рабочий объем двигателя
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.engine.capacity}} см3
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Максимальная мощность двигателя
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.engine.max_power}} л.с.
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900я">
                                                            Максимальный крутящий момент
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.engine.max_torque}} Нм
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Расход топлива при скорости 90 км/ч
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.fuel_consumption_90}} л/100км
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Расход топлива при скорости 120 км/ч
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.fuel_consumption_120}} л/100км
                                                        </td>
                                                    </tr>
                                                    <tr class="border-b">
                                                        <th scope="row" class="md:px-6 px-0 py-3 font-bold text-gray-900">
                                                            Расход топлива при городском цикле
                                                        </th>
                                                        <td class="md:px-6 px-0 py-3">
                                                            {{car.supply.equipment.fuel_consumption_city}} л/100км
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table>
                                            </AccordionTab>
                                        </Accordion>
                                    </div>
                                </div>
                                <div class="w-full">

                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
