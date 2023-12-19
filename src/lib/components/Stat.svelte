<script lang="ts">
  export let total: number;
  export let ticketsSold: number;
  export let originalStudioStock: number;

  const percentage = (ticketsSold / originalStudioStock) * 100;

  const price = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total);

</script>

<div class="stats stats-vertical lg:stats-horizontal shadow w-full bg-gray-800">
  <div class="stat">
    <div class="stat-figure text-secondary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    </div>
    <div class="stat-title">Entradas vendidas</div>
    <div class="stat-value text-secondary">{ticketsSold}</div>
    <!-- <div class="stat-desc">21% more than last month</div> -->
  </div>

    <div class="stat">
      <div class="stat-figure text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 256 256"><path fill="currentColor" d="M128 88a40 40 0 1 0 40 40a40 40 0 0 0-40-40Zm0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24Zm112-96H16a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h224a8 8 0 0 0 8-8V64a8 8 0 0 0-8-8Zm-46.35 128H62.35A56.78 56.78 0 0 0 24 145.65v-35.3A56.78 56.78 0 0 0 62.35 72h131.3A56.78 56.78 0 0 0 232 110.35v35.3A56.78 56.78 0 0 0 193.65 184ZM232 93.37A40.81 40.81 0 0 1 210.63 72H232ZM45.37 72A40.81 40.81 0 0 1 24 93.37V72ZM24 162.63A40.81 40.81 0 0 1 45.37 184H24ZM210.63 184A40.81 40.81 0 0 1 232 162.63V184Z"/></svg>
      </div>
      <div class="stat-title">Monto generado</div>
      <div class="stat-value text-primary">{price}</div>
      <!-- <div class="stat-desc">21% more than last month</div> -->
    </div>
    
    <div class="stat">
      <div class="stat-figure text-secondary">
        <!-- <div class="avatar">
          <div class="w-16 rounded-lg">
            <img src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" />
          </div>
        </div> -->
      </div>
      <div class="stat-value">{percentage.toFixed(2)}%</div>
      <div class="stat-title">De entradas vendidas</div>
      <div class="stat-desc text-secondary">En comparación con {originalStudioStock} total</div>
    </div>
    
  </div>