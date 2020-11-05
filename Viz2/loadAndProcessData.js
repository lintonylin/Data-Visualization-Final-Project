import { feature } from 'topojson';
import { csv, json } from 'd3';

export const loadAndProcessData = () => 
  Promise
    .all([
      csv('https://gist.githubusercontent.com/curran/e7ed69ac1528ff32cc53b70fdce16b76/raw/61f3c156efd532ae6ed84b38102cf9a0b3b1d094/data.csv'),
      json('https://unpkg.com/visionscarto-world-atlas@0.0.4/world/50m.json'),
      csv('https://gist.githubusercontent.com/lintonylin/4f9ba13dc37b7510ea392d95c494f891/raw/2fb7c1ff0043ce58fbd50873ef26eb78cc5c2c93/Space_aggregated.csv')
    ])
    .then(([unData, topoJSONdata, cusData]) => {
     
      const rowById = cusData.reduce((accumulator, d) => {
        accumulator[d['Country code']] = d;      
        return accumulator;
      }, {});

      
      const countries = feature(topoJSONdata, topoJSONdata.objects.countries);

      countries.features.forEach(d => {
        Object.assign(d.properties, rowById[+d.id]);
      });
      
      const featuresWithLaunches = countries.features
        .filter(d => d.properties['Total Launches'])
        .map(d => {
          d.properties['Total Launches'] = +d.properties['Total Launches'];
          d.properties['Success'] = +d.properties['Success'];
          d.properties['Failure'] = +d.properties['Failure'];
          d.properties['Partial Failure'] = +d.properties['Partial Failure'];
          d.properties['Prelaunch Failure'] = +d.properties['Prelaunch Failure'];
          return d;
        });
      

      return {
        features: countries.features,
        featuresWithLaunches
      };
    });
