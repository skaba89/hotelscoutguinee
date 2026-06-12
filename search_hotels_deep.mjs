import ZAI from 'z-ai-web-dev-sdk';

// Deep search for hotels that showed potential
const deepSearches = [
  { name: "Hotel Mariador Palace", location: "Conakry", query: "mariador palace hotel conakry site:mariador.com OR mariadorpalace.com OR hotelmariador.com" },
  { name: "Hotel Mariador Palace", location: "Conakry", query: "\"Hotel Mariador Palace\" Conakry website" },
  { name: "Grand Hôtel de l'Indépendance", location: "Conakry", query: "\"Grand Hotel de l'Independance\" Conakry official website OR site web" },
  { name: "Hôtel M'Lys", location: "Conakry", query: "\"Hotel M'Lys\" Conakry site web OR hotelmlys.com OR mlyshotel.com" },
  { name: "Oceano Hotel Conakry", location: "Conakry", query: "\"Oceano Hotel\" Conakry site web officiel OR hoteloceano.com" },
  { name: "Hôtel Azur Conakry", location: "Conakry", query: "\"Hotel Azur\" Conakry site web officiel OR hotelazur.com" },
  { name: "Setifana Sea View", location: "Conakry", query: "\"Setifana\" Conakry site web officiel OR setifana.com" },
  { name: "Kindia Palace Hotel", location: "Kindia", query: "\"Kindia Palace Hotel\" Guinea site web OR kindiapalace.com" },
  { name: "Kankan Prestige Hotel", location: "Kankan", query: "\"Kankan Prestige Hotel\" Guinea site web OR kankanprestige.com" },
  { name: "Résidence Hôtelière Minière", location: "Kamsar", query: "\"Residence Hoteliere Miniere\" Kamsar Guinea site web" },
  { name: "Zambezi Inn Hotel", location: "Conakry", query: "\"Zambezi Inn Hotel\" Conakry official website OR zambeziinn.com" },
  { name: "Sacha Hotel Conakry", location: "Conakry", query: "\"Sacha Hotel\" Conakry Guinea official website" }
];

async function main() {
  const zai = await ZAI.create();
  
  for (const search of deepSearches) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DEEP SEARCH: ${search.name} - ${search.location}`);
    console.log(`QUERY: ${search.query}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const results = await zai.functions.invoke("web_search", {
        query: search.query,
        num: 8
      });
      
      const bookingSites = ['booking.com', 'tripadvisor', 'expedia', 'hotels.com', 'agoda', 'priceline', 'traveloka', 'kayak', 'trivago', 'airbnb', 'makemytrip', 'goto.fr', 'guestreservations', 'hotelplanner', 'weekend', 'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'twitter.com', 'flickr', 'wikipedia.org', 'planetofhotels', 'hotelsone', 'skyscanner', 'zenhotels', 'destinia', 'travelocity', 'orbitz', 'wego.com'];
      
      const officialResults = results.filter(r => {
        const hostLower = r.host_name.toLowerCase();
        return !bookingSites.some(site => hostLower.includes(site));
      });
      
      console.log(`\nAll results (${results.length}):`);
      results.forEach((r, i) => {
        console.log(`  ${i+1}. [${r.host_name}] ${r.name}`);
        console.log(`     ${r.url}`);
        console.log(`     ${r.snippet?.substring(0, 150) || 'No snippet'}`);
      });
      
      console.log(`\nFiltered official (${officialResults.length}):`);
      officialResults.forEach((r, i) => {
        console.log(`  ${i+1}. [${r.host_name}] ${r.name}`);
        console.log(`     ${r.url}`);
        console.log(`     ${r.snippet?.substring(0, 150) || 'No snippet'}`);
      });
      
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
