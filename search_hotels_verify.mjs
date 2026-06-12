import ZAI from 'z-ai-web-dev-sdk';

// Verify specific URLs found in deep search
const verifySearches = [
  { name: "Hotel Mariador Palace - verify hotelsmariador.com", query: "site:hotelsmariador.com OR site:mariadorpalace.com" },
  { name: "Grand HotelIndependance - verify hotelghi.com", query: "site:hotelghi.com" },
  { name: "Hotel M'Lys - verify hotelmlys.com", query: "site:hotelmlys.com" },
  { name: "Hotel Azur Conakry - verify hotelazur.com", query: "site:hotelazur.com Conakry OR Guinea" },
  { name: "Zambezi Inn - findhotelswebsite.com", query: "site:findhotelswebsite.com zambezi inn guinea" },
  { name: "Woro Ladia - search for website", query: "\"Woro Ladia\" Conakry website OR site web" },
  { name: "Hotel Particulier HP - search for website", query: "\"Hotel Particulier HP\" Conakry website OR site web" },
  { name: "Chez Sophie Conakry - deeper search", query: "\"Chez Sophie\" hotel Conakry Guinea site web officiel" }
];

async function main() {
  const zai = await ZAI.create();
  
  for (const search of verifySearches) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`VERIFY: ${search.name}`);
    console.log(`QUERY: ${search.query}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const results = await zai.functions.invoke("web_search", {
        query: search.query,
        num: 5
      });
      
      if (results.length === 0) {
        console.log("No results found");
      } else {
        results.forEach((r, i) => {
          console.log(`  ${i+1}. [${r.host_name}] ${r.name}`);
          console.log(`     ${r.url}`);
          console.log(`     ${r.snippet?.substring(0, 200) || 'No snippet'}`);
        });
      }
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

main().catch(console.error);
