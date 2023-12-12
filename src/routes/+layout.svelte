<script lang="ts">
    import "../app.css";
    import Navbar from "$lib/components/Navbar.svelte";
</script>

<div class="container mx-auto px-4">
    <Navbar />
    <slot/>
</div>