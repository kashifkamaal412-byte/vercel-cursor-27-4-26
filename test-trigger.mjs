import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ognlzlciuhzeemifvrts.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwMTMzMywiZXhwIjoyMDg4Mzc3MzMzfQ.NWLvkRNtvxcJMEZNbHEBKHyWlXb8vb-cJiv2xzfbwbw";

async function testTrigger() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  console.log("Testing insert into profiles to check if triggers fail...");
  // Use a dummy UUID for the user_id since it's a UUID field
  const dummyUserid = '00000000-0000-0000-0000-000000000001';
  
  // Clean up first in case it somehow exists
  await adminClient.from('profiles').delete().eq('user_id', dummyUserid);
  
  const { data, error } = await adminClient
    .from('profiles')
    .insert([
      { 
        user_id: dummyUserid,
        display_name: 'Test Setup User'
      }
    ]);
    
  if (error) {
    console.error("❌ profiles insert error:", error);
    process.exit(1);
  } else {
    console.log("✅ profiles insert successful!");
    // delete it
    await adminClient.from('profiles').delete().eq('user_id', dummyUserid);
  }
}

testTrigger().catch(console.error);
