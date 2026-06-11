import ZAI from 'z-ai-web-dev-sdk';

// Final verification - try to find specific URLs and check findhotelswebsite.com
const finalSearches = [
  { name: "Mariador - check hotelsmariador.com", query: "hotelsmariador.com Conakry Guinea" },
  { name: "Grand HotelIndependance - check hotelghi.com", query: "hotelghi.com Conakry Guinea" },
  { name: "Hotel Azur - check hotelazur.com Conakry", query: "hotelazur.com Conakry Guinea" },
  { name: "findhotelswebsite.com Guinea full list", query: "findhotelswebsite.com guinea hotel websites list" },
  { name: "Hakaba Conakry - deeper website search", query: "\"Hakaba\" Conakry Guinea hotel website OR site web" },
  { name: "Setifana Sea View - check if setifana.com exists", query: "setifana.com Conakry OR Guinea" },
  { name: "Sacha Hotel Conakry - official site check", query: "\"Sacha Hotel\" Conakry hotelsacha.com OR sacha-hotel.com" },
  { name: "Kindia Palace - deeper search", query: "\"Kindia Palace\" hotel Guinea contact" },
  { name: "Kankan Prestige - deeper search", query: "\"Kankan Prestige\" hotel Guinea contact" },
  { name: "Residence Miniere Kamsar - deeper search", query: "\"Residence Miniere\" OR \"Residence Hoteliere Miniere\" Kamsar Guinea" }
];

async function main() {
  const zai = await ZAI.create();
  
  for (const search of finalSearches) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`FINAL CHECK: ${search.name}`);
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
