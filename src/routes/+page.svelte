<script>
  import SearchFilter from "$lib/SearchFilter.svelte";
  import LineChart from "$lib/LineChart.svelte";
  import WordCloud from "$lib/WordCloud.svelte";
  import HeatMap from "../lib/HeatMap.svelte";

  import hashtagDataJson from "$lib/data/hashtag-count.json";
  import wordcloudData from "$lib/data/wordcloud-data.json";
  import { filter } from "d3";

  const hashtagData = hashtagDataJson.map((item) => ({
    ...item,
    date: new Date(item.date),
  }));

  $: filteredData = hashtagData;

  // State to store search parameters from child component
  let searchQuery = "";
  let searchFilterType = "";

  // Handle the search event from SearchFilter component
  function handleSearch(event) {
    // Extract data from the event detail
    const { query, filterType } = event.detail;

    // Update parent component state
    searchQuery = query;
    searchFilterType = filterType;

    // Here you could also trigger an actual search operation
    filteredData = hashtagData.filter((item) => {
      const hashtag = item.hashtag.toLowerCase();
      const queryLower = query.toLowerCase();
      switch (filterType) {
        case "starts-with":
          return hashtag.startsWith(queryLower);
        case "ends-with":
          return hashtag.endsWith(queryLower);
        case "contains":
          return hashtag.includes(queryLower);
        case "exact-match":
          return hashtag === queryLower;
        default:
          return true; // No filter applied
      }
    });
  }
</script>

<main class="flex justify-center">
  <div class="max-w-7xl w-full">
    <h1 class="text-6xl font-bold">Bitcoin Tweets Explorer</h1>
    <p class="text-lg">
      Welcome to the Bitcoin Tweets Explorer! This is a simple app that allows
      you to explore tweets about Bitcoin. You can search for tweets by keyword,
      and view the results in a list.
    </p>

    <div class="grid grid-cols-12">
      <div class="col-span-8">
        <LineChart data={filteredData} />
      </div>
      <div class="col-span-4">
        <SearchFilter on:search={handleSearch} />
        <WordCloud words={wordcloudData} fontSizeScale={80} />
      </div>

      <div class="col-span-12">
        <HeatMap initialData={filteredData} />
      </div>
    </div>
  </div>
</main>
