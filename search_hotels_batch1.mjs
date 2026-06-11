import ZAI from 'z-ai-web-dev-sdk';

const hotels = [
  { name: "Hotel Mariador Palace", location: "Conakry" },
  { name: "Zambezi Inn Hotel", location: "Conakry" },
  { name: "Sacha Hotel", location: "Conakry" },
  { name: "Hotel du Golfe de Guinée", location: "Conakry" },
  { name: "Oceano Hotel Conakry", location: "Conakry" },
  { name: "Hotel Golden Plazza Conakry", location: "Conakry" }
];

async function searchHotel(zai, hotel) {
  try {
    const query1 = `${hotel.name} ${hotel.location} Guinea official website`;
    const results1 = await zai.functions.invoke("web_search", {
      query: query1,
      num: 5
    });

    // Also try French search
    const query2 = `${hotel.name} ${hotel.location} site web officiel`;
    const results2 = await zai.functions.invoke("web_search", {
      query: query2,
      num: 5
    });

    const allResults = [...results1, ...results2];

    // Filter out booking sites, tripadvisor, etc.
    const bookingSites = ['booking.com', 'tripadvisor', 'expedia', 'hotels.com', 'agoda', 'priceline', 'traveloka', 'kayak', 'trivago', 'airbnb', 'makemytrip', 'goto.fr', 'guestreservations', 'hotelplanner', 'weekend', 'wikipedia', 'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'twitter.com', 'flickr'];
    
    const officialResults = allResults.filter(r => {
      const hostLower = r.host_name.toLowerCase();
      return !bookingSites.some(site => hostLower.includes(site));
    });

    return {
      name: hotel.name,
      location: hotel.location,
      allResults: allResults.map(r => ({ name: r.name, url: r.url, host: r.host_name, snippet: r.snippet })),
      officialResults: officialResults.map(r => ({ name: r.name, url: r.url, host: r.host_name, snippet: r.snippet }))
    };
  } catch (error) {
    return { name: hotel.name, location: hotel.location, error: error.message };
  }
}

async function main() {
  const zai = await ZAI.create();
  
  for (const hotel of hotels) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`SEARCHING: ${hotel.name} - ${hotel.location}`);
    console.log(`${'='.repeat(80)}`);
    
    const result = await searchHotel(zai, hotel);
    
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
      continue;
    }
    
    console.log(`\nAll results (${result.allResults.length}):`);
    result.allResults.forEach((r, i) => {
      console.log(`  ${i+1}. [${r.host}] ${r.name}`);
      console.log(`     ${r.url}`);
      console.log(`     ${r.snippet?.substring(0, 120) || 'No snippet'}`);
    });
    
    console.log(`\nFiltered official results (${result.officialResults.length}):`);
    result.officialResults.forEach((r, i) => {
      console.log(`  ${i+1}. [${r.host}] ${r.name}`);
      console.log(`     ${r.url}`);
      console.log(`     ${r.snippet?.substring(0, 120) || 'No snippet'}`);
    });
    
    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
