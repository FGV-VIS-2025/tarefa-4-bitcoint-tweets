import "./App.css";
import WordCloud from "./components/wordcloud";
import Heatmap from "./components/heatmap";
import { useEffect, useState } from "react";
import LineChart from "./components/line-chart";

interface HashtagData {
  hashtag: string;
  date: string;
  count: number;
}

function App() {
  const [selectedFilter, setSelectedFilter] = useState("Contains");
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
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

  console.log("query value:", debouncedValue);

  const datosEjemplo: HashtagData[] = [];

  return (
    <div className="flex justify-center">
      <div className="max-w-[1728px] w-full">
        <h1 className="text-5xl text-center font-semibold">
          Bitcoin Tweets Explorer
        </h1>
        <div className="grid grid-cols-12 h-[calc(100vh-80px)]">
          <div className="col-span-8 rounded-lg h-[60vh]">
            <LineChart data={datosEjemplo} />
          </div>
          <div className="col-span-4 rounded-lg h-[60vh]">
            {/** Filtering options */}
            <div className="grid grid-cols-12">
              <input
                type="text"
                placeholder="Enter a hashtag or keyword"
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
            <Heatmap />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
