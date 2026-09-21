<script setup>
import { ref } from 'vue';
import { Head, Link, router } from '@inertiajs/vue3';
import ApplicationMark from '@/Components/ApplicationMark.vue';
import Banner from '@/Components/Banner.vue';
import Dropdown from '@/Components/Dropdown.vue';
import DropdownLink from '@/Components/DropdownLink.vue';
import NavLink from '@/Components/NavLink.vue';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink.vue';
import 'primeflex/primeflex.css';

defineProps({
    title: String,
});

const showingNavigationDropdown = ref(false);

const logout = () => {
    router.post(route('logout'));
};
</script>

<template>
    <div>
        <Head :title="title" />

        <Banner />

        <div class="min-h-screen bg-gray-100">
            <nav class="bg-black border-b border-gray-100">
                <!-- Primary Navigation Menu -->
                <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16">
                        <div class="flex">
                            <!-- Logo -->
                            <div class="shrink-0 flex items-center">
                                <Link :href="route('catalog.index')">
                                    <ApplicationMark class="block h-9 w-auto" />
                                </Link>
                            </div>

                            <!-- Navigation Links -->
                            <div class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('catalog.index')" :active="route().current('catalog.index')">
                                    Каталог
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.requests.index')" :active="route().current('crm.requests.index')">
                                    Заявки
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.orders.index')" :active="route().current('crm.orders.index')">
                                    Заказы
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.customers.index')" :active="route().current('crm.customers.index')">
                                    Клиенты
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.brands.index')" :active="route().current('crm.brands.index')">
                                    Марки
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.models.index')" :active="route().current('crm.models.index')">
                                    Модели
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.generations.index')" :active="route().current('crm.generations.index')">
                                    Поколения
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.equipments.index')" :active="route().current('crm.equipments.index')">
                                    Комплектации
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.cars.index')" :active="route().current('crm.cars.index')">
                                    Авто
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.engines.index')" :active="route().current('crm.engines.index')">
                                    Двигатели
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.supplies.index')" :active="route().current('crm.supplies.index')">
                                    Поставки
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.suppliers.index')" :active="route().current('crm.suppliers.index')">
                                    Поставщики
                                </NavLink>
                            </div>
                            <div v-if="$page.props.auth.user" class="hidden space-x-8 sm:-my-px sm:ml-4 sm:flex">
                                <NavLink :href="route('crm.countries.index')" :active="route().current('crm.countries.index')">
                                    Страны
                                </NavLink>
                            </div>
                        </div>

                        <div v-if="$page.props.auth.user" class="hidden sm:flex sm:items-center sm:ml-3">
                            <!-- Settings Dropdown -->
                            <div class="ml-3 relative">
                                <Dropdown align="right" width="48">
                                    <template #trigger>
                                        <span class="inline-flex rounded-md">
                                            <button type="button" class="inline-flex items-center py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-black hover:text-gray-500 transition ease-in-out duration-150">
                                                <i class="pi pi-user"></i>
                                                <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                </svg>
                                            </button>
                                        </span>
                                    </template>

                                    <template #content>
                                        <!-- Account Management -->
                                        <div class="block px-4 py-2 text-xs text-gray-300">
                                            Управление аккаунтом
                                        </div>

                                        <DropdownLink :href="route('profile.show')">
                                            Профиль
                                        </DropdownLink>

                                        <div class="border-t border-gray-200" />

                                        <!-- Authentication -->
                                        <form @submit.prevent="logout">
                                            <DropdownLink as="button">
                                                Выход
                                            </DropdownLink>
                                        </form>
                                    </template>
                                </Dropdown>
                            </div>
                        </div>

                        <!-- Hamburger -->
                        <div class="-mr-2 flex items-center sm:hidden">
                            <button class="inline-flex items-center justify-center p-2 rounded-md text-gray-200" @click="showingNavigationDropdown = ! showingNavigationDropdown">
                                <svg
                                    class="h-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        :class="{'hidden': showingNavigationDropdown, 'inline-flex': ! showingNavigationDropdown }"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        :class="{'hidden': ! showingNavigationDropdown, 'inline-flex': showingNavigationDropdown }"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Responsive Navigation Menu -->
                <div :class="{'block': showingNavigationDropdown, 'hidden': ! showingNavigationDropdown}" class="sm:hidden space-y-1">
                    <div class="space-y-1">
                        <ResponsiveNavLink :href="route('catalog.index')" :active="route().current('catalog.index')">
                            Каталог
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.requests.index')" :active="route().current('crm.requests.index')">
                            Заявки
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.orders.index')" :active="route().current('crm.orders.index')">
                            Заказы
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.customers.index')" :active="route().current('crm.customers.index')">
                            Клиенты
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.brands.index')" :active="route().current('crm.brands.index')">
                            Марки
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.models.index')" :active="route().current('crm.models.index')">
                            Модели
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.generations.index')" :active="route().current('crm.generations.index')">
                            Поколения
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.equipments.index')" :active="route().current('crm.equipments.index')">
                            Комплектации
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.cars.index')" :active="route().current('crm.cars.index')">
                            Авто
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.engines.index')" :active="route().current('crm.engines.index')">
                            Двигатели
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.supplies.index')" :active="route().current('crm.supplies.index')">
                            Поставки
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.suppliers.index')" :active="route().current('crm.suppliers.index')">
                            Поставщики
                        </ResponsiveNavLink>
                    </div>
                    <div v-if="$page.props.auth.user" class="space-y-1">
                        <ResponsiveNavLink :href="route('crm.countries.index')" :active="route().current('crm.countries.index')">
                            Страны
                        </ResponsiveNavLink>
                    </div>

                    <!-- Responsive Settings Options -->
                    <div v-if="$page.props.auth.user" class="pt-4 pb-1 border-t border-gray-200">
                        <div class="flex items-center px-4">
                            <div>
                                <div class="font-medium text-base text-white">
                                    {{ $page.props.auth.user.name }}
                                </div>
                                <div class="font-medium text-sm text-gray-500">
                                    {{ $page.props.auth.user.email }}
                                </div>
                            </div>
                        </div>

                        <div class="mt-3 space-y-1">
                            <ResponsiveNavLink :href="route('profile.show')" :active="route().current('profile.show')">
                                Профиль
                            </ResponsiveNavLink>

                            <!-- Authentication -->
                            <form method="POST" @submit.prevent="logout">
                                <ResponsiveNavLink as="button">
                                    Выход
                                </ResponsiveNavLink>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Page Content -->
            <main>
                <slot />
            </main>
        </div>
    </div>
</template>
