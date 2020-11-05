import { csv } from 'd3';

const csvUrl = 'https://gist.githubusercontent.com/lintonylin/4f9ba13dc37b7510ea392d95c494f891/raw/fde045654ba7b84c7e96411061a8919ebbdf4dc3/Space_Corrected.csv';
export const getData = async () => {
  const data = await csv(csvUrl);
  
  // Have a look at the attributes available in the console!
  console.log(data[0]);

  return data;
};