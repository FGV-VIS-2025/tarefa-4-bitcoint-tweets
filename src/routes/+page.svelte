<script>
  import SearchFilter from "$lib/SearchFilter.svelte";
  import LineChart from "$lib/LineChart.svelte";
  import WordCloud from "$lib/WordCloud.svelte";
  import HeatMap from "$lib/HeatMap.svelte";

  import timelineData from "$lib/data/hashtag_timeline.json";
  import hashtagData from "$lib/data/hashtag_monthly.json";
  import wordCloudData from "$lib/data/wordcloud_data.json";

  $: filteredHashtagData = hashtagData;
  $: filteredTimelineData = timelineData;

  // State to store search parameters from child component
  let searchQuery = "";
  let searchFilterType = "";

  // Function to handle type filtering
  function handleFilter(filterType, hashtag, query) {
    const hashtagLower = hashtag.toLowerCase();
    const queryLower = query.toLowerCase();

    switch (filterType) {
        case "starts-with":
          return hashtagLower.startsWith(queryLower);
        case "ends-with":
          return hashtagLower.endsWith(queryLower);
        case "contains":
          return hashtagLower.includes(queryLower);
        case "exact-match":
          return hashtagLower === queryLower;
        default:
          return true; // No filter applied
      }
  }

  // Handle the search event from SearchFilter component
  function handleSearch(event) {
    // Extract data from the event detail
    const { query, filterType } = event.detail;

    // Update parent component state
    searchQuery = query;
    searchFilterType = filterType;

    if (!query) {
      filteredHashtagData = hashtagData;
      filteredTimelineData = timelineData;
      return;
    }

    // Here you could also trigger an actual search operation
    filteredHashtagData = hashtagData.filter((item) => {
      const hashtag = item.hashtag.toLowerCase();
      const queryLower = query.toLowerCase();
      return handleFilter(filterType, hashtag, queryLower);
    });

    // Update the filtered timeline data based on the search query
    filteredTimelineData = timelineData.filter((item) => {
      const hashtag = item.hashtag.toLowerCase();
      const queryLower = query.toLowerCase();
      return handleFilter(filterType, hashtag, queryLower);
    });
  }
</script>

<main class="flex justify-center">
  <div class="max-w-[1728px] w-full">
    <div class="py-4 flex flex-col items-center w-full">
      <div class="max-w-4xl space-y-8">
        <div>
          <h1 class="text-6xl font-bold text-[#ff9900] text-center">
            Bitcoin Tweets Explorer
          </h1>
          <p class="text-lg text-center">
            This is a simple web app that allows you to explore Bitcoin-related
            tweets for the year 2022. You can search for specific hashtags and view their trends
            over time.
          </p>
        </div>
        <SearchFilter on:search={handleSearch} />
      </div>
    </div>

    <div class="grid grid-cols-12">
      <div class="col-span-8">
        <LineChart filteredData={filteredHashtagData} />
      </div>
      <div class="col-span-4">
        <WordCloud words={wordCloudData} fontSizeScale={80} />
      </div>

      <div class="col-span-12">
        <HeatMap data={filteredTimelineData} />
      </div>
    </div>
  </div>
</main>
