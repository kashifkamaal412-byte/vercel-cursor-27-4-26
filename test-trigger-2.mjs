import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ognlzlciuhzeemifvrts.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwMTMzMywiZXhwIjoyMDg4Mzc3MzMzfQ.NWLvkRNtvxcJMEZNbHEBKHyWlXb8vb-cJiv2xzfbwbw";

async function queryDB() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  console.log("Checking the handle_new_user trigger via rpc...");
  
  // The error "Database error saving new user" usually means the `handle_new_user` 
  // trigger on auth.users is throwing an error.
  
  // Let's create a dummy user directly using admin.auth
  const email = `test_${Date.now()}@example.com`;
  console.log(`Creating user with admin API: ${email}`);
  
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'password123',
    user_metadata: { name: 'Test User' }
  });
  
  if (error) {
    console.error("❌ Admin create user error:", error);
  } else {
    console.log("✅ Admin create user successful!", data.user.id);
    
    // Check if profile was created
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
      
    if (profileErr) {
      console.error("❌ Profile check error:", profileErr);
    } else {
      console.log("✅ Profile automatically created!", profile);
    }
    
    // Cleanup
    await adminClient.auth.admin.deleteUser(data.user.id);
  }
}

queryDB().catch(console.error);
