# Data Visualization Fianl Project - All Space Missions from 1957
CS573 Course Project

## Data

The data I applied for this project is [All Space Missions from 1957](https://gist.github.com/lintonylin/4f9ba13dc37b7510ea392d95c494f891#file-readme-md)

## Questions & Tasks

The following tasks and questions drive the visualization and interaction decisions for this project:

 * Compare the number of launch mission among countries to find the most successful "space" country.
 * Compare the success rate among countries and companies to find out the relationship between them.
 * Visualize launch mission on a world map with circles corresbonding to countries to show differences among countries

## Sketches

![Ske1](https://user-images.githubusercontent.com/54681253/98183970-489d4380-1ed7-11eb-97a0-0aef4ccbf10d.jpg)

![Ske2](https://user-images.githubusercontent.com/54681253/98183973-4a670700-1ed7-11eb-97a8-5758b9a13acf.jpg)

## Visualizations

### 1. Space missions for different companies since 1957

[![image](https://user-images.githubusercontent.com/54681253/94498924-5cafa000-01c9-11eb-9951-1b97cdb47166.png)](https://vizhub.com/lintonylin/8c17dea5c6634622a33939c73750ec49?edit=files&file=index.html&mode=full)

Based on Vega Lite API, I'm able to visualize the space missions for different companies throughout the world since 1957. There's color legend for different mission status. So, we can compare the number of launches and the success rate for differnet companies by this visualization.

### 2. Space missions for different countries since 1957

[![image](https://user-images.githubusercontent.com/54681253/98177507-c3129700-1ec8-11eb-9217-ddfddf5fe23e.jpg)](https://vizhub.com/lintonylin/bad81b3a95a144b69e5ad4436bb22621?edit=files&file=index.html&mode=full)

It is based on world map with D3.js. This visualization shows the comparison of number of missions and status of missons among countries. We can find country with greatest number of missions and the most sucessfull country for lauch missions.

## Working Progress

 * Task 1: Build a world map with country borders. 
    * Week 1, estimate 5 hours
 * Task 2: Pin the location (Country) of missions on the map, create a pie chart(raw) for each country.
    * Week 2, estimate 8 hours
 * Task 3: Refine pie charts, add "status mission" information. Using size of pie chart for the number of missions for different countries.
    * Week 3-4, estimate 12 hours
 * Task 4: Adding tooltips for sucess imformation, including "Sucess", "Failure", "Partial Failure" and "Prelaunch Failure". Make documentation and introduction video, exporting code into Github.
    * Week 4-5, estimate 36 hours

## Future Work

   * Add "year" information in the visualization. The data is prepared as [year aggregated mission data](https://gist.githubusercontent.com/lintonylin/4f9ba13dc37b7510ea392d95c494f891/raw/1092dba2c54ed10d03f2999d8ad7878757b39a8f/Space_year_aggregated.csv) at country level.
   * Add interaction for color legend on the second visulization. When the user selects a launch state like "Success", the map will only show circles for "success" missions in all countries.