<script setup>
import {ref, watch} from 'vue'
import InputText from 'primevue/inputtext';
import {debounce} from "lodash";
const search = ref('')
import {router} from '@inertiajs/vue3';

const searching = ref(false);
function getUrlParams() {
    const result = {}
    for(const [key, value] of new URLSearchParams(window.location.search)) {
        result[key] = value;
    }
    return result;
}
const initSearch = debounce(() => {
    searching.value = true;
    let params = getUrlParams();
    router.get(
        route(route().current()),
        {
            ...params,
            search: search.value,
        },
        {
            preserveState: true,
            onSuccess: page => {
                searching.value = false
            }
        },
    );
}, 500)

watch([search], () =>
    initSearch()
)
</script>

<template>
    <span class="p-input-icon-left">
        <i v-if="searching" class="pi pi-spin pi-spinner" />
        <i v-else class="pi pi-search" />
        <InputText placeholder="Поиск" type="text" v-model="search" class="w-full"/>
    </span>
</template>
