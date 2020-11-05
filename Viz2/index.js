import {
  select,
  geoPath,
  geoCentroid,
  geoNaturalEarth1,
  zoom,
  event,
  scaleOrdinal,
  schemeSpectral,
  scaleSqrt,
  max,
  format,
  pie,
  entries,
  arc,
} from 'd3';
import { loadAndProcessData } from './loadAndProcessData';
import { sizeLegend } from './sizeLegend';
import { colorLegend } from './colorLegend';

const svg = select('svg');

const projection = geoNaturalEarth1();
const pathGenerator = geoPath().projection(projection);
const radiusValue = (d) => d.properties['Total Launches'];

const g = svg.append('g');

const colorLegendG = svg.append('g').attr('transform', `translate(40,310)`);

g.append('path')
  .attr('class', 'sphere')
  .attr('d', pathGenerator({ type: 'Sphere' }));

svg.call(
  zoom().on('zoom', () => {
    g.attr('transform', event.transform);
  })
);

const SizeFormat = format(',');

loadAndProcessData().then((countries) => {
  
  const sizeScale = scaleSqrt()
    .domain([0, max(countries.features, radiusValue)])
    .range([0, 33]);

  g.selectAll('path')
    .data(countries.features)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', pathGenerator)
    .attr('fill', (d) =>
      d.properties['Total Launches'] ? '#fecccc' : '#e8e8e8'
    )
    .append('title')
    .text((d) =>
      isNaN(radiusValue(d))
        ? 'Missing data'
        : [d.properties['Country'], SizeFormat(radiusValue(d))].join(': ')
    );

  countries.featuresWithLaunches.forEach((d) => {
    d.properties.projected = projection(geoCentroid(d));

    const data = {};
    data.Success = d.properties.Success;
    data['Partial Failure'] = d.properties['Partial Failure'];
    data['Prelaunch Failure'] = d.properties['Prelaunch Failure'];
    data.Failure = d.properties.Failure;
    
    
    const filterdata = crossfilter(data),
          all = filterdata.groupAll();
    
    console.log(all);

    const color = scaleOrdinal()
      .domain(['Success', 'Failure', 'Partial Failure', 'Prelaunch Failure'])
      .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']);

    const colorLegendG = svg
      .append('g')
      .attr('transform', `translate(700,410)`);

    colorLegendG.call(colorLegend, {
      colorScale: color,
      circleRadius: 8,
      spacing: 20,
      textOffset: 12,
      backgroundRectWidth: 235,
    });

    const pie1 = d3.pie().value(function (d) {
      return d.value;
    });

    const data_ready = pie1(entries(data));

    const arcGenerator = arc()
      .innerRadius(0)
      .outerRadius(sizeScale(radiusValue(d)));

    g.selectAll('whatever')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', function (d) {
        return color(d.data.key);
      })
      .attr('stroke', 'black')
      .style('stroke-width', '0.1px')
      .style('opacity', 0.7)
      .attr(
        'transform',
        'translate(' +
          d.properties.projected[0] +
          ',' +
          d.properties.projected[1] +
          ')'
      )
      .append('title')
      .text(
        (dat) =>
          d.properties.Country + ', ' + dat.data.key + ', ' + dat.data.value
      );
  });

  g.append('g')
    .attr('transform', `translate(45,215)`)
    .call(sizeLegend, {
      sizeScale,
      spacing: 45,
      textOffset: 10,
      numTicks: 5,
      tickFormat: SizeFormat,
    })
    .append('text')
    .attr('class', 'legend-title')
    .text('Number of launches')
    .attr('y', -45)
    .attr('x', -30);
});
