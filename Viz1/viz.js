import vl from 'vega-lite-api';
export const viz = vl
  .markBar()
	.transform(
	vl.groupby('Company Name', 'Status Mission').aggregate(vl.count().as('Count')),
	)
  .encode(
    vl.x().fieldQ('Count'),
    vl.y().fieldN('Company Name').sort('Count'),
    vl.color().fieldN('Status Mission'),
    vl.tooltip([vl.fieldN('Company Name'), vl.fieldN('Count')])
  );