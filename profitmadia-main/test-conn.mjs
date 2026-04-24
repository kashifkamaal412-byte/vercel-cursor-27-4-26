import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ognlzlciuhzeemifvrts.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwMTMzMywiZXhwIjoyMDg4Mzc3MzMzfQ.NWLvkRNtvxcJMEZNbHEBKHyWlXb8vb-cJiv2xzfbwbw";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDEzMzMsImV4cCI6MjA4ODM3NzMzM30._t0gVF5AyClnLkTNZ8XF_mIUUGxFXTdAhW7OxYm89js";

async function testSupabase() {
  console.log("=== Testing Supabase Connection ===");
  
  // 1. Test Anon Key
  console.log("\n[1] Testing Anon Key (Client-side simulation)...");
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Try to sign up a dummy user to see the exact error
  const testEmail = `test_${Date.now()}@example.com`;
  console.log(`Attempting to sign up: ${testEmail}`);
  
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: testEmail,
    password: "Password123!",
  });
  
  if (signUpError) {
    console.error("❌ Sign up error:", signUpError.message);
  } else {
    console.log("✅ Sign up successful via Anon Key!");
    console.log("  Session created?:", !!signUpData.session);
    console.log("  User ID:", signUpData.user?.id);
  }

  // 2. Test DB access with Service Key 
  console.log("\n[2] Testing Database Tables with Service Role Key...");
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Look for profiles table
  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (profilesError) {
    console.error("❌ Profiles table error:", profilesError.message);
    if (profilesError.code === '42P01') {
       console.error("   (This means the SQL script did NOT actually run successfully and tables are missing!)");
    }
  } else {
    console.log("✅ Profiles table exists and is accessible!");
  }
}

testSupabase().catch(console.error);
