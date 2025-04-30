<!-- SearchFilter.svelte -->
<script>
  import { createEventDispatcher } from "svelte";

  // Props
  export let filters = [
    { id: "contains", label: "Contains" },
    { id: "starts-with", label: "Starts with" },
    { id: "ends-with", label: "Ends with" },
    { id: "exact-match", label: "Exact Match" },
  ];

  // State variables
  let inputValue = "";
  let selectedFilter = filters[0].id;

  // Create event dispatcher to communicate with parent component
  const dispatch = createEventDispatcher();

  // Handle input changes
  function handleInputChange(event) {
    inputValue = event.target.value;
    dispatchSearchEvent();
  }

  // Handle filter selection
  function handleFilterChange(filterId) {
    selectedFilter = filterId;
    dispatchSearchEvent();
  }

  // Dispatch search event to parent component
  function dispatchSearchEvent() {
    dispatch("search", {
      query: inputValue,
      filterType: selectedFilter,
    });
  }
</script>

<div
  class="flex flex-col rounded-lg shadow-md border border-gray-200 overflow-hidden"
>
  <div class="relative w-full">
    <div
      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    >
      <span class="text-gray-500 text-sm">#</span>
    </div>
    <input
      type="text"
      placeholder="Type a hashtag"
      class="w-full py-3 pl-8 pr-3 text-gray-700 bg-white border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      value={inputValue}
      on:input={handleInputChange}
    />
  </div>
  <div class="flex flex-row justify-stretch border-t border-gray-200">
    {#each filters as filter, index}
      <button
        class="flex-1 px-2 py-3 text-sm font-medium transition-colors duration-150 {index >
        0
          ? 'border-l border-gray-200'
          : ''} {selectedFilter === filter.id
          ? 'bg-blue-600 text-white'
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}"
        on:click={() => handleFilterChange(filter.id)}
        aria-pressed={selectedFilter === filter.id}
      >
        {filter.label}
      </button>
    {/each}
  </div>
</div>
