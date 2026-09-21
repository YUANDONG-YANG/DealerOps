<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
</script>

<template>
    <AppLayout title="CRM">
        <template #header>
            <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                CRM
            </h2>
        </template>

        <div class="py-12">
            <div class="max-w-screen-2xl mx-auto sm:px-6 lg:px-8">
                <div class="bg-white overflow-hidden shadow-xl sm:rounded-lg p-4">
                    Добро пожаловать, {{ $page.props.auth.user.name }}
                </div>
            </div>
        </div>
    </AppLayout>
</template>
