<template>
    <PixiContainer :actors="actors" />
</template>

<script lang="ts">
</script>

<script setup lang="ts">
const actors: any[] = [
    {
        type: 'circle',
        id: 1,

        color: '#00ff00',

        slots: [
            { slotForId: 2 }
        ]
    },
    {
        type: 'circle',
        id: 2,

        parent: 1,

        color: '#ff0000',
    }
];
</script>