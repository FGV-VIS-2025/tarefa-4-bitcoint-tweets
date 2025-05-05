<script>
  import SearchFilter from "$lib/SearchFilter.svelte";
  import LineChart from "$lib/LineChart.svelte";
  import WordCloud from "$lib/WordCloud.svelte";
  import HeatMap from "$lib/HeatMap.svelte";

  import timelineData from "$lib/data/hashtag_timeline.json";
  import hashtagData from "$lib/data/hashtag_monthly.json";
  import wordCloudData from "$lib/data/hashtag_wordclouds_1000.json";
  import * as d3 from "d3";

  $: filteredHashtagData = hashtagData;
  $: filteredTimelineData = timelineData;
  $: filteredWordCloudData = [];

  // State to store search parameters from child component
  let searchQuery = "";
  let searchFilterType = "";
  let sliceLimit = 30;

  function processWordCloudData(data) {
    const wordCounts = {};
    
    data.forEach(hashtag => {
      if (hashtag.wordcloud && Array.isArray(hashtag.wordcloud)) {
        hashtag.wordcloud.forEach(wordItem => {
          const word = wordItem.word;
          // If the word exists, add to its count, otherwise create new entry
          if (wordCounts[word]) {
            wordCounts[word] += wordItem.count;
          } else {
            wordCounts[word] = wordItem.count;
          }
        });
      }
    });
    
    const aggregatedWords = Object.entries(wordCounts).map(([text, count]) => ({
      text,
      value: count
    }));
    
    const maxCount = Math.max(...aggregatedWords.map(item => item.value));
    const minCount = Math.min(...aggregatedWords.map(item => item.value));

    const normalizedWords = aggregatedWords.map(item => {
      const normalizedValue = Math.log(item.value + 1) / Math.log(maxCount + 1) * 100;
      
      return {
        text: item.text,
        originalValue: item.value,
        value: normalizedValue
      };
    });
    
    normalizedWords.sort((a, b) => b.originalValue - a.originalValue);
    
    return normalizedWords.slice(0, sliceLimit);
  }

  $: {
    if (wordCloudData && Array.isArray(wordCloudData)) {
      filteredWordCloudData = processWordCloudData(wordCloudData);
    }
  }

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
      filteredWordCloudData = processWordCloudData(wordCloudData);
      return;
    }

    // Filter hashtag data
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

    // Filter wordcloud data using the same filter logic
    const filteredWordCloudItems = wordCloudData.filter((item) => {
      const hashtag = item.hashtag.toLowerCase();
      const queryLower = query.toLowerCase();
      return handleFilter(filterType, hashtag, queryLower);
    });

    // Process the filtered wordcloud data with aggregation
    filteredWordCloudData = processWordCloudData(filteredWordCloudItems);
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
        <WordCloud 
          words={filteredWordCloudData} 
          tooltipPosition="footer"
          fontSizeScale={35} 
          colorScheme={d3.schemeSet2} 
          animationDuration={1500}
          fontFamily="'Montserrat', sans-serif"
          enableExport={true}
          sliceLimit={sliceLimit}
        />
      </div>
      <div class="pt-4"/>
      <div class="col-span-12">
        <HeatMap data={filteredTimelineData} />
      </div>
    </div>
  </div>
</main>