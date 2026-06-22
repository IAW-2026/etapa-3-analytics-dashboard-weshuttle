async function test() {
  const url = 'https://proyecto-a-feedback-weshuttle.vercel.app/api/ratings/analytics/metrics?start_date=2026-06-01&end_date=2026-06-21';
  console.log(`Fetching from ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

test();
