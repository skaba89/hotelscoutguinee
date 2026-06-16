// Quick test: can ZAI SDK initialize and search?
import ZAI from 'z-ai-web-dev-sdk'

async function main() {
  console.log('Testing ZAI.create()...')
  try {
    const zai = await ZAI.create()
    console.log('ZAI initialized successfully!')

    console.log('Testing web_search...')
    const results = await zai.functions.invoke('web_search', {
      query: 'hotels Conakry Guinea',
      num: 3,
    })
    console.log('Search results:', JSON.stringify(results, null, 2).substring(0, 500))
  } catch (err) {
    console.error('Error:', err.message)
  }
  process.exit(0)
}

main()
