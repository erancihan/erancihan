<template>
    <div id="pixijs-container" ref="pixiContainer" class="h-dvh bg-black" />
</template>

<script lang="ts">
import { ref, watch } from 'vue';

import Program from '../../engine/core/program';
</script>

<script setup lang="ts">
const pixiContainer = ref<HTMLDivElement | null>(null);

const pixi = ref(new Program());

const props = defineProps({
    actors: {
        type: Array,
        default: () => []
    }
});

watch(
    () => pixiContainer.value,
    async () => {
        if (!pixiContainer.value) {
            return;
        }
        console.log('PixiJS container mounted:', pixiContainer.value);

        const boundingRect = pixiContainer.value.getBoundingClientRect();

        await pixi.value.create(
            pixiContainer.value,
            { backgroundColor: '#1099bb', width: boundingRect.width, height: boundingRect.height }
        );

        pixi.value.setActors(props.actors);
        pixi.value.initialize();
        pixi.value.start();
    },
    { immediate: true }
);
</script>