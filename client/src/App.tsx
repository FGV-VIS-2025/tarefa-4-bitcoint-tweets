import "./App.css";
import WordCloud from "./components/wordcloud";
import Heatmap from "./components/heatmap";
import { useEffect, useMemo, useState } from "react";
import LineChart from "./components/line-chart";

import hashtagCount from "../src/assets/hashtag-count.json";

interface HashtagData {
  hashtag: string;
  date: Date;
  count: number;
}

function App() {
  const [selectedFilter, setSelectedFilter] = useState("contains");
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue((prev) =>
        prev !== inputValue.trim() ? inputValue.trim() : prev
      );
    }, 200); // delay

    // Clear timeout if input value changes within the delay period
    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);

  const filters = [
    { id: "starts-with", label: "Starts with" },
    { id: "ends-with", label: "Ends with" },
    { id: "contains", label: "Contains" },
    { id: "exact-match", label: "Exact Match" },
  ];

  const handleFilterChange = (filterLabel: string) => {
    setSelectedFilter(filterLabel);
  };

  const fullData: HashtagData[] = useMemo(
    () =>
      (
        hashtagCount as {
          hashtag: string;
          date: string;
          count: number;
        }[]
      ).map((item) => ({
        hashtag: item.hashtag,
        date: new Date(item.date),
        count: item.count,
      })) as HashtagData[],
    []
  );

  const filteredData = useMemo(() => {
    if (debouncedValue.length === 0) return fullData;

    const filtered = fullData.filter((item) => {
      const hashtag = item.hashtag.toLowerCase();
      const query = debouncedValue.toLowerCase();

      switch (selectedFilter) {
        case "starts-with":
          return hashtag.startsWith(query);
        case "ends-with":
          return hashtag.endsWith(query);
        case "contains":
          return hashtag.includes(query);
        case "exact-match":
          return hashtag === query;
        default:
          return true;
      }
    });
    return filtered;
  }, [debouncedValue, selectedFilter, fullData]);

  return (
    <div className="flex justify-center">
      <div className="max-w-[1728px] w-full">
        <h1 className="text-5xl text-center font-semibold">
          Bitcoin Tweets Explorer
        </h1>
        <div className="grid grid-cols-12 h-[calc(100vh-80px)]">
          <div className="col-span-8 rounded-lg h-[60vh]">
            <LineChart data={filteredData} />
          </div>
          <div className="col-span-4 rounded-lg h-[60vh]">
            {/** Filtering options */}
            <div className="grid grid-cols-12">
              <input
                type="text"
                placeholder="Type a hashtag"
                className="w-full p-2 border rounded col-span-4"
                value={inputValue}
                onChange={handleInputChange}
              />
              <div className="flex">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`col-span-2 px-4 py-2 text-sm font-medium border ${
                      selectedFilter === filter.label
                        ? "bg-gray-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => handleFilterChange(filter.label)}
                    aria-pressed={selectedFilter === filter.label}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <WordCloud />
          </div>
          <div className="col-span-12 rounded-lg h-[25vh]">
            <Heatmap initialData={filteredData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
