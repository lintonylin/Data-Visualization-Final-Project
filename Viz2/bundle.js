(function (d3$1, topojson) {
  'use strict';

  const loadAndProcessData = () => 
    Promise
      .all([
        d3$1.csv('https://gist.githubusercontent.com/curran/e7ed69ac1528ff32cc53b70fdce16b76/raw/61f3c156efd532ae6ed84b38102cf9a0b3b1d094/data.csv'),
        d3$1.json('https://unpkg.com/visionscarto-world-atlas@0.0.4/world/50m.json'),
        d3$1.csv('https://gist.githubusercontent.com/lintonylin/4f9ba13dc37b7510ea392d95c494f891/raw/2fb7c1ff0043ce58fbd50873ef26eb78cc5c2c93/Space_aggregated.csv')
      ])
      .then(([unData, topoJSONdata, cusData]) => {
       
        const rowById = cusData.reduce((accumulator, d) => {
          accumulator[d['Country code']] = d;      
          return accumulator;
        }, {});

        
        const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);

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

  const sizeLegend = (selection, props) => {
    const {
      sizeScale,
      spacing,
      textOffset,
      numTicks,
      tickFormat
    } = props;
    
    const ticks = sizeScale.ticks(numTicks)
      .filter(d => d !== 0)
      .reverse();

    const groups = selection.selectAll('g').data(ticks);
    const groupsEnter = groups
      .enter().append('g')
        .attr('class', 'tick');
    groupsEnter
      .merge(groups)
        .attr('transform', (d, i) =>
          `translate(0, ${i * spacing})`
        );
    groups.exit().remove();
    
    groupsEnter.append('circle')
      .merge(groups.select('circle'))
    		.attr('class','size-circle')
        .attr('r', sizeScale);
    
    groupsEnter.append('text')
      .merge(groups.select('text'))
        .text(tickFormat)
        .attr('dy', '0.32em')
        .attr('x', d => sizeScale(d) + textOffset);
    
  };

  const colorLegend = (selection, props) => {
    const {                      
      colorScale,                
      circleRadius,
      spacing,                   
      textOffset,
      backgroundRectWidth        
    } = props;                   
    
    const backgroundRect = selection.selectAll('rect')
      .data([null]);             
    const n = colorScale.domain().length; 
    backgroundRect.enter().append('rect')
      .merge(backgroundRect)
        .attr('x', -circleRadius * 2)   
        .attr('y', -circleRadius * 2)   
        .attr('rx', circleRadius * 2)   
        .attr('width', backgroundRectWidth)
        .attr('height', spacing * n + circleRadius * 2) 
        .attr('fill', 'white')
        .attr('opacity', 0.05);
    

    const groups = selection.selectAll('.tick')
      .data(colorScale.domain());
    
    const groupsEnter = groups
      .enter().append('g')
        .attr('class', 'tick');
    groupsEnter
      .merge(groups)
        .attr('transform', (d, i) =>    
          `translate(0, ${i * spacing})`  
        );
    groups.exit().remove();
    
    groupsEnter.append('circle')
      .merge(groups.select('circle')) 
        .attr('r', circleRadius)
        .attr('fill', colorScale);      
    
    groupsEnter.append('text')
      .merge(groups.select('text'))   
        .text(d => d)
        .attr('dy', '0.32em')
        .attr('x', textOffset);
  };

  const svg = d3$1.select('svg');

  const projection = d3$1.geoNaturalEarth1();
  const pathGenerator = d3$1.geoPath().projection(projection);
  const radiusValue = (d) => d.properties['Total Launches'];

  const g = svg.append('g');

  const colorLegendG = svg.append('g').attr('transform', `translate(40,310)`);

  g.append('path')
    .attr('class', 'sphere')
    .attr('d', pathGenerator({ type: 'Sphere' }));

  svg.call(
    d3$1.zoom().on('zoom', () => {
      g.attr('transform', d3$1.event.transform);
    })
  );

  const SizeFormat = d3$1.format(',');

  loadAndProcessData().then((countries) => {
    
    const sizeScale = d3$1.scaleSqrt()
      .domain([0, d3$1.max(countries.features, radiusValue)])
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
      d.properties.projected = projection(d3$1.geoCentroid(d));

      const data = {};
      data.Success = d.properties.Success;
      data['Partial Failure'] = d.properties['Partial Failure'];
      data['Prelaunch Failure'] = d.properties['Prelaunch Failure'];
      data.Failure = d.properties.Failure;
      
      
      const filterdata = crossfilter(data),
            all = filterdata.groupAll();
      
      console.log(all);

      const color = d3$1.scaleOrdinal()
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

      const data_ready = pie1(d3$1.entries(data));

      const arcGenerator = d3$1.arc()
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

}(d3, topojson));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImxvYWRBbmRQcm9jZXNzRGF0YS5qcyIsInNpemVMZWdlbmQuanMiLCJjb2xvckxlZ2VuZC5qcyIsImluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGZlYXR1cmUgfSBmcm9tICd0b3BvanNvbic7XG5pbXBvcnQgeyBjc3YsIGpzb24gfSBmcm9tICdkMyc7XG5cbmV4cG9ydCBjb25zdCBsb2FkQW5kUHJvY2Vzc0RhdGEgPSAoKSA9PiBcbiAgUHJvbWlzZVxuICAgIC5hbGwoW1xuICAgICAgY3N2KCdodHRwczovL2dpc3QuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2N1cnJhbi9lN2VkNjlhYzE1MjhmZjMyY2M1M2I3MGZkY2UxNmI3Ni9yYXcvNjFmM2MxNTZlZmQ1MzJhZTZlZDg0YjM4MTAyY2Y5YTBiM2IxZDA5NC9kYXRhLmNzdicpLFxuICAgICAganNvbignaHR0cHM6Ly91bnBrZy5jb20vdmlzaW9uc2NhcnRvLXdvcmxkLWF0bGFzQDAuMC40L3dvcmxkLzUwbS5qc29uJyksXG4gICAgICBjc3YoJ2h0dHBzOi8vZ2lzdC5naXRodWJ1c2VyY29udGVudC5jb20vbGludG9ueWxpbi80ZjliYTEzZGMzN2I3NTEwZWEzOTJkOTVjNDk0Zjg5MS9yYXcvMmZiN2MxZmYwMDQzY2U1OGZiZDUwODczZWYyNmViNzhjYzVjMmM5My9TcGFjZV9hZ2dyZWdhdGVkLmNzdicpXG4gICAgXSlcbiAgICAudGhlbigoW3VuRGF0YSwgdG9wb0pTT05kYXRhLCBjdXNEYXRhXSkgPT4ge1xuICAgICBcbiAgICAgIGNvbnN0IHJvd0J5SWQgPSBjdXNEYXRhLnJlZHVjZSgoYWNjdW11bGF0b3IsIGQpID0+IHtcbiAgICAgICAgYWNjdW11bGF0b3JbZFsnQ291bnRyeSBjb2RlJ11dID0gZDsgICAgICBcbiAgICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgICAgfSwge30pO1xuXG4gICAgICBcbiAgICAgIGNvbnN0IGNvdW50cmllcyA9IGZlYXR1cmUodG9wb0pTT05kYXRhLCB0b3BvSlNPTmRhdGEub2JqZWN0cy5jb3VudHJpZXMpO1xuXG4gICAgICBjb3VudHJpZXMuZmVhdHVyZXMuZm9yRWFjaChkID0+IHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihkLnByb3BlcnRpZXMsIHJvd0J5SWRbK2QuaWRdKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBmZWF0dXJlc1dpdGhMYXVuY2hlcyA9IGNvdW50cmllcy5mZWF0dXJlc1xuICAgICAgICAuZmlsdGVyKGQgPT4gZC5wcm9wZXJ0aWVzWydUb3RhbCBMYXVuY2hlcyddKVxuICAgICAgICAubWFwKGQgPT4ge1xuICAgICAgICAgIGQucHJvcGVydGllc1snVG90YWwgTGF1bmNoZXMnXSA9ICtkLnByb3BlcnRpZXNbJ1RvdGFsIExhdW5jaGVzJ107XG4gICAgICAgICAgZC5wcm9wZXJ0aWVzWydTdWNjZXNzJ10gPSArZC5wcm9wZXJ0aWVzWydTdWNjZXNzJ107XG4gICAgICAgICAgZC5wcm9wZXJ0aWVzWydGYWlsdXJlJ10gPSArZC5wcm9wZXJ0aWVzWydGYWlsdXJlJ107XG4gICAgICAgICAgZC5wcm9wZXJ0aWVzWydQYXJ0aWFsIEZhaWx1cmUnXSA9ICtkLnByb3BlcnRpZXNbJ1BhcnRpYWwgRmFpbHVyZSddO1xuICAgICAgICAgIGQucHJvcGVydGllc1snUHJlbGF1bmNoIEZhaWx1cmUnXSA9ICtkLnByb3BlcnRpZXNbJ1ByZWxhdW5jaCBGYWlsdXJlJ107XG4gICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgIH0pO1xuICAgICAgXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZlYXR1cmVzOiBjb3VudHJpZXMuZmVhdHVyZXMsXG4gICAgICAgIGZlYXR1cmVzV2l0aExhdW5jaGVzXG4gICAgICB9O1xuICAgIH0pO1xuIiwiZXhwb3J0IGNvbnN0IHNpemVMZWdlbmQgPSAoc2VsZWN0aW9uLCBwcm9wcykgPT4ge1xuICBjb25zdCB7XG4gICAgc2l6ZVNjYWxlLFxuICAgIHNwYWNpbmcsXG4gICAgdGV4dE9mZnNldCxcbiAgICBudW1UaWNrcyxcbiAgICB0aWNrRm9ybWF0XG4gIH0gPSBwcm9wcztcbiAgXG4gIGNvbnN0IHRpY2tzID0gc2l6ZVNjYWxlLnRpY2tzKG51bVRpY2tzKVxuICAgIC5maWx0ZXIoZCA9PiBkICE9PSAwKVxuICAgIC5yZXZlcnNlKCk7XG5cbiAgY29uc3QgZ3JvdXBzID0gc2VsZWN0aW9uLnNlbGVjdEFsbCgnZycpLmRhdGEodGlja3MpO1xuICBjb25zdCBncm91cHNFbnRlciA9IGdyb3Vwc1xuICAgIC5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAndGljaycpO1xuICBncm91cHNFbnRlclxuICAgIC5tZXJnZShncm91cHMpXG4gICAgICAuYXR0cigndHJhbnNmb3JtJywgKGQsIGkpID0+XG4gICAgICAgIGB0cmFuc2xhdGUoMCwgJHtpICogc3BhY2luZ30pYFxuICAgICAgKTtcbiAgZ3JvdXBzLmV4aXQoKS5yZW1vdmUoKTtcbiAgXG4gIGdyb3Vwc0VudGVyLmFwcGVuZCgnY2lyY2xlJylcbiAgICAubWVyZ2UoZ3JvdXBzLnNlbGVjdCgnY2lyY2xlJykpXG4gIFx0XHQuYXR0cignY2xhc3MnLCdzaXplLWNpcmNsZScpXG4gICAgICAuYXR0cigncicsIHNpemVTY2FsZSk7XG4gIFxuICBncm91cHNFbnRlci5hcHBlbmQoJ3RleHQnKVxuICAgIC5tZXJnZShncm91cHMuc2VsZWN0KCd0ZXh0JykpXG4gICAgICAudGV4dCh0aWNrRm9ybWF0KVxuICAgICAgLmF0dHIoJ2R5JywgJzAuMzJlbScpXG4gICAgICAuYXR0cigneCcsIGQgPT4gc2l6ZVNjYWxlKGQpICsgdGV4dE9mZnNldCk7XG4gIFxufSIsImV4cG9ydCBjb25zdCBjb2xvckxlZ2VuZCA9IChzZWxlY3Rpb24sIHByb3BzKSA9PiB7XG4gIGNvbnN0IHsgICAgICAgICAgICAgICAgICAgICAgXG4gICAgY29sb3JTY2FsZSwgICAgICAgICAgICAgICAgXG4gICAgY2lyY2xlUmFkaXVzLFxuICAgIHNwYWNpbmcsICAgICAgICAgICAgICAgICAgIFxuICAgIHRleHRPZmZzZXQsXG4gICAgYmFja2dyb3VuZFJlY3RXaWR0aCAgICAgICAgXG4gIH0gPSBwcm9wczsgICAgICAgICAgICAgICAgICAgXG4gIFxuICBjb25zdCBiYWNrZ3JvdW5kUmVjdCA9IHNlbGVjdGlvbi5zZWxlY3RBbGwoJ3JlY3QnKVxuICAgIC5kYXRhKFtudWxsXSk7ICAgICAgICAgICAgIFxuICBjb25zdCBuID0gY29sb3JTY2FsZS5kb21haW4oKS5sZW5ndGg7IFxuICBiYWNrZ3JvdW5kUmVjdC5lbnRlcigpLmFwcGVuZCgncmVjdCcpXG4gICAgLm1lcmdlKGJhY2tncm91bmRSZWN0KVxuICAgICAgLmF0dHIoJ3gnLCAtY2lyY2xlUmFkaXVzICogMikgICBcbiAgICAgIC5hdHRyKCd5JywgLWNpcmNsZVJhZGl1cyAqIDIpICAgXG4gICAgICAuYXR0cigncngnLCBjaXJjbGVSYWRpdXMgKiAyKSAgIFxuICAgICAgLmF0dHIoJ3dpZHRoJywgYmFja2dyb3VuZFJlY3RXaWR0aClcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCBzcGFjaW5nICogbiArIGNpcmNsZVJhZGl1cyAqIDIpIFxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnd2hpdGUnKVxuICAgICAgLmF0dHIoJ29wYWNpdHknLCAwLjA1KTtcbiAgXG5cbiAgY29uc3QgZ3JvdXBzID0gc2VsZWN0aW9uLnNlbGVjdEFsbCgnLnRpY2snKVxuICAgIC5kYXRhKGNvbG9yU2NhbGUuZG9tYWluKCkpO1xuICBcbiAgY29uc3QgZ3JvdXBzRW50ZXIgPSBncm91cHNcbiAgICAuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3RpY2snKTtcbiAgZ3JvdXBzRW50ZXJcbiAgICAubWVyZ2UoZ3JvdXBzKVxuICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIChkLCBpKSA9PiAgICBcbiAgICAgICAgYHRyYW5zbGF0ZSgwLCAke2kgKiBzcGFjaW5nfSlgICBcbiAgICAgICk7XG4gIGdyb3Vwcy5leGl0KCkucmVtb3ZlKCk7XG4gIFxuICBncm91cHNFbnRlci5hcHBlbmQoJ2NpcmNsZScpXG4gICAgLm1lcmdlKGdyb3Vwcy5zZWxlY3QoJ2NpcmNsZScpKSBcbiAgICAgIC5hdHRyKCdyJywgY2lyY2xlUmFkaXVzKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCBjb2xvclNjYWxlKTsgICAgICBcbiAgXG4gIGdyb3Vwc0VudGVyLmFwcGVuZCgndGV4dCcpXG4gICAgLm1lcmdlKGdyb3Vwcy5zZWxlY3QoJ3RleHQnKSkgICBcbiAgICAgIC50ZXh0KGQgPT4gZClcbiAgICAgIC5hdHRyKCdkeScsICcwLjMyZW0nKVxuICAgICAgLmF0dHIoJ3gnLCB0ZXh0T2Zmc2V0KTtcbn1cbiIsImltcG9ydCB7XG4gIHNlbGVjdCxcbiAgZ2VvUGF0aCxcbiAgZ2VvQ2VudHJvaWQsXG4gIGdlb05hdHVyYWxFYXJ0aDEsXG4gIHpvb20sXG4gIGV2ZW50LFxuICBzY2FsZU9yZGluYWwsXG4gIHNjaGVtZVNwZWN0cmFsLFxuICBzY2FsZVNxcnQsXG4gIG1heCxcbiAgZm9ybWF0LFxuICBwaWUsXG4gIGVudHJpZXMsXG4gIGFyYyxcbn0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgbG9hZEFuZFByb2Nlc3NEYXRhIH0gZnJvbSAnLi9sb2FkQW5kUHJvY2Vzc0RhdGEnO1xuaW1wb3J0IHsgc2l6ZUxlZ2VuZCB9IGZyb20gJy4vc2l6ZUxlZ2VuZCc7XG5pbXBvcnQgeyBjb2xvckxlZ2VuZCB9IGZyb20gJy4vY29sb3JMZWdlbmQnO1xuXG5jb25zdCBzdmcgPSBzZWxlY3QoJ3N2ZycpO1xuXG5jb25zdCBwcm9qZWN0aW9uID0gZ2VvTmF0dXJhbEVhcnRoMSgpO1xuY29uc3QgcGF0aEdlbmVyYXRvciA9IGdlb1BhdGgoKS5wcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuY29uc3QgcmFkaXVzVmFsdWUgPSAoZCkgPT4gZC5wcm9wZXJ0aWVzWydUb3RhbCBMYXVuY2hlcyddO1xuXG5jb25zdCBnID0gc3ZnLmFwcGVuZCgnZycpO1xuXG5jb25zdCBjb2xvckxlZ2VuZEcgPSBzdmcuYXBwZW5kKCdnJykuYXR0cigndHJhbnNmb3JtJywgYHRyYW5zbGF0ZSg0MCwzMTApYCk7XG5cbmcuYXBwZW5kKCdwYXRoJylcbiAgLmF0dHIoJ2NsYXNzJywgJ3NwaGVyZScpXG4gIC5hdHRyKCdkJywgcGF0aEdlbmVyYXRvcih7IHR5cGU6ICdTcGhlcmUnIH0pKTtcblxuc3ZnLmNhbGwoXG4gIHpvb20oKS5vbignem9vbScsICgpID0+IHtcbiAgICBnLmF0dHIoJ3RyYW5zZm9ybScsIGV2ZW50LnRyYW5zZm9ybSk7XG4gIH0pXG4pO1xuXG5jb25zdCBTaXplRm9ybWF0ID0gZm9ybWF0KCcsJyk7XG5cbmxvYWRBbmRQcm9jZXNzRGF0YSgpLnRoZW4oKGNvdW50cmllcykgPT4ge1xuICBcbiAgY29uc3Qgc2l6ZVNjYWxlID0gc2NhbGVTcXJ0KClcbiAgICAuZG9tYWluKFswLCBtYXgoY291bnRyaWVzLmZlYXR1cmVzLCByYWRpdXNWYWx1ZSldKVxuICAgIC5yYW5nZShbMCwgMzNdKTtcblxuICBnLnNlbGVjdEFsbCgncGF0aCcpXG4gICAgLmRhdGEoY291bnRyaWVzLmZlYXR1cmVzKVxuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgncGF0aCcpXG4gICAgLmF0dHIoJ2NsYXNzJywgJ2NvdW50cnknKVxuICAgIC5hdHRyKCdkJywgcGF0aEdlbmVyYXRvcilcbiAgICAuYXR0cignZmlsbCcsIChkKSA9PlxuICAgICAgZC5wcm9wZXJ0aWVzWydUb3RhbCBMYXVuY2hlcyddID8gJyNmZWNjY2MnIDogJyNlOGU4ZTgnXG4gICAgKVxuICAgIC5hcHBlbmQoJ3RpdGxlJylcbiAgICAudGV4dCgoZCkgPT5cbiAgICAgIGlzTmFOKHJhZGl1c1ZhbHVlKGQpKVxuICAgICAgICA/ICdNaXNzaW5nIGRhdGEnXG4gICAgICAgIDogW2QucHJvcGVydGllc1snQ291bnRyeSddLCBTaXplRm9ybWF0KHJhZGl1c1ZhbHVlKGQpKV0uam9pbignOiAnKVxuICAgICk7XG5cbiAgY291bnRyaWVzLmZlYXR1cmVzV2l0aExhdW5jaGVzLmZvckVhY2goKGQpID0+IHtcbiAgICBkLnByb3BlcnRpZXMucHJvamVjdGVkID0gcHJvamVjdGlvbihnZW9DZW50cm9pZChkKSk7XG5cbiAgICBjb25zdCBkYXRhID0ge307XG4gICAgZGF0YS5TdWNjZXNzID0gZC5wcm9wZXJ0aWVzLlN1Y2Nlc3M7XG4gICAgZGF0YVsnUGFydGlhbCBGYWlsdXJlJ10gPSBkLnByb3BlcnRpZXNbJ1BhcnRpYWwgRmFpbHVyZSddO1xuICAgIGRhdGFbJ1ByZWxhdW5jaCBGYWlsdXJlJ10gPSBkLnByb3BlcnRpZXNbJ1ByZWxhdW5jaCBGYWlsdXJlJ107XG4gICAgZGF0YS5GYWlsdXJlID0gZC5wcm9wZXJ0aWVzLkZhaWx1cmU7XG4gICAgXG4gICAgXG4gICAgY29uc3QgZmlsdGVyZGF0YSA9IGNyb3NzZmlsdGVyKGRhdGEpLFxuICAgICAgICAgIGFsbCA9IGZpbHRlcmRhdGEuZ3JvdXBBbGwoKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhhbGwpO1xuXG4gICAgY29uc3QgY29sb3IgPSBzY2FsZU9yZGluYWwoKVxuICAgICAgLmRvbWFpbihbJ1N1Y2Nlc3MnLCAnRmFpbHVyZScsICdQYXJ0aWFsIEZhaWx1cmUnLCAnUHJlbGF1bmNoIEZhaWx1cmUnXSlcbiAgICAgIC5yYW5nZShbJyMxZjc3YjQnLCAnI2ZmN2YwZScsICcjMmNhMDJjJywgJyNkNjI3MjgnXSk7XG5cbiAgICBjb25zdCBjb2xvckxlZ2VuZEcgPSBzdmdcbiAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsIGB0cmFuc2xhdGUoNzAwLDQxMClgKTtcblxuICAgIGNvbG9yTGVnZW5kRy5jYWxsKGNvbG9yTGVnZW5kLCB7XG4gICAgICBjb2xvclNjYWxlOiBjb2xvcixcbiAgICAgIGNpcmNsZVJhZGl1czogOCxcbiAgICAgIHNwYWNpbmc6IDIwLFxuICAgICAgdGV4dE9mZnNldDogMTIsXG4gICAgICBiYWNrZ3JvdW5kUmVjdFdpZHRoOiAyMzUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBwaWUxID0gZDMucGllKCkudmFsdWUoZnVuY3Rpb24gKGQpIHtcbiAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGF0YV9yZWFkeSA9IHBpZTEoZW50cmllcyhkYXRhKSk7XG5cbiAgICBjb25zdCBhcmNHZW5lcmF0b3IgPSBhcmMoKVxuICAgICAgLmlubmVyUmFkaXVzKDApXG4gICAgICAub3V0ZXJSYWRpdXMoc2l6ZVNjYWxlKHJhZGl1c1ZhbHVlKGQpKSk7XG5cbiAgICBnLnNlbGVjdEFsbCgnd2hhdGV2ZXInKVxuICAgICAgLmRhdGEoZGF0YV9yZWFkeSlcbiAgICAgIC5lbnRlcigpXG4gICAgICAuYXBwZW5kKCdwYXRoJylcbiAgICAgIC5hdHRyKCdkJywgYXJjR2VuZXJhdG9yKVxuICAgICAgLmF0dHIoJ2ZpbGwnLCBmdW5jdGlvbiAoZCkge1xuICAgICAgICByZXR1cm4gY29sb3IoZC5kYXRhLmtleSk7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3N0cm9rZScsICdibGFjaycpXG4gICAgICAuc3R5bGUoJ3N0cm9rZS13aWR0aCcsICcwLjFweCcpXG4gICAgICAuc3R5bGUoJ29wYWNpdHknLCAwLjcpXG4gICAgICAuYXR0cihcbiAgICAgICAgJ3RyYW5zZm9ybScsXG4gICAgICAgICd0cmFuc2xhdGUoJyArXG4gICAgICAgICAgZC5wcm9wZXJ0aWVzLnByb2plY3RlZFswXSArXG4gICAgICAgICAgJywnICtcbiAgICAgICAgICBkLnByb3BlcnRpZXMucHJvamVjdGVkWzFdICtcbiAgICAgICAgICAnKSdcbiAgICAgIClcbiAgICAgIC5hcHBlbmQoJ3RpdGxlJylcbiAgICAgIC50ZXh0KFxuICAgICAgICAoZGF0KSA9PlxuICAgICAgICAgIGQucHJvcGVydGllcy5Db3VudHJ5ICsgJywgJyArIGRhdC5kYXRhLmtleSArICcsICcgKyBkYXQuZGF0YS52YWx1ZVxuICAgICAgKTtcbiAgfSk7XG5cbiAgZy5hcHBlbmQoJ2cnKVxuICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBgdHJhbnNsYXRlKDQ1LDIxNSlgKVxuICAgIC5jYWxsKHNpemVMZWdlbmQsIHtcbiAgICAgIHNpemVTY2FsZSxcbiAgICAgIHNwYWNpbmc6IDQ1LFxuICAgICAgdGV4dE9mZnNldDogMTAsXG4gICAgICBudW1UaWNrczogNSxcbiAgICAgIHRpY2tGb3JtYXQ6IFNpemVGb3JtYXQsXG4gICAgfSlcbiAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAuYXR0cignY2xhc3MnLCAnbGVnZW5kLXRpdGxlJylcbiAgICAudGV4dCgnTnVtYmVyIG9mIGxhdW5jaGVzJylcbiAgICAuYXR0cigneScsIC00NSlcbiAgICAuYXR0cigneCcsIC0zMCk7XG59KTtcbiJdLCJuYW1lcyI6WyJjc3YiLCJqc29uIiwiZmVhdHVyZSIsInNlbGVjdCIsImdlb05hdHVyYWxFYXJ0aDEiLCJnZW9QYXRoIiwiem9vbSIsImV2ZW50IiwiZm9ybWF0Iiwic2NhbGVTcXJ0IiwibWF4IiwiZ2VvQ2VudHJvaWQiLCJzY2FsZU9yZGluYWwiLCJlbnRyaWVzIiwiYXJjIl0sIm1hcHBpbmdzIjoiOzs7RUFHTyxNQUFNLGtCQUFrQixHQUFHO0VBQ2xDLEVBQUUsT0FBTztFQUNULEtBQUssR0FBRyxDQUFDO0VBQ1QsTUFBTUEsUUFBRyxDQUFDLGtJQUFrSSxDQUFDO0VBQzdJLE1BQU1DLFNBQUksQ0FBQyxpRUFBaUUsQ0FBQztFQUM3RSxNQUFNRCxRQUFHLENBQUMsa0pBQWtKLENBQUM7RUFDN0osS0FBSyxDQUFDO0VBQ04sS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLEtBQUs7RUFDL0M7RUFDQSxNQUFNLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLO0VBQ3pELFFBQVEsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUMzQyxRQUFRLE9BQU8sV0FBVyxDQUFDO0VBQzNCLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNiO0VBQ0E7RUFDQSxNQUFNLE1BQU0sU0FBUyxHQUFHRSxnQkFBTyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlFO0VBQ0EsTUFBTSxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7RUFDdEMsUUFBUSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDcEQsT0FBTyxDQUFDLENBQUM7RUFDVDtFQUNBLE1BQU0sTUFBTSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsUUFBUTtFQUNyRCxTQUFTLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0VBQ3BELFNBQVMsR0FBRyxDQUFDLENBQUMsSUFBSTtFQUNsQixVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztFQUMzRSxVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzdELFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDN0QsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUM7RUFDN0UsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7RUFDakYsVUFBVSxPQUFPLENBQUMsQ0FBQztFQUNuQixTQUFTLENBQUMsQ0FBQztFQUNYO0FBQ0E7RUFDQSxNQUFNLE9BQU87RUFDYixRQUFRLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtFQUNwQyxRQUFRLG9CQUFvQjtFQUM1QixPQUFPLENBQUM7RUFDUixLQUFLLENBQUM7O0VDeENDLE1BQU0sVUFBVSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssS0FBSztFQUNoRCxFQUFFLE1BQU07RUFDUixJQUFJLFNBQVM7RUFDYixJQUFJLE9BQU87RUFDWCxJQUFJLFVBQVU7RUFDZCxJQUFJLFFBQVE7RUFDWixJQUFJLFVBQVU7RUFDZCxHQUFHLEdBQUcsS0FBSyxDQUFDO0VBQ1o7RUFDQSxFQUFFLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO0VBQ3pDLEtBQUssTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3pCLEtBQUssT0FBTyxFQUFFLENBQUM7QUFDZjtFQUNBLEVBQUUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEQsRUFBRSxNQUFNLFdBQVcsR0FBRyxNQUFNO0VBQzVCLEtBQUssS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztFQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7RUFDN0IsRUFBRSxXQUFXO0VBQ2IsS0FBSyxLQUFLLENBQUMsTUFBTSxDQUFDO0VBQ2xCLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0VBQzlCLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDdEMsT0FBTyxDQUFDO0VBQ1IsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDekI7RUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0VBQzlCLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDbkMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztFQUNoQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7RUFDNUI7RUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzVCLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDakMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0VBQ3ZCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUM7RUFDM0IsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUM7RUFDakQ7RUFDQTs7RUNuQ08sTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxLQUFLO0VBQ2pELEVBQUUsTUFBTTtFQUNSLElBQUksVUFBVTtFQUNkLElBQUksWUFBWTtFQUNoQixJQUFJLE9BQU87RUFDWCxJQUFJLFVBQVU7RUFDZCxJQUFJLG1CQUFtQjtFQUN2QixHQUFHLEdBQUcsS0FBSyxDQUFDO0VBQ1o7RUFDQSxFQUFFLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0VBQ3BELEtBQUssSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNsQixFQUFFLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7RUFDdkMsRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUN2QyxLQUFLLEtBQUssQ0FBQyxjQUFjLENBQUM7RUFDMUIsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztFQUNuQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0VBQ25DLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0VBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQztFQUN6QyxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxHQUFHLENBQUMsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0VBQ3JELE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7RUFDNUIsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzdCO0FBQ0E7RUFDQSxFQUFFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO0VBQzdDLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0VBQy9CO0VBQ0EsRUFBRSxNQUFNLFdBQVcsR0FBRyxNQUFNO0VBQzVCLEtBQUssS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztFQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7RUFDN0IsRUFBRSxXQUFXO0VBQ2IsS0FBSyxLQUFLLENBQUMsTUFBTSxDQUFDO0VBQ2xCLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0VBQzlCLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDdEMsT0FBTyxDQUFDO0VBQ1IsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDekI7RUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0VBQzlCLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDbkMsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQztFQUM5QixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7RUFDaEM7RUFDQSxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzVCLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDakMsT0FBTyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNuQixPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO0VBQzNCLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztFQUM3Qjs7RUMxQkEsTUFBTSxHQUFHLEdBQUdDLFdBQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxQjtFQUNBLE1BQU0sVUFBVSxHQUFHQyxxQkFBZ0IsRUFBRSxDQUFDO0VBQ3RDLE1BQU0sYUFBYSxHQUFHQyxZQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDdkQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFEO0VBQ0EsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxQjtFQUNBLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUM1RTtFQUNBLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ2hCLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7RUFDMUIsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEQ7RUFDQSxHQUFHLENBQUMsSUFBSTtFQUNSLEVBQUVDLFNBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTTtFQUMxQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFQyxVQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDekMsR0FBRyxDQUFDO0VBQ0osQ0FBQyxDQUFDO0FBQ0Y7RUFDQSxNQUFNLFVBQVUsR0FBR0MsV0FBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9CO0VBQ0Esa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUs7RUFDekM7RUFDQSxFQUFFLE1BQU0sU0FBUyxHQUFHQyxjQUFTLEVBQUU7RUFDL0IsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUVDLFFBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7RUFDdEQsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwQjtFQUNBLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7RUFDckIsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztFQUM3QixLQUFLLEtBQUssRUFBRTtFQUNaLEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUNuQixLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDO0VBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUM7RUFDN0IsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztFQUNwQixNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxTQUFTLEdBQUcsU0FBUztFQUM1RCxLQUFLO0VBQ0wsS0FBSyxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ3BCLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNaLE1BQU0sS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMzQixVQUFVLGNBQWM7RUFDeEIsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztFQUMxRSxLQUFLLENBQUM7QUFDTjtFQUNBLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztFQUNoRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQ0MsZ0JBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hEO0VBQ0EsSUFBSSxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7RUFDcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO0VBQ3hDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0VBQzlELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0VBQ2xFLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztFQUN4QztFQUNBO0VBQ0EsSUFBSSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO0VBQ3hDLFVBQVUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUN0QztFQUNBLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNyQjtFQUNBLElBQUksTUFBTSxLQUFLLEdBQUdDLGlCQUFZLEVBQUU7RUFDaEMsT0FBTyxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLENBQUM7RUFDN0UsT0FBTyxLQUFLLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQzNEO0VBQ0EsSUFBSSxNQUFNLFlBQVksR0FBRyxHQUFHO0VBQzVCLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQztFQUNsQixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7QUFDL0M7RUFDQSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO0VBQ25DLE1BQU0sVUFBVSxFQUFFLEtBQUs7RUFDdkIsTUFBTSxZQUFZLEVBQUUsQ0FBQztFQUNyQixNQUFNLE9BQU8sRUFBRSxFQUFFO0VBQ2pCLE1BQU0sVUFBVSxFQUFFLEVBQUU7RUFDcEIsTUFBTSxtQkFBbUIsRUFBRSxHQUFHO0VBQzlCLEtBQUssQ0FBQyxDQUFDO0FBQ1A7RUFDQSxJQUFJLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUU7RUFDN0MsTUFBTSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUM7RUFDckIsS0FBSyxDQUFDLENBQUM7QUFDUDtFQUNBLElBQUksTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDQyxZQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMzQztFQUNBLElBQUksTUFBTSxZQUFZLEdBQUdDLFFBQUcsRUFBRTtFQUM5QixPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUM7RUFDckIsT0FBTyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUM7RUFDQSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO0VBQzNCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztFQUN2QixPQUFPLEtBQUssRUFBRTtFQUNkLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUNyQixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDO0VBQzlCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRTtFQUNqQyxRQUFRLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDakMsT0FBTyxDQUFDO0VBQ1IsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQztFQUM5QixPQUFPLEtBQUssQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO0VBQ3JDLE9BQU8sS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUM7RUFDNUIsT0FBTyxJQUFJO0VBQ1gsUUFBUSxXQUFXO0VBQ25CLFFBQVEsWUFBWTtFQUNwQixVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztFQUNuQyxVQUFVLEdBQUc7RUFDYixVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztFQUNuQyxVQUFVLEdBQUc7RUFDYixPQUFPO0VBQ1AsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDO0VBQ3RCLE9BQU8sSUFBSTtFQUNYLFFBQVEsQ0FBQyxHQUFHO0VBQ1osVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztFQUM1RSxPQUFPLENBQUM7RUFDUixHQUFHLENBQUMsQ0FBQztBQUNMO0VBQ0EsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztFQUNmLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUM7RUFDM0MsS0FBSyxJQUFJLENBQUMsVUFBVSxFQUFFO0VBQ3RCLE1BQU0sU0FBUztFQUNmLE1BQU0sT0FBTyxFQUFFLEVBQUU7RUFDakIsTUFBTSxVQUFVLEVBQUUsRUFBRTtFQUNwQixNQUFNLFFBQVEsRUFBRSxDQUFDO0VBQ2pCLE1BQU0sVUFBVSxFQUFFLFVBQVU7RUFDNUIsS0FBSyxDQUFDO0VBQ04sS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ25CLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUM7RUFDbEMsS0FBSyxJQUFJLENBQUMsb0JBQW9CLENBQUM7RUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO0VBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBQ3BCLENBQUMsQ0FBQzs7OzsifQ==