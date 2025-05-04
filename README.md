# tarefa-4-bitcoint-tweets

## Pre-requisites

1. Node v20.x
2. Python 10.x
3. pnpm v10.x (enabled with corepack, recommended)

## Installation

1. Create the python env with. It will be install the needed libraries for python

* `
conda env create -f environment.yml
`

* `
conda activate ds
`

2. Run `make install` for install node_modules dependencies

## Run

Run `make dev` command in shell

## Design Justification

The design of *Bitcoin Tweets Explorer* focuses on creating a clear, intuitive, and informative experience for exploring Bitcoin-related hashtag trends throughout 2022. Below are the key design decisions:

### Visual Encodings

- **Line Chart (Hashtag Trends by Month)**: A line chart was chosen to represent the monthly evolution of multiple hashtags. We used a logarithmic scale on the Y-axis to account for the wide variance in tweet frequency between popular and less common hashtags.
- **Heatmap Calendar (Tweet Activity)**: This compact layout shows daily tweet volume across the year. Shades of green indicate activity levels, allowing users to quickly identify periods of high engagement.
- **Word Cloud (Tweet Sentence Analysis)**: A word cloud gives a fast semantic overview of common keywords. Font size is used to represent relative frequency, making it easy to identify key themes in the dataset.

### Interactions

- **Search Bar with Filters**: Users can search using different match modes ("Contains", "Starts with", "Ends with", "Exact Match"). This adds flexibility based on user needs or analysis goals.
- **Tooltip and Hover Highlights**: We considered adding interactive tooltips or hover effects to support data inspection without cluttering the visuals.

### Animation Techniques

- Smooth transitions (e.g., during filtering or highlighting) help maintain context and enhance the user experience.
- We avoided excessive animation to keep the interface responsive and focused on data exploration.

### Alternatives Considered

- **Stacked Bar Chart**: Considered for monthly trends but rejected due to readability issues with many hashtags.
- **Bubble Chart or Scatter Plot**: Explored for showing frequency versus popularity but not ideal for temporal trends.
- **Category-based Color Palette**: Instead, we used a unique color per hashtag to avoid overloading the visuals.

### Final Choice

This combination of visualizations enables both temporal and semantic analysis, which is essential for the tool’s goal: exploring Twitter data related to Bitcoin in an accessible, rich, and interactive way.


## Development Process

This project was developed by a team of two members: **Joel Perca** and **Luis Sante**.

We started with a large dataset (~1.6 GB) containing Bitcoin-related tweets from 2022. The first major challenge was preprocessing the data in a way that wouldn't hinder rendering performance in the browser. Given the dataset size, we had to be strategic about how much data was loaded and visualized at any given time to maintain interactivity and responsiveness.

### Task Division

- **Joel Perca** was responsible for implementing the **timeline (monthly hashtag trends)** and the **calendar heatmap (daily tweet activity)**.
- **Luis Sante** worked on building the **word cloud**, focusing on extracting, aggregating, and rendering the most frequent keywords found in tweet text.

### Development Time & Challenges

- We estimate that the full development process took approximately **12–16 hours** in total, split across both members. Most of the work was done in person over a series of focused working sessions.
- The most time-consuming aspect was **handling reactivity and performance optimizations**. Due to the volume of data, we had to carefully manage what was rendered, how data was filtered, and how the interface responded to user input to ensure a smooth experience.

Overall, the development involved iterating on data transformations, optimizing rendering logic, and tuning interactions to achieve an informative and interactive visualization dashboard.
