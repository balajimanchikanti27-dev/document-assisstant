async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/health');
    console.log('Health status:', res.status, await res.json());
  } catch (err: any) {
    console.error('Fetch health failed:', err.message);
  }
}
test();
