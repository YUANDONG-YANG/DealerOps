import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ZiggyVue } from '../../vendor/tightenco/ziggy/dist/vue.m';
import PrimeVue from 'primevue/config';
import "primevue/resources/primevue.min.css";
import "primevue/resources/themes/tailwind-light/theme.css";
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import 'primeicons/primeicons.css';
import SearchField from "./Components/SearchField.vue";

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        return createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue, Ziggy)
            .use(PrimeVue, {
                locale: {
                    startsWith: "Начинается с",
                    contains: "Содержит",
                    notContains: "Не содержит",
                    endsWith: "Заканчивается",
                    equals: "Равно",
                    notEquals: "Не равно",
                    noFilter: "Нет фильтра",
                    filter: "Фильтр",
                    lt: "Меньше чем",
                    lte: "Меньше чем или равно",
                    gt: "Более чем",
                    gte: "Более чем или равно",
                    dateIs: "Дата равна",
                    dateIsNot: "Дата не равна",
                    dateBefore: "Дата до",
                    dateAfter: "Дата после",
                    custom: "Пользовательский",
                    clear: "Очистить",
                    apply: "Принять",
                    matchAll: "Сопоставить все",
                    matchAny: "Совпадение с любым",
                    addRule: "Добавить правило",
                    removeRule: "Удалить правило",
                    accept: "Да",
                    reject: "Нет",
                    choose: "Выбрать",
                    upload: "Загрузить",
                    cancel: "Отмена",
                    completed: "Завершено",
                    pending: "В ожидании",
                    dayNames: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
                    dayNamesShort: ["Вск", "Пнд", "Втр", "Срд", "Чтв", "Птн", "Сбт"],
                    dayNamesMin: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
                    monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
                    monthNamesShort: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авн", "Сен", "Окт", "Ноя", "Дек"],
                    chooseYear: "Выбрать год",
                    chooseMonth: "Выбрать месяц",
                    chooseDate: "Выбрать дату",
                    prevDecade: "Предыдущее десятилетие",
                    nextDecade: "Следующее десятилетие",
                    prevYear: "Предыдущий год",
                    nextYear: "Следующий год",
                    prevMonth: "Предыдущий месяц",
                    nextMonth: "Следующий месяц",
                    prevHour: "Предыдущий час",
                    nextHour: "Следующий час",
                    prevMinute: "Предыдущая минута",
                    nextMinute: "Следующая минута",
                    prevSecond: "Предыдущая секунда",
                    nextSecond: "Следующая секунда",
                    am: "до полудня",
                    pm: "после полудня",
                    today: "Сегодня",
                    weekHeader: "Нед.",
                    firstDayOfWeek: 1,
                    dateFormat: "dd.mm.yy",
                    weak: "Простой",
                    medium: "Нормальный",
                    strong: "Хороший",
                    passwordPrompt: "Введите пароль",
                    emptyFilterMessage: "Результатов не найдено",
                    searchMessage: "{0} результатов доступно",
                    selectionMessage: "{0} элементов выбрано",
                    emptySelectionMessage: "Нет выбранного элемента",
                    emptySearchMessage: "Результатов не найдено",
                    emptyMessage: "Нет доступных вариантов",
                    aria: {
                        trueLabel: "Верно",
                        falseLabel: "Неверно",
                        nullLabel: "Не выбран",
                        star: "1 звезда",
                        stars: "{star} звёзд",
                        selectAll: "Выбраны все элементы",
                        unselectAll: "Все элементы не выбраны",
                        close: "Закрыть",
                        previous: "Предыдущий",
                        next: "Следующий",
                        navigation: "Навигация",
                        scrollTop: "Прокрутить в начало",
                        moveTop: "Переместить в начало",
                        moveUp: "Переместить вверх",
                        moveDown: "Переместить вниз",
                        moveBottom: "Переместить в конец",
                        moveToTarget: "Переместить в приёмник",
                        moveToSource: "Переместить в источник",
                        moveAllToTarget: "Переместить всё в приёмник",
                        moveAllToSource: "Переместить всё в источник",
                        pageLabel: "{page}",
                        firstPageLabel: "Первая страница",
                        lastPageLabel: "Последняя страница",
                        nextPageLabel: "Следующая страница",
                        previousPageLabel: "Предыдущая страница",
                        rowsPerPageLabel: "Строк на странице",
                        jumpToPageDropdownLabel: "Перейти к раскрывающемуся списку страниц",
                        jumpToPageInputLabel: "Перейти к вводу страницы",
                        selectRow: "Выбрана строка",
                        unselectRow: "Строка не выбрана",
                        expandRow: "Строка развёрнута",
                        collapseRow: "Строка свёрнута",
                        showFilterMenu: "Показать меню фильтра",
                        hideFilterMenu: "Скрыть меню фильтра",
                        filterOperator: "Оператор фильтра",
                        filterConstraint: "Ограничение фильтра",
                        editRow: "Редактирование строки",
                        saveEdit: "Сохранить правку",
                        cancelEdit: "Отменить правку",
                        listView: "В виде списка",
                        gridView: "В виде сетки",
                        slide: "Слайд",
                        slideNumber: "{slideNumber}",
                        zoomImage: "Увеличить изображение",
                        zoomIn: "Увеличить",
                        zoomOut: "Уменьшить",
                        rotateRight: "Повернуть вправо",
                        rotateLeft: "Повернуть влево"
                    }
                }
            })
            .use(ConfirmationService)
            .use(ToastService)
            .directive('tooltip', Tooltip)
            .mount(el);
    },
    progress: {
        color: '#4B5563',
    },
});
