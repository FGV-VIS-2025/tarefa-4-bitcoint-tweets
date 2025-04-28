import "./App.css";
import WordCloud from "./components/wordcloud";
import Heatmap from "./components/heatmap";
import { useState } from "react";
import LineChart from "./components/line-chart";

// Definir la interfaz para los datos
interface HashtagData {
  fecha: string; // La fecha
  hashtag: string; // El nombre del hashtag
  cantidad: number; // La cantidad de incidencias
}

function App() {
  const [selectedFilter, setSelectedFilter] = useState("Contains");
  const filters = [
    { id: "starts-with", label: "Starts with" },
    { id: "ends-with", label: "Ends with" },
    { id: "contains", label: "Contains" },
    { id: "exact-match", label: "Exact Match" },
  ];

  const handleFilterChange = (filterLabel: string) => {
    setSelectedFilter(filterLabel);
  };

  const datosEjemplo: HashtagData[] = [
    { fecha: "2024-01-01", hashtag: "#React", cantidad: 120 },
    { fecha: "2024-02-01", hashtag: "#React", cantidad: 150 },
    { fecha: "2024-03-01", hashtag: "#React", cantidad: 200 },
    { fecha: "2024-04-01", hashtag: "#React", cantidad: 180 },
    { fecha: "2024-05-01", hashtag: "#React", cantidad: 250 },
    { fecha: "2024-01-01", hashtag: "#TypeScript", cantidad: 80 },
    { fecha: "2024-02-01", hashtag: "#TypeScript", cantidad: 100 },
    { fecha: "2024-03-01", hashtag: "#TypeScript", cantidad: 130 },
    { fecha: "2024-04-01", hashtag: "#TypeScript", cantidad: 170 },
    { fecha: "2024-05-01", hashtag: "#TypeScript", cantidad: 220 },
    { fecha: "2024-01-01", hashtag: "#D3js", cantidad: 30 },
    { fecha: "2024-02-01", hashtag: "#D3js", cantidad: 60 },
    { fecha: "2024-03-01", hashtag: "#D3js", cantidad: 80 },
    { fecha: "2024-04-01", hashtag: "#D3js", cantidad: 120 },
    { fecha: "2024-05-01", hashtag: "#D3js", cantidad: 150 },
  ];

  return (
    <div className="flex justify-center">
      <div className="max-w-[1728px] w-full">
        <h1 className="text-5xl text-center font-semibold">
          Bitcoin Tweets Explorer
        </h1>
        <div className="grid grid-cols-12 h-[calc(100vh-80px)]">
          <div className="col-span-8 rounded-lg h-[60vh]">
            <LineChart datos={datosEjemplo} />
          </div>
          <div className="col-span-4 rounded-lg h-[60vh]">
            {/** Filtering options */}
            <div>
              <input
                type="text"
                placeholder="Enter a hashtag or keyword"
                className="w-full p-2 border rounded"
              />
              <div className="flex">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`px-4 py-2 text-sm font-medium border ${
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
