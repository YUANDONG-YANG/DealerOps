<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import {onMounted, ref} from 'vue';
import Toolbar from 'primevue/toolbar';
import {Link, router, useForm} from "@inertiajs/vue3";
import {useConfirm} from "primevue/useconfirm";
import {useToast} from "primevue/usetoast";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from 'primevue/toast';
import Galleria from 'primevue/galleria';
import FileUpload from 'primevue/fileupload';
import moment from "moment";

const props = defineProps({
    car: Object,
    statuses: Object,
});

const toast = useToast();
const confirm = useConfirm();
let images = ref([]);
const activeIndex = ref(0);

const form = useForm({
    photo: null,
    car_id: props.car.id
});

onMounted(() => {
    updateImages()
});

const updateImages = () => {
    images.value = [];
    Object.entries(props.car.photos).forEach(entry => {
        const [key, value] = entry;
        images.value.push({id: value.id, itemImageSrc: '/storage/' + value.photo, thumbnailImageSrc: '/storage/' + value.photo})
    })
};

const store = () => {
    form.post(route('crm.photos.store', [props.car.id]), {
        onSuccess: () => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Фото загружено', life: 3000 });
            updateImages()
        },
        onError: (e) => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: e.photo ? e.photo : 'Произошла ошибка', life: 10000 });
        },
    });
};

const onFileSelect = (event) => {
    const request = new XMLHttpRequest();
    request.open('GET', event.files[0].objectURL, true);
    request.responseType = 'blob';
    request.onload = function () {
        var reader = new FileReader();
        reader.readAsDataURL(request.response);
        reader.onload = function (e) {
            form.photo = e.target.result;
        };
    };
    request.send();
}

const confirmDelete = () => {
    confirm.require({
        message: 'Вы действительно хотите удалить фото?',
        header: 'Подтвердите удаление',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: () => {
            destroy()
        },
    });
};

const destroy = () => {
    router.visit(route('crm.photos.destroy', [images.value[activeIndex.value].id]), {
        method: 'delete',
        onSuccess: page => {
            toast.add({ severity: 'success', summary: 'Успешно', detail: 'Фото удалено', life: 3000 });
            updateImages()
        },
        onError: errors => {
            toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Произошла ошибка', life: 3000 });
        },
    })
};
</script>

<template>
    <AppLayout title="Авто">
        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="overflow-hidden shadow-xl sm:rounded-lg">
                    <Card>
                        <template #title>
                            <Toolbar class="mb-4">
                                <template #start>
                                    <div class="space-x-2 flex">
                                        <Link :href="route('crm.cars.edit', [car.id])">
                                            <Button label="Редактировать" icon="pi pi-pencil"/>
                                        </Link>
                                        <FileUpload v-if="images.length === 0" mode="basic" accept="image/*" @select="onFileSelect($event)" chooseLabel="Загрузить фото" customUpload @uploader="store" />
                                        <Toast />
                                    </div>
                                </template>
                            </Toolbar>
                        </template>
                        <template #content>
                            <div class="card flex flex-col">
                                <div v-if="images.length > 0"  class="card flex justify-center m-4 flex-col">
                                    <Galleria v-model:activeIndex="activeIndex" :value="images" :numVisible="3" :circular="true" containerStyle="width: 100%;" :showItemNavigators="true">
                                        <template #item="slotProps">
                                            <img :src="slotProps.item.itemImageSrc" :alt="slotProps.item.alt" style="width: 100%; height: 600px; object-fit: cover;" />
                                        </template>
                                        <template #thumbnail="slotProps">
                                            <img :src="slotProps.item.thumbnailImageSrc" :alt="slotProps.item.alt" style="display: block; width: auto; height: 100px;" />
                                        </template>
                                    </Galleria>
                                    <div class="m-3 flex space-x-2 justify-center align-self-center">
                                        <FileUpload mode="basic" accept="image/jpg,image/png,image/jpeg,image/gif" @select="onFileSelect($event)" chooseLabel="Загрузить" customUpload @uploader="store" />
                                        <Button @click="confirmDelete()" label="Удалить" severity="danger" icon="pi pi-trash" class="mr-2"/>
                                        <ConfirmDialog></ConfirmDialog>
                                    </div>
                                </div>
                                <div class="relative overflow-x-auto">
                                    <table class="w-full text-sm text-left">
                                        <tbody>
                                            <tr class="border-b">
                                                <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    Основное
                                                    <i v-if="car.status === 'WAITING'" style="color: dodgerblue;" class="pi pi-clock" v-tooltip="'Ожидание завершения поставки'"></i>
                                                    <i v-else-if="car.status === 'PRESENT'" style="color: dodgerblue;" class="pi pi-eye-slash" v-tooltip="'В наличии: не отображается в каталоге'"></i>
                                                    <i v-else-if="car.status === 'SELLING'" style="color: dodgerblue;" class="pi pi-eye" v-tooltip="'В продаже: отображается в каталоге'"></i>
                                                    <i v-else-if="car.status === 'SOLD'" style="color: dodgerblue;" class="pi pi-thumbs-up" v-tooltip="'Продано'"></i>
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Поставка
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600" :href="route('crm.supplies.show', [car.supply.id])" v-text="car.supply.id" />
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Комплектация
                                                </th>
                                                <td class="px-6 py-3">
                                                    <a class="text-blue-600"
                                                       :href="route('crm.equipments.show', [car.supply.equipment.id])"
                                                       v-text="car.supply.equipment.name + ' | ' +
                                                       car.supply.equipment.generation.number + ' поколение ' + (car.supply.equipment.generation.restyling ? ', рестайлинг' : '') + moment(car.supply.equipment.generation.from).format('YYYY') + '-' + (car.supply.equipment.generation.to ? moment(car.supply.equipment.generation.to).format('YYYY') : 'н.в.') +  ' | ' +
                                                       car.supply.equipment.generation.model.name + ' | ' +
                                                       car.supply.equipment.generation.model.brand.name" />
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Цена
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.price ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(car.price) : ''}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Цвет
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.color}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Пробег
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.mileage ? car.mileage + ' км' : ''}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Год выпуска
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.release_date ? moment(car.release_date).format("YYYY") + ' г.' : ''}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    VIN
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.vin}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Номер шасси
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.chassis_number}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Номер кузова
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.body_number}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Гос. номер
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.state_number}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    ПТС
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Серия
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.pts_series}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Номер
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.pts_number}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Выдан
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.pts_issued_by}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Дата выдачи
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.pts_issued_at ? moment(car.pts_issued_at).format("DD.MM.YYYY") : ''}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" colspan="2" class="text-lg px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                    СТС
                                                </th>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Серия
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.sts_series}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Номер
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.sts_number}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Выдан
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.sts_issued_by}}
                                                </td>
                                            </tr>
                                            <tr class="border-b">
                                                <th scope="row" class="px-6 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    Дата выдачи
                                                </th>
                                                <td class="px-6 py-3">
                                                    {{car.sts_issued_at ? moment(car.sts_issued_at).format("DD.MM.YYYY") : ''}}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
